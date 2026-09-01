import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Area, 
  ComposedChart,
  ReferenceLine,
  Legend
} from 'recharts';
import { TrendingUp, Activity, AlertTriangle, Wind } from 'lucide-react';
import { Card } from '../ui/Card';

const CustomForecastTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#070b14]/95 border border-[#1e2f52] p-3 rounded-xl shadow-2xl font-mono text-xs space-y-1.5 backdrop-blur-md">
        <div className="font-bold text-cyan-300 border-b border-slate-800 pb-1 flex justify-between">
          <span>{label} Horizon</span>
          {data.is_rapid_intensification && (
            <span className="text-amber-400 font-extrabold animate-pulse">RI ALERT</span>
          )}
        </div>
        <div className="flex justify-between space-x-4">
          <span className="text-cyan-400">Vmax (Wind):</span>
          <strong className="text-white">{data.vmax_kts} kts (±{data.vmax_std})</strong>
        </div>
        <div className="flex justify-between space-x-4">
          <span className="text-purple-400">Pmin (Pressure):</span>
          <strong className="text-white">{data.pmin_hpa} hPa (±{data.pmin_std})</strong>
        </div>
        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
          90% Confidence Interval: [{data.vmax_lower} - {data.vmax_upper}] kts
        </div>
      </div>
    );
  }
  return null;
};

export const ForecastCharts = ({ stormData, isLoading }) => {
  const currentIntensity = stormData?.current_intensity || { vmax_kts: 65, pmin_hpa: 975 };
  const forecastIntensity = stormData?.forecast_intensity || [];

  // Build chart dataset including current t=0 and +6h, +12h, +24h, +48h, +72h
  const chartData = [
    {
      horizon: 'Now (t+0h)',
      horizon_h: 0,
      vmax_kts: currentIntensity.vmax_kts,
      vmax_lower: currentIntensity.vmax_kts,
      vmax_upper: currentIntensity.vmax_kts,
      vmax_range: [currentIntensity.vmax_kts, currentIntensity.vmax_kts],
      pmin_hpa: currentIntensity.pmin_hpa,
      pmin_lower: currentIntensity.pmin_hpa,
      pmin_upper: currentIntensity.pmin_hpa,
      vmax_std: 0,
      pmin_std: 0,
      is_rapid_intensification: false
    },
    ...forecastIntensity.map((pt) => {
      const vstd = pt.vmax_std || 5.0;
      const pstd = pt.pmin_std || 3.0;
      return {
        horizon: `+${pt.horizon_h}h`,
        horizon_h: pt.horizon_h,
        vmax_kts: pt.vmax_kts,
        vmax_lower: Math.round(pt.vmax_kts - vstd * 1.64),
        vmax_upper: Math.round(pt.vmax_kts + vstd * 1.64),
        vmax_range: [Math.round(pt.vmax_kts - vstd * 1.64), Math.round(pt.vmax_kts + vstd * 1.64)],
        pmin_hpa: pt.pmin_hpa,
        pmin_lower: Math.round(pt.pmin_hpa - pstd * 1.64),
        pmin_upper: Math.round(pt.pmin_hpa + pstd * 1.64),
        vmax_std: vstd,
        pmin_std: pstd,
        is_rapid_intensification: pt.is_rapid_intensification
      };
    })
  ];

  const hasRI = forecastIntensity.some((pt) => pt.is_rapid_intensification);

  return (
    <Card
      title="Multi-Horizon Intensity & Pressure Dynamics"
      icon={TrendingUp}
      className="h-full"
      headerAction={
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-1 text-cyan-400">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span>
            <span>Vmax (kts)</span>
          </div>
          <div className="flex items-center space-x-1 text-purple-400">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block"></span>
            <span>Pmin (hPa)</span>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-full justify-between space-y-2">
        {/* Quick KPI Bar */}
        <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-[#070b14] border border-[#1e2f52] p-2.5 rounded-lg">
          <div>
            <span className="text-slate-400 block text-[10px]">Peak 72h Vmax:</span>
            <strong className="text-cyan-300 font-bold">
              {Math.max(...chartData.map(d => d.vmax_kts))} kts
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Deepest 72h Pmin:</span>
            <strong className="text-purple-300 font-bold">
              {Math.min(...chartData.map(d => d.pmin_hpa))} hPa
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Rapid Intensification:</span>
            <strong className={hasRI ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
              {hasRI ? 'DETECTED (+30 kts/24h)' : 'Low Probability'}
            </strong>
          </div>
        </div>

        {/* Dual Axis Interactive Recharts Plot */}
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="vmaxGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="pminGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c084fc" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#c084fc" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e2f52" opacity={0.6} />
              
              <XAxis 
                dataKey="horizon" 
                stroke="#64748b" 
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono' }} 
              />
              
              {/* Left Y-Axis: Vmax (Wind speed in knots) */}
              <YAxis 
                yAxisId="left" 
                domain={[20, 180]} 
                stroke="#00f0ff"
                tick={{ fill: '#00f0ff', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                unit=" kts"
              />

              {/* Right Y-Axis: Pmin (Pressure in hPa, inverted order) */}
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                domain={[890, 1015]} 
                reversed={true}
                stroke="#c084fc"
                tick={{ fill: '#c084fc', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                unit=" hPa"
              />

              <Tooltip content={<CustomForecastTooltip />} />

              {/* Vmax Confidence Interval Area */}
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="vmax_upper"
                stroke="none"
                fill="url(#vmaxGrad)"
                name="Confidence Range"
              />

              {/* Vmax Line */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="vmax_kts"
                stroke="#00f0ff"
                strokeWidth={3}
                dot={{ r: 4, fill: '#00f0ff', strokeWidth: 1.5, stroke: '#ffffff' }}
                activeDot={{ r: 6, fill: '#ffffff', stroke: '#00f0ff' }}
                name="Vmax (kts)"
              />

              {/* Pmin Line */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="pmin_hpa"
                stroke="#c084fc"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                dot={{ r: 3.5, fill: '#c084fc' }}
                activeDot={{ r: 6, fill: '#ffffff', stroke: '#c084fc' }}
                name="Pmin (hPa)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
};

