import React, { useState } from 'react';
import { useLiveCycloneData } from './hooks/useLiveCycloneData';
import { useDashboard, WIDGET_DEFS, LAYOUT_PRESETS } from './context/DashboardContext';
import { Header } from './components/layout/Header';
import { DynamicGrid } from './components/layout/DynamicGrid';
import { HistoricalReplay } from './pages/HistoricalReplay';
import { XAIStudio } from './pages/XAIStudio';
import { PhysicsSandbox } from './pages/PhysicsSandbox';
import { EarlyWarning } from './pages/EarlyWarning';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Modal } from './components/ui/Modal';
import { 
  Layers, 
  Sliders, 
  Zap, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  Flame, 
  Wind, 
  Check,
  RefreshCw
} from 'lucide-react';

export function App() {
  const [activePage, setActivePage] = useState('live'); // 'live' | 'replay' | 'xai' | 'physics' | 'warning'

  const {
    activeStorms,
    currentStormData,
    auditLogs,
    isLoading,
    lastPassTimestamp,
    refetch,
    triggerManualPass,
    updateSimulation
  } = useLiveCycloneData();

  const {
    widgetOrder,
    setWidgetOrder,
    widgetVisibility,
    toggleWidget,
    moveWidget,
    applyPreset,
    alertThresholds,
    setAlertThresholds,
    isLayoutModalOpen,
    setIsLayoutModalOpen,
    isSimulationModalOpen,
    setIsSimulationModalOpen,
    isManualTriggerOpen,
    setIsManualTriggerOpen,
    selectedStormId
  } = useDashboard();

  // Manual Trigger Form State
  const [manualForm, setManualForm] = useState({
    custom_lat: '',
    custom_lon: '',
    custom_vmax: '',
    custom_pattern: 'Eye Pattern'
  });
  const [isTriggering, setIsTriggering] = useState(false);

  // Simulation controls state
  const [simInterval, setSimInterval] = useState(15);
  const [simMsg, setSimMsg] = useState('');

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setIsTriggering(true);
    try {
      const payload = {
        storm_id: selectedStormId,
        custom_lat: manualForm.custom_lat ? parseFloat(manualForm.custom_lat) : undefined,
        custom_lon: manualForm.custom_lon ? parseFloat(manualForm.custom_lon) : undefined,
        custom_vmax: manualForm.custom_vmax ? parseFloat(manualForm.custom_vmax) : undefined,
        custom_pattern: manualForm.custom_pattern || undefined
      };
      await triggerManualPass(payload);
      setIsManualTriggerOpen(false);
    } catch (err) {
      alert('Error triggering pass: ' + err.message);
    } finally {
      setIsTriggering(false);
    }
  };

  const handleApplySimInterval = async (val) => {
    setSimInterval(val);
    await updateSimulation({ poll_interval_seconds: val });
    setSimMsg(`Polling cadence set to ${val} seconds.`);
    setTimeout(() => setSimMsg(''), 3000);
  };

  const handleInjectRI = async () => {
    await updateSimulation({ inject_rapid_intensification: true });
    setSimMsg('Rapid Intensification (+35 kts) injected into pipeline.');
    setTimeout(() => setSimMsg(''), 3000);
  };

  const handleInjectShear = async () => {
    await updateSimulation({ inject_wind_shear: true });
    setSimMsg('High Vertical Wind Shear injected into pipeline.');
    setTimeout(() => setSimMsg(''), 3000);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* Top Header with Multi-Page Navigation */}
      <Header
        activeStorms={activeStorms}
        lastPassTimestamp={lastPassTimestamp}
        onManualTriggerClick={() => setIsManualTriggerOpen(true)}
        onSimControlClick={() => setIsSimulationModalOpen(true)}
        activePage={activePage}
        setActivePage={setActivePage}
      />

      {/* Main Page View Switching */}
      <main className="flex-1 pb-8">
        <ErrorBoundary>
          {activePage === 'live' && (
            <DynamicGrid
              stormData={currentStormData}
              auditLogs={auditLogs}
              isLoading={isLoading}
            />
          )}

          {activePage === 'replay' && (
            <HistoricalReplay />
          )}

          {activePage === 'xai' && (
            <XAIStudio stormData={currentStormData} />
          )}

          {activePage === 'physics' && (
            <PhysicsSandbox />
          )}

          {activePage === 'warning' && (
            <EarlyWarning />
          )}
        </ErrorBoundary>
      </main>

      {/* Footer System Status */}
      <footer className="bg-[#0a0f1d] border-t border-[#142038] py-2.5 px-4 text-center text-xs font-mono text-slate-500 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center space-x-3">
          <strong className="text-slate-300">B.TECH FINAL YEAR CAPSTONE PROJECT</strong>
          <span>•</span>
          <span className="text-cyan-400">FP16 PYTORCH MULTI-TASK TRANSFORMER</span>
          <span>•</span>
          <span className="text-emerald-400">ATKINSON-HOLLIDAY VERIFIED</span>
        </div>
        <div className="text-slate-400">
          5 Academic Modules Operational | Multi-Basin Ingestion Active
        </div>
      </footer>

      {/* MODAL 1: Pluggable Layout Customizer */}
      <Modal
        isOpen={isLayoutModalOpen}
        onClose={() => setIsLayoutModalOpen(false)}
        title="Pluggable Dashboard Layout Manager"
      >
        <div className="space-y-5 font-mono text-xs">
          <div>
            <label className="text-slate-400 font-bold block mb-2">LAYOUT PRESETS</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(LAYOUT_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className="bg-[#121d33] border border-[#1e2f52] hover:border-cyan-500 p-2.5 rounded-xl text-left transition-all"
                >
                  <div className="font-bold text-slate-200 text-xs">{preset.name}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{preset.widgets.length} Cards Active</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-bold block mb-2">MODULAR WIDGET ARRANGEMENT</label>
            <div className="space-y-2">
              {widgetOrder.map((wId, index) => {
                const def = WIDGET_DEFS[wId];
                const isVis = widgetVisibility[wId];

                return (
                  <div
                    key={wId}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      isVis
                        ? 'bg-[#121d33] border-[#1e2f52]'
                        : 'bg-[#070b14] border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleWidget(wId)}
                        className={`p-1 rounded ${isVis ? 'text-cyan-400 hover:text-cyan-300' : 'text-slate-600'}`}
                      >
                        {isVis ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <span className="font-semibold text-slate-200 text-xs">{def?.title}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        disabled={index === 0}
                        onClick={() => moveWidget(index, index - 1)}
                        className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-300"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={index === widgetOrder.length - 1}
                        onClick={() => moveWidget(index, index + 1)}
                        className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-300"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[#1e2f52] pt-4 space-y-3">
            <label className="text-slate-400 font-bold block">CUSTOM ALERT THRESHOLDS</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 text-[11px] block mb-1">Severe Wind Alert (kts):</span>
                <input
                  type="number"
                  value={alertThresholds.windSpeedAlertKts}
                  onChange={(e) => setAlertThresholds({ ...alertThresholds, windSpeedAlertKts: parseInt(e.target.value) || 64 })}
                  className="w-full bg-[#070b14] border border-[#1e2f52] p-2 rounded-lg text-white font-mono"
                />
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block mb-1">RI Threshold (kts/24h):</span>
                <input
                  type="number"
                  value={alertThresholds.riThresholdKts24h}
                  onChange={(e) => setAlertThresholds({ ...alertThresholds, riThresholdKts24h: parseInt(e.target.value) || 30 })}
                  className="w-full bg-[#070b14] border border-[#1e2f52] p-2 rounded-lg text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Simulation Controls */}
      <Modal
        isOpen={isSimulationModalOpen}
        onClose={() => setIsSimulationModalOpen(false)}
        title="Simulation Cadence & Anomaly Injector"
      >
        <div className="space-y-4 font-mono text-xs">
          {simMsg && (
            <div className="bg-emerald-950 border border-emerald-600/50 text-emerald-300 p-2.5 rounded-xl">
              {simMsg}
            </div>
          )}

          <div>
            <label className="text-slate-400 font-bold block mb-2">CONTINUOUS INGESTION CADENCE</label>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 30].map((sec) => (
                <button
                  key={sec}
                  onClick={() => handleApplySimInterval(sec)}
                  className={`p-2 rounded-xl border text-center font-bold transition-all ${
                    simInterval === sec
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-md'
                      : 'bg-[#121d33] border-[#1e2f52] text-slate-400 hover:text-white'
                  }`}
                >
                  {sec}s Interval
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[#1e2f52] pt-4 space-y-2">
            <label className="text-slate-400 font-bold block mb-1">METEOROLOGICAL ANOMALY INJECTION</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleInjectRI}
                className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-gradient-to-r from-amber-950 to-orange-950 border border-amber-500/80 text-amber-300 hover:border-amber-400 transition-all shadow-lg"
              >
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="font-bold">Inject Rapid Intensification (+35 kts)</span>
              </button>

              <button
                onClick={handleInjectShear}
                className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-gradient-to-r from-blue-950 to-indigo-950 border border-indigo-500/80 text-indigo-300 hover:border-indigo-400 transition-all shadow-lg"
              >
                <Wind className="w-4 h-4 text-indigo-400" />
                <span className="font-bold">Inject High Wind Shear (-25 kts)</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: Manual Pass Trigger */}
      <Modal
        isOpen={isManualTriggerOpen}
        onClose={() => setIsManualTriggerOpen(false)}
        title="On-Demand Satellite Pass & Inference Trigger"
      >
        <form onSubmit={handleManualSubmit} className="space-y-4 font-mono text-xs">
          <p className="text-slate-400">
            Generate an on-demand satellite pass granule with custom meteorological parameters or use default synthetic stream values.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Center Latitude (°N):</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 16.5"
                value={manualForm.custom_lat}
                onChange={(e) => setManualForm({ ...manualForm, custom_lat: e.target.value })}
                className="w-full bg-[#070b14] border border-[#1e2f52] p-2.5 rounded-lg text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Center Longitude (°E):</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 68.2"
                value={manualForm.custom_lon}
                onChange={(e) => setManualForm({ ...manualForm, custom_lon: e.target.value })}
                className="w-full bg-[#070b14] border border-[#1e2f52] p-2.5 rounded-lg text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Vmax (Knots):</label>
              <input
                type="number"
                placeholder="e.g. 105"
                value={manualForm.custom_vmax}
                onChange={(e) => setManualForm({ ...manualForm, custom_vmax: e.target.value })}
                className="w-full bg-[#070b14] border border-[#1e2f52] p-2.5 rounded-lg text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Pattern Archetype:</label>
              <select
                value={manualForm.custom_pattern}
                onChange={(e) => setManualForm({ ...manualForm, custom_pattern: e.target.value })}
                className="w-full bg-[#070b14] border border-[#1e2f52] p-2.5 rounded-lg text-white font-mono focus:border-cyan-500 focus:outline-none"
              >
                <option value="Eye Pattern">Eye Pattern</option>
                <option value="Central Dense Overcast">Central Dense Overcast</option>
                <option value="Curved Band">Curved Band</option>
                <option value="Shear Pattern">Shear Pattern</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#1e2f52]">
            <button
              type="button"
              onClick={() => setIsManualTriggerOpen(false)}
              className="px-4 py-2 bg-[#121d33] text-slate-300 rounded-lg font-medium hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isTriggering}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-bold flex items-center space-x-1.5 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {isTriggering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              <span>Execute Ingestion & Inference</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default App;
