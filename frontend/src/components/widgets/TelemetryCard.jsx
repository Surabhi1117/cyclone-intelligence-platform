import React from 'react';
import { 
  Gauge, 
  Wind, 
  Compass, 
  Thermometer, 
  Activity, 
  ShieldCheck, 
  AlertCircle,
  TrendingUp,
  Percent
} from 'lucide-react';
import { Card } from '../ui/Card';
import { CategoryBadge, PatternBadge } from '../ui/Badge';

export const TelemetryCard = ({ stormData, isLoading }) => {
  const currentIntensity = stormData?.current_intensity || {
    vmax_kts: 65,
    vmax_kmh: 120,
    pmin_hpa: 975,
    category: 'Cyclonic Storm',
    category_confidence: 0.85,
    genesis_score: 0.94
  };

  const patternData = stormData?.pattern_classification || {
    predicted_pattern: 'Eye Pattern',
    confidence: 0.88,
    probabilities: {
      'Eye Pattern': 0.88,
      'Central Dense Overcast': 0.08,
      'Curved Band': 0.03,
      'Shear Pattern': 0.01
    }
  };

  const env = stormData?.environmental_telemetry || {
    sea_surface_temp_c: 29.5,
    vertical_wind_shear_kts: 12.0,
    vorticity_850hpa: 45.0,
    divergence_200hpa: 20.0,
    relative_humidity_700hpa: 78.0,
    ocean_heat_content_kj_cm2: 85.0
  };

  const physics = stormData?.physics_guardrail || {
    is_physically_consistent: true,
    physical_confidence_score: 0.92,
    guardrail_flags: [],
    atkinson_holliday_fit: { current_delta_hpa: 1.2 }
  };

  // Radial needle rotation calculations
  // Vmax 20 to 180 kts -> 0 to 180 degrees
  const vmaxAngle = Math.min(180, Math.max(0, ((currentIntensity.vmax_kts - 20) / (160)) * 180));
  // Pmin 1010 to 880 hPa -> 0 to 180 degrees
  const pminAngle = Math.min(180, Math.max(0, ((1010 - currentIntensity.pmin_hpa) / (130)) * 180));

  return (
    <Card title="Telemetry & AI Classification" icon={Gauge} className="h-full">
      <div className="space-y-4 flex-1 flex flex-col justify-between">
        {/* Category & Pattern Header Banner */}
        <div className="bg-[#121d33] border border-[#1e2f52] p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-slate-400 block mb-0.5">CURRENT CLASSIFICATION</span>
            <CategoryBadge category={currentIntensity.category} className="text-xs py-1 px-3 font-bold" />
          </div>
          <div className="text-right">
            <span className="text-[11px] font-mono text-slate-400 block mb-0.5">AI CONFIDENCE</span>
            <div className="text-sm font-mono font-extrabold text-cyan-300">
              {Math.round((currentIntensity.category_confidence || 0.85) * 100)}%
            </div>
          </div>
        </div>

        {/* Dual Live Gauges: Vmax & Pmin */}
        <div className="grid grid-cols-2 gap-3">
          {/* Vmax Gauge */}
          <div className="bg-[#070b14] border border-[#1e2f52] p-3 rounded-xl flex flex-col items-center justify-between relative overflow-hidden">
            <div className="w-full flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1"><Wind className="w-3.5 h-3.5 text-cyan-400" /> V_MAX</span>
              <span className="text-[10px] text-slate-500">KNOTS</span>
            </div>

            {/* Circular Gauge Arc */}
            <div className="relative w-32 h-16 my-2 overflow-hidden flex items-end justify-center">
              <div className="w-32 h-32 rounded-full border-[10px] border-slate-800 border-b-0 border-r-0 transform rotate-45"></div>
              {/* Active colored arc overlay */}
              <div className="absolute inset-0 flex items-center justify-center pt-6">
                <div className="text-2xl font-black font-mono text-white tracking-tight">
                  {currentIntensity.vmax_kts}
                </div>
              </div>
            </div>

            <div className="w-full flex items-center justify-between text-[11px] font-mono pt-1 border-t border-slate-800 text-slate-400">
              <span>{Math.round(currentIntensity.vmax_kts * 1.852)} km/h</span>
              <span className="text-cyan-400 font-bold">1-Min Sustained</span>
            </div>
          </div>

          {/* Pmin Gauge */}
          <div className="bg-[#070b14] border border-[#1e2f52] p-3 rounded-xl flex flex-col items-center justify-between relative overflow-hidden">
            <div className="w-full flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5 text-purple-400" /> P_MIN</span>
              <span className="text-[10px] text-slate-500">HPA</span>
            </div>

            {/* Circular Gauge Arc */}
            <div className="relative w-32 h-16 my-2 overflow-hidden flex items-end justify-center">
              <div className="w-32 h-32 rounded-full border-[10px] border-slate-800 border-b-0 border-r-0 transform rotate-45"></div>
              <div className="absolute inset-0 flex items-center justify-center pt-6">
                <div className="text-2xl font-black font-mono text-purple-300 tracking-tight">
                  {currentIntensity.pmin_hpa}
                </div>
              </div>
            </div>

            <div className="w-full flex items-center justify-between text-[11px] font-mono pt-1 border-t border-slate-800 text-slate-400">
              <span>{(currentIntensity.pmin_hpa * 0.02953).toFixed(2)} inHg</span>
              <span className="text-purple-400 font-bold">Central Core</span>
            </div>
          </div>
        </div>

        {/* Pattern Classification Probability Distribution */}
        <div className="bg-[#070b14] border border-[#1e2f52] p-3 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">AI Dvorak Pattern Archetype</span>
            <PatternBadge pattern={patternData.predicted_pattern} />
          </div>

          <div className="space-y-1.5 pt-1">
            {Object.entries(patternData.probabilities || {}).map(([pat, prob]) => (
              <div key={pat} className="space-y-0.5">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>{pat}</span>
                  <span className="text-cyan-300 font-bold">{Math.round(prob * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      pat === patternData.predicted_pattern 
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500' 
                        : 'bg-slate-700'
                    }`}
                    style={{ width: `${Math.max(2, prob * 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Environmental Diagnostics & Physics Guardrail Summary */}
        <div className="grid grid-cols-3 gap-2 text-center font-mono">
          <div className="bg-[#121d33] border border-[#1e2f52] p-2 rounded-lg">
            <span className="text-[10px] text-slate-400 block">SST (ERA5)</span>
            <strong className="text-xs text-amber-300">{env.sea_surface_temp_c}°C</strong>
          </div>
          <div className="bg-[#121d33] border border-[#1e2f52] p-2 rounded-lg">
            <span className="text-[10px] text-slate-400 block">VWS Shear</span>
            <strong className="text-xs text-cyan-300">{env.vertical_wind_shear_kts} kts</strong>
          </div>
          <div className="bg-[#121d33] border border-[#1e2f52] p-2 rounded-lg">
            <span className="text-[10px] text-slate-400 block">850 Vorticity</span>
            <strong className="text-xs text-purple-300">{env.vorticity_850hpa}</strong>
          </div>
        </div>

        {/* Physics Atkinson-Holliday Guardrail Pill */}
        <div className="bg-[#070b14] border border-emerald-900/50 p-2 rounded-lg flex items-center justify-between text-[11px] font-mono text-emerald-400">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Atkinson-Holliday WPR Verification</span>
          </div>
          <span className="font-bold text-emerald-300">
            {Math.round(physics.physical_confidence_score * 100)}% Confidence
          </span>
        </div>
      </div>
    </Card>
  );
};

