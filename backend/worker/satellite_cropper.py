"""
Satellite Cropper and Multi-Spectral Normalization Worker.
Standardizes satellite granules to 1000 km x 1000 km (128x128 grid)
centered on (Lat, Lon). Stacks Thermal IR (10.8µm), Water Vapor (6.7µm),
and Microwave (89GHz) into unified tensors (T, C, H, W) and generates
palette-encoded image arrays for frontend visualization.
"""

import io
import base64
import numpy as np
from PIL import Image
from typing import Dict, Any, Tuple, Optional
import matplotlib.cm as cm


class SatelliteCropper:
    """
    Handles dynamic geospatial cropping, multi-spectral stacking, radiometric calibration,
    and visual colormap rendering for tropical cyclone granules.
    """
    def __init__(self, grid_size: int = 128, box_km: float = 1000.0):
        self.grid_size = grid_size
        self.box_km = box_km
        # Approximately 111 km per degree latitude
        self.deg_span = box_km / 111.0

    def compute_bounding_box(self, center_lat: float, center_lon: float) -> Tuple[float, float, float, float]:
        """Returns (min_lat, max_lat, min_lon, max_lon) in degrees."""
        half_deg = self.deg_span / 2.0
        return (
            center_lat - half_deg,
            center_lat + half_deg,
            center_lon - half_deg,
            center_lon + half_deg
        )

    def generate_synthetic_multispectral_granule(
        self,
        center_lat: float,
        center_lon: float,
        vmax_kts: float,
        pattern_type: str = "Eye Pattern",
        seed: Optional[int] = None
    ) -> Tuple[np.ndarray, Dict[str, str]]:
        """
        Generates realistic multi-spectral 3-channel matrix (3, 128, 128):
        - Channel 0: TIR 10.8µm (Kelvin: 180K cold cloud tops to 310K warm ocean)
        - Channel 1: Water Vapor 6.7µm (Kelvin: 200K upper tropospheric moisture to 260K dry air)
        - Channel 2: Microwave 89GHz (Kelvin: 160K deep convective hydrometeors to 290K ocean)

        Also generates base64-encoded PNG previews for web visualization.
        """
        if seed is not None:
            np.random.seed(seed)

        size = self.grid_size
        y, x = np.mgrid[-1:1:complex(0, size), -1:1:complex(0, size)]
        r = np.sqrt(x**2 + y**2)
        theta = np.arctan2(y, x)

        # Base atmospheric temperature background
        tir = np.full((size, size), 295.0, dtype=np.float32)  # Warm ocean surface
        wv = np.full((size, size), 245.0, dtype=np.float32)   # Moderate mid-level humidity
        mw = np.full((size, size), 280.0, dtype=np.float32)   # Ambient microwave emission

        # Spiral rainbands parameterization: r = a * exp(b * theta)
        spiral_angle = 3.5 * theta - 4.5 * np.log(np.clip(r, 0.05, 1.5))
        spiral_bands = np.sin(spiral_angle) * np.exp(-1.8 * r)

        # Eye and Eyewall structure based on intensity
        eye_radius = max(0.08, 0.25 - (vmax_kts / 300.0))
        eyewall_thickness = 0.09

        if pattern_type == "Eye Pattern" and vmax_kts >= 64:
            # Defined warm clear eye + intensely cold eyewall
            eyewall_mask = np.exp(-((r - eye_radius) ** 2) / (2 * eyewall_thickness ** 2))
            eye_mask = np.exp(-(r ** 2) / (2 * (eye_radius * 0.7) ** 2))

            # TIR: Cold eyewall (-75°C = 198K), warm eye (285K)
            tir -= eyewall_mask * 92.0
            tir -= np.clip(spiral_bands, 0, 1) * np.exp(-1.5 * r) * 55.0
            tir += eye_mask * 45.0

            # WV: High moisture surrounding core
            wv -= eyewall_mask * 40.0
            wv -= np.clip(spiral_bands, 0, 1) * 25.0

            # MW: Strong scattering in eyewall
            mw -= eyewall_mask * 110.0
            mw -= np.clip(spiral_bands, 0, 1) * 60.0

        elif pattern_type == "Central Dense Overcast":
            # Compact cold cloud shield centered over low-level circulation
            cdo_mask = np.exp(-(r ** 2) / 0.18)
            tir -= cdo_mask * 85.0 + np.clip(spiral_bands, 0, 1) * 35.0
            wv -= cdo_mask * 38.0
            mw -= cdo_mask * 80.0

        elif pattern_type == "Shear Pattern":
            # Asymmetric displaced convection (displaced towards NE quadrant)
            shear_offset_r = np.sqrt((x - 0.25)**2 + (y - 0.2)**2)
            shear_convection = np.exp(-(shear_offset_r ** 2) / 0.15)
            tir -= shear_convection * 78.0
            wv -= shear_convection * 32.0
            mw -= shear_convection * 70.0

        else:  # Curved Band
            band_mask = np.clip(spiral_bands, -0.2, 1.0) * np.exp(-1.2 * r)
            tir -= band_mask * 68.0
            wv -= band_mask * 30.0
            mw -= band_mask * 55.0

        # Add atmospheric turbulence & granulation noise
        noise = np.random.normal(0, 2.5, (size, size)).astype(np.float32)
        tir = np.clip(tir + noise, 180.0, 315.0)
        wv = np.clip(wv + noise * 0.7, 200.0, 270.0)
        mw = np.clip(mw + noise * 1.5, 150.0, 300.0)

        # 3-channel raw Kelvin array
        raw_channels = np.stack([tir, wv, mw], axis=0)  # Shape (3, 128, 128)

        # Generate base64 visual representations for frontend
        previews = {
            "tir_10_8": self.render_tir_colormap(tir),
            "wv_6_7": self.render_wv_colormap(wv),
            "mw_89": self.render_mw_colormap(mw)
        }

        return raw_channels, previews

    def normalize_for_ai(self, raw_channels: np.ndarray) -> np.ndarray:
        """
        Normalizes (3, 128, 128) raw Kelvin values to standardized [-1, 1] range:
        - TIR [180K, 320K]
        - WV  [200K, 270K]
        - MW  [150K, 300K]
        """
        normalized = np.zeros_like(raw_channels, dtype=np.float32)
        # Channel 0: TIR
        normalized[0] = (raw_channels[0] - 250.0) / 70.0
        # Channel 1: WV
        normalized[1] = (raw_channels[1] - 235.0) / 35.0
        # Channel 2: MW
        normalized[2] = (raw_channels[2] - 225.0) / 75.0
        return np.clip(normalized, -2.5, 2.5)

    def render_tir_colormap(self, tir_kelvin: np.ndarray) -> str:
        """Renders Thermal IR using enhanced meteorological BD-curve rainbow colormap."""
        # Convert Kelvin to Celsius: -90°C to +40°C
        celsius = tir_kelvin - 273.15
        norm_val = np.clip((celsius - (-80.0)) / (30.0 - (-80.0)), 0.0, 1.0)
        # Invert so cold cloud tops are bright vivid red/cyan/white
        inverted = 1.0 - norm_val
        cmap = cm.get_cmap("turbo")
        rgba = cmap(inverted)
        img = Image.fromarray((rgba * 255).astype(np.uint8))
        return self._image_to_base64(img)

    def render_wv_colormap(self, wv_kelvin: np.ndarray) -> str:
        """Renders Water Vapor 6.7µm using atmospheric moisture colormap."""
        norm_val = np.clip((wv_kelvin - 205.0) / (265.0 - 205.0), 0.0, 1.0)
        cmap = cm.get_cmap("Blues_r")
        rgba = cmap(norm_val)
        img = Image.fromarray((rgba * 255).astype(np.uint8))
        return self._image_to_base64(img)

    def render_mw_colormap(self, mw_kelvin: np.ndarray) -> str:
        """Renders Microwave 89GHz scattering colormap."""
        norm_val = np.clip((mw_kelvin - 160.0) / (295.0 - 160.0), 0.0, 1.0)
        cmap = cm.get_cmap("magma")
        rgba = cmap(norm_val)
        img = Image.fromarray((rgba * 255).astype(np.uint8))
        return self._image_to_base64(img)

    @staticmethod
    def _image_to_base64(img: Image.Image) -> str:
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        encoded = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{encoded}"


cropper = SatelliteCropper()

