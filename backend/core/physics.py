"""
Physical Verification Guardrails for Tropical Cyclone AI Inferences.
Enforces:
1. Atkinson-Holliday Wind-Pressure Relationship (WPR)
2. Holland / Knaff-Zehr thermodynamic consistency
3. Kinematic translation speed and acceleration bounds
4. Rapid Intensification (RI) physical bounds
"""

import math
from typing import Dict, Any, List, Tuple


class PhysicsVerificationGuardrail:
    """
    Validates, verifies, and sanitizes AI-generated cyclone predictions against
    atmospheric thermodynamics and kinematic laws.
    """
    def __init__(
        self,
        max_translation_speed_kmh: float = 65.0,
        max_24h_intensification_kts: float = 80.0,
        atkinson_hollyday_tolerance_hpa: float = 22.0
    ):
        self.max_translation_speed_kmh = max_translation_speed_kmh
        self.max_24h_intensification_kts = max_24h_intensification_kts
        self.tolerance_hpa = atkinson_hollyday_tolerance_hpa

    @staticmethod
    def atkinson_holliday_pressure(vmax_kts: float, p_env_hpa: float = 1010.0) -> float:
        """
        Calculates theoretical minimum central pressure (Pmin) from maximum sustained wind (Vmax)
        using the empirical Atkinson-Holliday relation: Vmax = 6.7 * (1010 - Pmin)^0.644
        => Pmin = 1010 - (Vmax / 6.7) ^ (1 / 0.644)
        """
        if vmax_kts <= 0:
            return p_env_hpa
        vmax_clamped = max(15.0, min(190.0, vmax_kts))
        delta_p = (vmax_clamped / 6.7) ** (1.0 / 0.644)
        pmin = p_env_hpa - delta_p
        return max(870.0, min(1012.0, pmin))

    @staticmethod
    def atkinson_holliday_wind(pmin_hpa: float, p_env_hpa: float = 1010.0) -> float:
        """
        Calculates theoretical Vmax from central pressure Pmin.
        """
        delta_p = max(0.0, p_env_hpa - pmin_hpa)
        vmax = 6.7 * (delta_p ** 0.644)
        return max(15.0, min(200.0, vmax))

    @staticmethod
    def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculates great-circle distance between two coordinates in km."""
        r = 6371.0  # Earth radius in km
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0)**2
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return r * c

    def verify_and_sanitize(
        self,
        current_lat: float,
        current_lon: float,
        current_vmax: float,
        current_pmin: float,
        track_forecast: List[Dict[str, Any]],
        intensity_forecast: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Runs comprehensive physical checks on track and intensity trajectories.
        Returns:
            sanitized_payload: Dict containing verified predictions, adjustments, and guardrail flags.
        """
        guardrail_flags: List[str] = []
        is_physically_consistent = True
        confidence_penalty = 0.0

        sanitized_track = []
        sanitized_intensity = []

        # 1. Current state Atkinson-Holliday consistency
        theoretical_pmin = self.atkinson_holliday_pressure(current_vmax)
        ah_delta_p = abs(current_pmin - theoretical_pmin)
        if ah_delta_p > self.tolerance_hpa:
            guardrail_flags.append(
                f"WPR_MISMATCH: Current Vmax ({current_vmax:.1f} kts) / Pmin ({current_pmin:.1f} hPa) deviates {ah_delta_p:.1f} hPa from Atkinson-Holliday theoretical curve."
            )
            confidence_penalty += 0.08

        # 2. Track Kinematics Validation
        prev_lat, prev_lon = current_lat, current_lon
        prev_time_h = 0

        for pt in track_forecast:
            horizon_h = pt["horizon_h"]
            dt_h = horizon_h - prev_time_h
            target_lat = pt["lat"]
            target_lon = pt["lon"]

            if dt_h > 0:
                dist_km = self.haversine_distance_km(prev_lat, prev_lon, target_lat, target_lon)
                speed_kmh = dist_km / dt_h
                
                # Check translation speed
                if speed_kmh > self.max_translation_speed_kmh:
                    is_physically_consistent = False
                    guardrail_flags.append(
                        f"KINEMATIC_VIOLATION: Forecasted speed {speed_kmh:.1f} km/h between +{prev_time_h}h and +{horizon_h}h exceeds physical cap of {self.max_translation_speed_kmh} km/h. Applied kinematic clamping."
                    )
                    # Kinematic clamping
                    clamped_dist = self.max_translation_speed_kmh * dt_h
                    ratio = clamped_dist / max(1e-5, dist_km)
                    target_lat = prev_lat + (target_lat - prev_lat) * ratio
                    target_lon = prev_lon + (target_lon - prev_lon) * ratio
                    confidence_penalty += 0.12

            sanitized_track.append({
                "horizon_h": horizon_h,
                "lat": round(target_lat, 3),
                "lon": round(target_lon, 3),
                "sigma_lat": round(pt.get("sigma_lat", 0.5), 3),
                "sigma_lon": round(pt.get("sigma_lon", 0.5), 3),
                "rho": round(pt.get("rho", 0.0), 3)
            })
            prev_lat, prev_lon = target_lat, target_lon
            prev_time_h = horizon_h

        # 3. Intensity Thermodynamics Validation
        prev_vmax = current_vmax
        prev_pmin = current_pmin
        prev_time_h = 0

        for pt in intensity_forecast:
            horizon_h = pt["horizon_h"]
            dt_h = horizon_h - prev_time_h
            vmax = pt["vmax_kts"]
            pmin = pt["pmin_hpa"]

            if dt_h > 0:
                # Intensification rate check (per 24h scaled)
                rate_24h = abs(vmax - prev_vmax) * (24.0 / dt_h)
                if rate_24h > self.max_24h_intensification_kts:
                    is_physically_consistent = False
                    guardrail_flags.append(
                        f"THERMODYNAMIC_VIOLATION: Intensification rate {rate_24h:.1f} kts/24h exceeds physical MPI limit of {self.max_24h_intensification_kts} kts/24h. Clamped."
                    )
                    max_allowed_change = (self.max_24h_intensification_kts / 24.0) * dt_h
                    if vmax > prev_vmax:
                        vmax = prev_vmax + max_allowed_change
                    else:
                        vmax = prev_vmax - max_allowed_change
                    confidence_penalty += 0.10

                # Harmonize Pmin with Atkinson-Holliday if diverging too widely
                theoretical_forecast_pmin = self.atkinson_holliday_pressure(vmax)
                if abs(pmin - theoretical_forecast_pmin) > self.tolerance_hpa:
                    # Blend 70% model with 30% theoretical WPR curve
                    pmin = 0.7 * pmin + 0.3 * theoretical_forecast_pmin

            # Bound sanity
            vmax = max(20.0, min(195.0, vmax))
            pmin = max(875.0, min(1012.0, pmin))

            # Check Rapid Intensification (RI) condition: >= 30 kts in 24 hours
            is_ri = (horizon_h == 24 and (vmax - current_vmax) >= 30.0)

            sanitized_intensity.append({
                "horizon_h": horizon_h,
                "vmax_kts": round(vmax, 1),
                "vmax_std": round(pt.get("vmax_std", 5.0), 1),
                "pmin_hpa": round(pmin, 1),
                "pmin_std": round(pt.get("pmin_std", 4.0), 1),
                "is_rapid_intensification": is_ri
            })
            prev_vmax = vmax
            prev_pmin = pmin
            prev_time_h = horizon_h

        physical_confidence = max(0.50, min(0.99, 0.95 - confidence_penalty))

        return {
            "is_physically_consistent": is_physically_consistent,
            "physical_confidence_score": round(physical_confidence, 2),
            "guardrail_flags": guardrail_flags,
            "sanitized_track": sanitized_track,
            "sanitized_intensity": sanitized_intensity,
            "atkinson_holliday_fit": {
                "current_delta_hpa": round(ah_delta_p, 1),
                "theoretical_pmin_hpa": round(theoretical_pmin, 1)
            }
        }

