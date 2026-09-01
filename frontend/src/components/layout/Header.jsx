import React from 'react';
import { 
  Radio, 
  Activity, 
  Layers, 
  Sliders, 
  AlertTriangle, 
  Compass, 
  Zap, 
  Clock,
  ShieldCheck,
  History,
  Sparkles,
  Scale,
  ShieldAlert
} from 'lucide-react';
import { useWebSocket } from '../../context/WebSocketContext';
import { useDashboard } from '../../context/DashboardContext';
import { CategoryBadge } from '../ui/Badge';

export const Header = ({ 
  activeStorms, 
  lastPassTimestamp, 
  onManualTriggerClick, 
  onSimControlClick,
  activePage = 'live',
  setActivePage
}) => {
  const { status, latencyMs } = useWebSocket();
  const { 
    activeBasin, 
    setActiveBasin, 
    selectedStormId, 
    setSelectedStormId,
    setIsLayoutModalOpen,
    activeAlert,
    setActiveAlert
  } = useDashboard();

  const BASINS = [
    'All Basins',
    'North Indian Ocean',
    'Western North Pacific',
    'North Atlantic',
    'South Indian Ocean'
  ];

  const NAV_ITEMS = [
    { id: 'live', label: 'Live Command', icon: Compass },
    { id: 'replay', label: 'Historical Replay', icon: History },
    { id: 'xai', label: 'XAI Studio', icon: Sparkles },
    { id: 'physics', label: 'Physics Sandbox', icon: Scale },
    { id: 'warning', label: 'Early Warning', icon: ShieldAlert },
  ];

  return (
    <header className="bg-[#0a0f1d] border-b border-[#1e2f52] sticky top-0 z-40 shadow-lg">
      {/* Top Stream Status Bar */}
      <div className="bg-[#070b14] px-4 py-1.5 border-b border-[#142038] flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                status === 'CONNECTED' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}></span>
            </span>
            <span className="font-semibold text-slate-200">
              {status === 'CONNECTED' ? 'LIVE INGESTION FEED' : 'RECONNECTING FEED'}
            </span>
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 text-slate-400">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>LATENCY: <strong className="text-cyan-300 font-bold">{latencyMs} ms</strong></span>
          </div>

          <div className="hidden md:flex items-center space-x-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>LAST PASS: <strong className="text-slate-300">
              {lastPassTimestamp ? new Date(lastPassTimestamp).toLocaleTimeString() : 'Syncing...'}
            </strong></span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="hidden lg:inline text-slate-500 text-[11px]">
            MODEL: <strong className="text-slate-300">TC-AI-Transformer v2.4 (FP16)</strong>
          </span>
          <div className="flex items-center space-x-1 text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 text-[10px]">
            <ShieldCheck className="w-3 h-3" />
            <span>PHYSICS GUARD: ON</span>
          </div>
        </div>
      </div>

      {/* Main Navigation & Command Bar */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Page Navigation Tabs */}
        <div className="flex items-center space-x-5">
          <div className="flex items-center space-x-2.5">
            <div className="bg-gradient-to-tr from-cyan-600 to-blue-500 p-2 rounded-xl text-white shadow-lg shadow-cyan-500/20">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                CYCLONE<span className="text-cyan-400">AI</span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 bg-cyan-950 text-cyan-300 rounded border border-cyan-800/50">PRO</span>
              </h1>
              <p className="text-[10px] text-slate-400 leading-none">B.Tech Major Capstone Edition</p>
            </div>
          </div>

          {/* Module Navigation Tabs */}
          <nav className="hidden lg:flex items-center space-x-1 bg-[#0d1527] border border-[#1e2f52] p-1 rounded-xl">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#121d33]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Storm Selector & Quick Action Toolbar */}
        <div className="flex items-center space-x-2">
          {/* Storm Selector Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
            {activeStorms.map((storm) => {
              const isSelected = storm.storm_id === selectedStormId;
              return (
                <button
                  key={storm.storm_id}
                  onClick={() => setSelectedStormId(storm.storm_id)}
                  className={`flex items-center space-x-2 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-md shadow-cyan-500/20'
                      : 'bg-[#0d1527] border-[#1e2f52] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  <span className="font-bold">{storm.name}</span>
                  <span className="text-[10px] text-slate-400 hidden xl:inline">{storm.vmax_kts} kts</span>
                </button>
              );
            })}
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex items-center space-x-1.5 border-l border-[#1e2f52] pl-2">
            <button
              onClick={onManualTriggerClick}
              className="flex items-center space-x-1 px-2.5 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-cyan-500/20"
              title="Trigger on-demand satellite pass"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pass Trigger</span>
            </button>

            <button
              onClick={onSimControlClick}
              className="flex items-center space-x-1 px-2.5 py-1 bg-[#121d33] border border-[#1e2f52] hover:border-cyan-500/50 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-all"
              title="Simulation speed & anomaly injection"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Sim</span>
            </button>

            {activePage === 'live' && (
              <button
                onClick={() => setIsLayoutModalOpen(true)}
                className="flex items-center space-x-1 px-2.5 py-1 bg-[#121d33] border border-[#1e2f52] hover:border-cyan-500/50 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-all"
                title="Customize modular widgets"
              >
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Layout</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Sub-Navigation Bar */}
      <div className="lg:hidden bg-[#0d1527] border-t border-[#142038] px-3 py-1 flex items-center space-x-1 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Warning Banner */}
      {activeAlert && (
        <div className="bg-amber-950/90 border-t border-b border-amber-600/50 px-4 py-2 flex items-center justify-between text-amber-200 text-xs animate-pulse">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-semibold">{activeAlert.message}</span>
          </div>
          <button
            onClick={() => setActiveAlert(null)}
            className="text-amber-400 hover:text-white text-xs underline font-mono"
          >
            Dismiss
          </button>
        </div>
      )}
    </header>
  );
};
