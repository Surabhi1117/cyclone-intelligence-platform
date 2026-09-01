import React, { useState, useEffect } from 'react';
import { 
  History, 
  Play, 
  Pause, 
  RotateCcw, 
  TrendingUp, 
  CheckCircle2, 
  Award, 
  BarChart3,
  Calendar,
  Compass,
  MapPin
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  LineChart,
  Line
} from 'recharts';
import { Card } from '../components/ui/Card';
import { CategoryBadge } from '../components/ui/Badge';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const HistoricalReplay = () => {
  const [selectedStormId, setSelectedStormId] = useState('AMPHAN_2020');
  const [stormList, setStormList] = useState([]);
  const [stormData, setStormData] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(4); // Start at peak/midpoint
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/benchmark/storms`)
      .then((res) => res.json())
      .then((data) => {
        setStormList(data);
        if (data.length > 0) setSelectedStormId(data[0].storm_id);
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (selectedStormId) {
      fetch(`${API_BASE}/api/benchmark/storm/${selectedStormId}`)
        .then((res) => res.json())
        .then((data) => {
          setStormData(data);
          setCurrentStepIndex(Math.floor(data.track_ground_truth.length / 2));
          setIsPlaying(false);
        })
        .catch((err) => console.error(err));
    }
  }, [selectedStormId]);

  // Autoplay playback loop
  useEffect(() => {
    let timer;
    if (isPlaying && stormData) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= stormData.track_ground_truth.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1200);
    }
    return () => clearInterval(timer);
  }, [isPlaying, stormData]);

  if (!stormData) {
    return (
      <div className="p-8 text-center font-mono text-slate-400">
        Loading Historical Benchmark Datasets...
      </div>
    );
  }

  const currentGT = stormData.track_ground_truth[currentStepIndex] || stormData.track_ground_truth[0];
  const currentModel = stormData.model_forecast[currentStepIndex] || stormData.model_forecast[0];
  const currentIMD = stormData.operational_imd[currentStepIndex] || stormData.operational_imd[0];

  // Benchmark MAE comparison dataset
  const trackMaeData = [
    {
      horizon: '+24h Forecast',
      'Our AI Model': stormData.metrics.our_model_track_mae_km['24h'],
      'Operational IMD': stormData.metrics.imd_track_mae_km['24h'],
      'JTWC (US Navy)': stormData.metrics.jtwc_track_mae_km['24h']
    },
    {
      horizon: '+48h Forecast',
      'Our AI Model': stormData.metrics.our_model_track_mae_km['48h'],
      'Operational IMD': stormData.metrics.imd_track_mae_km['48h'],
      'JTWC (US Navy)': stormData.metrics.jtwc_track_mae_km['48h']
    },
    {
      horizon: '+72h Forecast',
      'Our AI Model': stormData.metrics.our_model_track_mae_km['72h'],
      'Operational IMD': stormData.metrics.imd_track_mae_km['72h'],
      'JTWC (US Navy)': stormData.metrics.jtwc_track_mae_km['72h']
    }
  ];

  // Intensity RMSE comparison dataset
  const intensityRmseData = [
    {
      horizon: '+24h Forecast',
      'Our AI Model': stormData.metrics.our_model_intensity_rmse_kts['24h'],
      'Operational IMD': stormData.metrics.imd_intensity_rmse_kts['24h']
    },
    {
      horizon: '+48h Forecast',
      'Our AI Model': stormData.metrics.our_model_intensity_rmse_kts['48h'],
      'Operational IMD': stormData.metrics.imd_intensity_rmse_kts['48h']
    },
    {
      horizon: '+72h Forecast',
      'Our AI Model': stormData.metrics.our_model_intensity_rmse_kts['72h'],
      'Operational IMD': stormData.metrics.imd_intensity_rmse_kts['72h']
    }
  ];

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto animate-fade-in font-sans">
      {/* Top Banner / Storm Selector */}
      <div className="bg-[#0d1527] border border-[#1e2f52] p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-500 text-white rounded-xl shadow-lg">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              HISTORICAL REPLAY & BENCHMARK ANALYTICS
              <span className="text-[10px] font-mono bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-800/50">
                ACADEMIC BENCHMARK
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Evaluate multi-horizon AI performance against Ground Truth Best-Track archives and operational agencies.
            </p>
          </div>
        </div>

        {/* Storm Selector Tabs */}
        <div className="flex items-center space-x-2">
          {stormList.map((s) => (
            <button
              key={s.storm_id}
              onClick={() => setSelectedStormId(s.storm_id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all ${
                selectedStormId === s.storm_id
                  ? 'bg-purple-950 border-purple-500 text-white shadow-md shadow-purple-500/20'
                  : 'bg-[#121d33] border-[#1e2f52] text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Replay Controls & Ground Truth Status Card */}
      <Card title={`Replay Engine: ${stormData.name}`} icon={Play} className="h-auto">
        <div className="space-y-4 font-mono text-xs">
          {/* Metadata Subheader */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#070b14] border border-[#1e2f52] p-3 rounded-xl">
            <div>
              <span className="text-[10px] text-slate-500 block">BASIN / DATES</span>
              <strong className="text-slate-200">{stormData.basin}</strong>
              <div className="text-[10px] text-slate-400">{stormData.dates}</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">PEAK INTENSITY</span>
              <strong className="text-purple-300">{stormData.peak_vmax_kts} kts</strong>
              <div className="text-[10px] text-slate-400">{stormData.lowest_pmin_hpa} hPa (Core)</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">LANDFALL SECTOR</span>
              <strong className="text-amber-300">{stormData.landfall}</strong>
              <div className="text-[10px] text-slate-400">Impact Zone</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">CLASSIFICATION</span>
              <CategoryBadge category={stormData.category} className="mt-0.5" />
            </div>
          </div>

          {/* Time Slider & Step Controller */}
          <div className="bg-[#121d33] border border-[#1e2f52] p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg transition-all shadow-md"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => { setIsPlaying(false); setCurrentStepIndex(0); }}
                  className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-all"
                  title="Reset to t=0"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <div className="text-xs text-slate-200">
                  Observation Step: <strong className="text-purple-300">+{currentGT.hour} Hours</strong> ({currentGT.time})
                </div>
              </div>

              <span className="text-slate-400 text-[11px]">
                Step {currentStepIndex + 1} of {stormData.track_ground_truth.length}
              </span>
            </div>

            <input
              type="range"
              min="0"
              max={stormData.track_ground_truth.length - 1}
              value={currentStepIndex}
              onChange={(e) => setCurrentStepIndex(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
            />
          </div>

          {/* Real-time Step Triangulation Comparison */}
          <div className="grid grid-cols-3 gap-3">
            {/* Ground Truth */}
            <div className="bg-[#070b14] border border-emerald-900/50 p-3 rounded-xl space-y-1">
              <div className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>GROUND TRUTH BEST-TRACK</span>
              </div>
              <div className="text-slate-300">Coord: <strong>{currentGT.lat}°N, {currentGT.lon}°E</strong></div>
              <div className="text-slate-300">Wind: <strong>{currentGT.vmax} kts</strong> • Pres: <strong>{currentGT.pmin} hPa</strong></div>
            </div>

            {/* Our AI Model */}
            <div className="bg-[#070b14] border border-cyan-900/50 p-3 rounded-xl space-y-1">
              <div className="text-cyan-400 font-bold flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                <span>OUR MULTI-TASK AI MODEL</span>
              </div>
              <div className="text-slate-300">Coord: <strong>{currentModel.lat}°N, {currentModel.lon}°E</strong></div>
              <div className="text-slate-300">Wind: <strong>{currentModel.vmax} kts</strong> • Pres: <strong>{currentModel.pmin} hPa</strong></div>
              <div className="text-[10px] text-cyan-300">
                Track Delta: {Math.round(Math.sqrt((currentModel.lat - currentGT.lat)**2 + (currentModel.lon - currentGT.lon)**2) * 111)} km
              </div>
            </div>

            {/* Operational Agency (IMD / JTWC) */}
            <div className="bg-[#070b14] border border-amber-900/50 p-3 rounded-xl space-y-1">
              <div className="text-amber-400 font-bold flex items-center gap-1">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>OPERATIONAL BASELINE (IMD)</span>
              </div>
              <div className="text-slate-300">Coord: <strong>{currentIMD.lat}°N, {currentIMD.lon}°E</strong></div>
              <div className="text-slate-300">Wind: <strong>{currentIMD.vmax} kts</strong> • Pres: <strong>{currentIMD.pmin} hPa</strong></div>
              <div className="text-[10px] text-amber-300">
                Track Delta: {Math.round(Math.sqrt((currentIMD.lat - currentGT.lat)**2 + (currentIMD.lon - currentGT.lon)**2) * 111)} km
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Benchmark Statistical Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Track Error MAE Bar Chart */}
        <Card title="Track Forecast Mean Absolute Error (MAE in km) — Lower is Better" icon={TrendingUp} className="h-80">
          <div className="w-full h-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trackMaeData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2f52" opacity={0.6} />
                <XAxis dataKey="horizon" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }} unit=" km" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#070b14', borderColor: '#1e2f52', borderRadius: '8px', fontFamily: 'JetBrains Mono', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }} />
                <Bar dataKey="Our AI Model" fill="#00f0ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="JTWC (US Navy)" fill="#818cf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Operational IMD" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Intensity RMSE Bar Chart */}
        <Card title="Intensity Forecast Error (RMSE in Knots) — Lower is Better" icon={BarChart3} className="h-80">
          <div className="w-full h-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={intensityRmseData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2f52" opacity={0.6} />
                <XAxis dataKey="horizon" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }} unit=" kts" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#070b14', borderColor: '#1e2f52', borderRadius: '8px', fontFamily: 'JetBrains Mono', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }} />
                <Bar dataKey="Our AI Model" fill="#00d2aa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Operational IMD" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

