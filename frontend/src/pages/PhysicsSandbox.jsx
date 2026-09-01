import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Sliders, 
  Wind, 
  Activity, 
  TrendingUp, 
  Layers, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  Info
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  ReferenceLine
} from 'recharts';
import { Card } from '../components/ui/Card';

export const PhysicsSandbox = () => {
  // Atkinson-Holliday state
  const [sliderPmin, setSliderPmin] = useState(950);
  
  // Holland Radial Wind Profile state
  const [hollandB, setHollandB] = useState(1.45);
  const [rmaxKm, setRmaxKm] = useState(35);
  const [deltaPhPa, setDeltaPhPa] = useState(60);

  // Theoretical Atkinson-Holliday calculations
  const theoreticalVmax = useMemo(() => {
    const deltaP = Math.max(0, 1010 - sliderPmin);
    return Math.round(6.7 * Math.pow(deltaP, 0.644) * 10) / 10;
  }, [sliderPmin]);

  // Generate Atkinson-Holliday Theoretical Curve dataset (Pmin 880 to 1005 hPa)
  const ahCurveData = useMemo(() => {
    const pts = [];
    for (let p = 880; p <= 1005; p += 5) {
      const dp = 1010 - p;
      const v = 6.7 * Math.pow(dp, 0.644);
      pts.push({
        pmin: p,
        theoretical_vmax: Math.round(v * 10) / 10,
        tolerance_upper: Math.round((v + 15) * 10) / 10,
        tolerance_lower: Math.round((Math.max(15, v - 15)) * 10) / 10,
      });
    }
    return pts;
  }, []);

  // Generate Holland Radial Wind Profile dataset V(r) for r = 5 to 250 km
  const hollandProfileData = useMemo(() => {
    const pts = [];
    const rho = 1.15; // Air density kg/m^3
    const f = 2 * 7.2921e-5 * Math.sin(15 * Math.PI / 180); // Coriolis parameter at 15 deg lat
    const deltaPPascals = deltaPhPa * 100.0;

    for (let r = 5; r <= 250; r += 5) {
      const rMeters = r * 1000.0;
      const rmaxMeters = rmaxKm * 1000.0;
      const ratio = rmaxMeters / rMeters;
      const expTerm = Math.exp(-Math.pow(ratio, hollandB));
      
      const term1 = (hollandB / rho) * Math.pow(ratio, hollandB) * deltaPPascals * expTerm;
      const coriolisTerm = Math.pow((rMeters * f) / 2.0, 2);
      
      const vMps = Math.sqrt(Math.max(0, term1 + coriolisTerm)) - (rMeters * f) / 2.0;
      const vKts = Math.round(vMps * 1.94384 * 10) / 10; // Convert m/s to knots

      pts.push({
        radius_km: r,
        wind_speed_kts: vKts,
        wind_speed_kmh: Math.round(vKts * 1.852)
      });
    }
    return pts;
  }, [hollandB, rmaxKm, deltaPhPa]);

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto animate-fade-in font-sans">
      {/* Page Header */}
      <div className="bg-[#0d1527] border border-[#1e2f52] p-4 rounded-xl flex items-center justify-between shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              PHYSICS & ATMOSPHERIC GUARDRAILS SANDBOX
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/50">
                PHYSICS-INFORMED ML
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Interactive atmospheric thermodynamic relationships, Holland radial vortex profiles, and kinematic validation filters.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: 2 Large Interactive Physics Engines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sandbox 1: Atkinson-Holliday Wind-Pressure Relation */}
        <Card title="Atkinson-Holliday Wind-Pressure Relation (WPR)" icon={Activity}>
          <div className="space-y-4 font-mono text-xs">
            <div className="bg-[#070b14] border border-[#1e2f52] p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">FORMULA:</span>
                <span className="text-xs text-cyan-300 font-bold">Vmax = 6.7 × (1010 - Pmin)^0.644</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block mb-0.5">THEORETICAL V_MAX</span>
                <strong className="text-emerald-300 text-sm">{theoreticalVmax} kts</strong>
              </div>
            </div>

            {/* Slider Control */}
            <div className="bg-[#121d33] border border-[#1e2f52] p-3 rounded-xl space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Test Central Pressure (Pmin):</span>
                <strong className="text-cyan-300">{sliderPmin} hPa</strong>
              </div>
              <input
                type="range"
                min="880"
                max="1005"
                step="1"
                value={sliderPmin}
                onChange={(e) => setSliderPmin(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            {/* Chart: WPR Curve */}
            <div className="w-full h-56 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ahCurveData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2f52" opacity={0.6} />
                  <XAxis 
                    dataKey="pmin" 
                    stroke="#64748b" 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }} 
                    unit=" hPa"
                    reversed={true}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }} 
                    unit=" kts" 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#070b14', borderColor: '#1e2f52', borderRadius: '8px', fontFamily: 'JetBrains Mono', fontSize: '11px' }}
                  />
                  <ReferenceLine x={sliderPmin} stroke="#00f0ff" strokeDasharray="3 3" label={{ value: `Selected: ${sliderPmin} hPa`, fill: '#00f0ff', fontSize: 10 }} />
                  <Line type="monotone" dataKey="theoretical_vmax" stroke="#10b981" strokeWidth={2.5} dot={false} name="Theoretical WPR Vmax (kts)" />
                  <Line type="monotone" dataKey="tolerance_upper" stroke="#64748b" strokeDasharray="2 2" dot={false} name="+15 kts Bound" />
                  <Line type="monotone" dataKey="tolerance_lower" stroke="#64748b" strokeDasharray="2 2" dot={false} name="-15 kts Bound" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Sandbox 2: Holland Radial Wind Profile V(r) */}
        <Card title="Holland Radial Wind Vortex Profile V(r)" icon={Wind}>
          <div className="space-y-4 font-mono text-xs">
            {/* Holland parameter sliders */}
            <div className="grid grid-cols-3 gap-2 bg-[#070b14] border border-[#1e2f52] p-2.5 rounded-xl">
              <div>
                <span className="text-[10px] text-slate-400 block">Holland B parameter:</span>
                <strong className="text-cyan-300">{hollandB}</strong>
                <input
                  type="range"
                  min="1.0"
                  max="2.2"
                  step="0.05"
                  value={hollandB}
                  onChange={(e) => setHollandB(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 mt-1"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block">R_max Radius:</span>
                <strong className="text-purple-300">{rmaxKm} km</strong>
                <input
                  type="range"
                  min="15"
                  max="70"
                  step="5"
                  value={rmaxKm}
                  onChange={(e) => setRmaxKm(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400 mt-1"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block">Pressure Deficit ΔP:</span>
                <strong className="text-amber-300">{deltaPhPa} hPa</strong>
                <input
                  type="range"
                  min="20"
                  max="110"
                  step="5"
                  value={deltaPhPa}
                  onChange={(e) => setDeltaPhPa(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 mt-1"
                />
              </div>
            </div>

            {/* Chart: Radial velocity curve V(r) */}
            <div className="w-full h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hollandProfileData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2f52" opacity={0.6} />
                  <XAxis 
                    dataKey="radius_km" 
                    stroke="#64748b" 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }} 
                    unit=" km"
                  />
                  <YAxis 
                    stroke="#64748b" 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }} 
                    unit=" kts" 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#070b14', borderColor: '#1e2f52', borderRadius: '8px', fontFamily: 'JetBrains Mono', fontSize: '11px' }}
                  />
                  <ReferenceLine x={rmaxKm} stroke="#ffaa00" strokeDasharray="3 3" label={{ value: `Rmax: ${rmaxKm}km`, fill: '#ffaa00', fontSize: 10 }} />
                  <Line type="monotone" dataKey="wind_speed_kts" stroke="#00f0ff" strokeWidth={2.5} dot={false} name="Tangential Wind V(r) in Knots" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* Kinematic & Physical Guardrail Threshold Matrix */}
      <Card title="Operational Guardrail Boundary Verification" icon={ShieldCheck}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
          <div className="bg-[#070b14] border border-emerald-900/40 p-3 rounded-xl space-y-1">
            <div className="text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Kinematic Speed Cap</span>
            </div>
            <p className="text-[11px] font-sans text-slate-300">
              Translation speed capped at ≤ 65 km/h. Prevents non-physical coordinate jumps over short forecast intervals.
            </p>
          </div>

          <div className="bg-[#070b14] border border-amber-900/40 p-3 rounded-xl space-y-1">
            <div className="text-amber-400 font-bold flex items-center gap-1.5">
              <Flame className="w-4 h-4" />
              <span>Rapid Intensification Bound</span>
            </div>
            <p className="text-[11px] font-sans text-slate-300">
              Maximum 24-hour intensification bounded by Maximum Potential Intensity (MPI ≤ 80 kts/24h).
            </p>
          </div>

          <div className="bg-[#070b14] border border-cyan-900/40 p-3 rounded-xl space-y-1">
            <div className="text-cyan-400 font-bold flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              <span>Holland Convergence Check</span>
            </div>
            <p className="text-[11px] font-sans text-slate-300">
              Harmonizes AI predicted Pmin with cyclostrophic balance within a ±22 hPa tolerance envelope.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

