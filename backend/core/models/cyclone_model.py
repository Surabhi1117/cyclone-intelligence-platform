"""
Tropical Cyclone AI Multi-Task Architecture.
Unifies Multi-Spectral Spatial Encoder + Temporal Environmental Transformer
with 5 multi-task prediction heads:
1. Genesis / Disturbance Score (0.0 - 1.0)
2. Pattern Classification (Curved Band, Shear, CDO, Eye)
3. Intensity Category (Depression to Super Cyclone)
4. Multi-Horizon Track Forecasting (+6h, +12h, +24h, +48h, +72h with uncertainty ellipses)
5. Multi-Horizon Intensity Forecasting (+6h..+72h Vmax & Pmin with variance)
"""

from typing import Dict, Any, Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F

from .spatial_encoder import MultiSpectralSpatialEncoder
from .temporal_transformer import TemporalEnvironmentalTransformer


PATTERN_CLASSES = [
    "Curved Band",
    "Shear Pattern",
    "Central Dense Overcast",
    "Eye Pattern"
]

CATEGORY_CLASSES = [
    "Depression",
    "Deep Depression",
    "Cyclonic Storm",
    "Very Severe Cyclonic Storm",
    "Extremely Severe Cyclonic Storm",
    "Super Cyclonic Storm"
]

FORECAST_HORIZONS_HOURS = [6, 12, 24, 48, 72]


class TropicalCycloneAIModel(nn.Module):
    """
    End-to-End Multi-Spectral Multi-Task Tropical Cyclone AI Model.
    """
    def __init__(
        self,
        in_channels: int = 3,
        env_dim: int = 6,
        feature_dim: int = 256,
        num_patterns: int = 4,
        num_categories: int = 6,
        num_horizons: int = 5
    ):
        super().__init__()
        self.num_horizons = num_horizons
        
        # 1. Spatial Encoder (CNN + Spatial Attention)
        self.spatial_encoder = MultiSpectralSpatialEncoder(
            in_channels=in_channels,
            feature_dim=feature_dim
        )

        # 2. Temporal Environmental Transformer
        self.temporal_transformer = TemporalEnvironmentalTransformer(
            spatial_dim=feature_dim,
            env_dim=env_dim,
            d_model=feature_dim,
            nhead=8,
            num_layers=3
        )

        # 3. Head: Genesis Presence Score (0.0 to 1.0)
        self.genesis_head = nn.Sequential(
            nn.Linear(feature_dim, 64),
            nn.SiLU(),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )

        # 4. Head: Dvorak / AI Pattern Classification
        self.pattern_head = nn.Sequential(
            nn.Linear(feature_dim, 128),
            nn.SiLU(),
            nn.Dropout(0.15),
            nn.Linear(128, num_patterns)
        )

        # 5. Head: IMD/WMO Intensity Category
        self.category_head = nn.Sequential(
            nn.Linear(feature_dim, 128),
            nn.SiLU(),
            nn.Dropout(0.15),
            nn.Linear(128, num_categories)
        )

        # 6. Head: Multi-Horizon Track Forecasting Head
        # Outputs (dLat, dLon, log_sigma_lat, log_sigma_lon, tanh_rho) per horizon
        self.track_head = nn.Sequential(
            nn.Linear(feature_dim, 256),
            nn.SiLU(),
            nn.Linear(256, num_horizons * 5)
        )

        # 7. Head: Multi-Horizon Intensity Forecasting Head
        # Outputs (Vmax_mean, Vmax_std, Pmin_mean, Pmin_std) per horizon
        self.intensity_head = nn.Sequential(
            nn.Linear(feature_dim, 256),
            nn.SiLU(),
            nn.Linear(256, num_horizons * 4)
        )

    def forward(
        self,
        satellite_tensor: torch.Tensor,
        env_vector: torch.Tensor
    ) -> Dict[str, torch.Tensor]:
        """
        Args:
            satellite_tensor: (B, T, C, H, W)
            env_vector: (B, T, 6)
        Returns:
            Dictionary of tensor predictions for all multi-task heads
        """
        B, T, C, H, W = satellite_tensor.shape

        # Step 1: Spatial Feature Extraction
        spatial_features, _ = self.spatial_encoder(satellite_tensor)  # (B, T, feature_dim)

        # Step 2: Temporal Sequence Transformer Fusion
        _, context_summary = self.temporal_transformer(spatial_features, env_vector)  # (B, feature_dim)

        # Step 3: Multi-Task Predictions
        # A. Genesis Score
        genesis_score = self.genesis_head(context_summary).squeeze(-1)  # (B,)

        # B. Pattern Classification Logits & Probs
        pattern_logits = self.pattern_head(context_summary)  # (B, 4)
        pattern_probs = F.softmax(pattern_logits, dim=-1)

        # C. Intensity Category Logits & Probs
        category_logits = self.category_head(context_summary)  # (B, 6)
        category_probs = F.softmax(category_logits, dim=-1)

        # D. Track Forecasting Multi-Horizon
        track_raw = self.track_head(context_summary).view(B, self.num_horizons, 5)
        d_lat = track_raw[..., 0]
        d_lon = track_raw[..., 1]
        sigma_lat = F.softplus(track_raw[..., 2]) + 0.1  # Degree std
        sigma_lon = F.softplus(track_raw[..., 3]) + 0.1
        rho = torch.tanh(track_raw[..., 4])  # Correlation parameter in [-1, 1]

        # E. Intensity Forecasting Multi-Horizon
        intensity_raw = self.intensity_head(context_summary).view(B, self.num_horizons, 4)
        # Scaled realistic bounds: Vmax ~ 20 - 180 kts, Pmin ~ 880 - 1012 hPa
        vmax_pred = F.relu(intensity_raw[..., 0] * 30.0 + 65.0)  # Center around ~65 kts
        vmax_std = F.softplus(intensity_raw[..., 1] * 5.0 + 2.0) + 1.0
        
        pmin_pred = 1010.0 - F.relu(intensity_raw[..., 2] * 20.0 + 35.0)  # Center around ~975 hPa
        pmin_std = F.softplus(intensity_raw[..., 3] * 3.0 + 1.5) + 0.5

        return {
            "genesis_score": genesis_score,
            "pattern_logits": pattern_logits,
            "pattern_probs": pattern_probs,
            "category_logits": category_logits,
            "category_probs": category_probs,
            "track": {
                "d_lat": d_lat,
                "d_lon": d_lon,
                "sigma_lat": sigma_lat,
                "sigma_lon": sigma_lon,
                "rho": rho
            },
            "intensity": {
                "vmax_pred": vmax_pred,
                "vmax_std": vmax_std,
                "pmin_pred": pmin_pred,
                "pmin_std": pmin_std
            }
        }

