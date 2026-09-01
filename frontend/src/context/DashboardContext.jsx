import React, { createContext, useContext, useState, useEffect } from 'react';

const DashboardContext = createContext(null);

export const WIDGET_DEFS = {
  map: { id: 'map', title: 'Interactive Track & Uncertainty Cone', defaultSpan: 'col-span-12 lg:col-span-8' },
  satellite: { id: 'satellite', title: 'Multi-Spectral Satellite & AI Attention', defaultSpan: 'col-span-12 lg:col-span-4' },
  telemetry: { id: 'telemetry', title: 'Real-Time Telemetry & AI Classification', defaultSpan: 'col-span-12 md:col-span-6 lg:col-span-4' },
  forecast: { id: 'forecast', title: 'Multi-Horizon Intensity & Pressure Dynamics', defaultSpan: 'col-span-12 md:col-span-6 lg:col-span-8' },
  logs: { id: 'logs', title: 'Continuous Ingestion & Audit Stream', defaultSpan: 'col-span-12' },
};

export const LAYOUT_PRESETS = {
  COMMAND_CENTER: {
    name: 'Full Command Center',
    widgets: ['map', 'satellite', 'telemetry', 'forecast', 'logs'],
    visible: { map: true, satellite: true, telemetry: true, forecast: true, logs: true }
  },
  MET_ANALYSIS: {
    name: 'Meteorological Analysis',
    widgets: ['satellite', 'map', 'forecast', 'telemetry'],
    visible: { map: true, satellite: true, telemetry: true, forecast: true, logs: false }
  },
  COMPACT_TRACKING: {
    name: 'Compact Tracking',
    widgets: ['map', 'telemetry', 'forecast'],
    visible: { map: true, satellite: false, telemetry: true, forecast: true, logs: false }
  }
};

export const DashboardProvider = ({ children }) => {
  const [activeBasin, setActiveBasin] = useState('All Basins');
  const [selectedStormId, setSelectedStormId] = useState('IO022026_BIPARJOY');
  
  // Pluggable Layout State
  const [widgetOrder, setWidgetOrder] = useState(['map', 'satellite', 'telemetry', 'forecast', 'logs']);
  const [widgetVisibility, setWidgetVisibility] = useState({
    map: true,
    satellite: true,
    telemetry: true,
    forecast: true,
    logs: true,
  });

  // Alert & Thresholds
  const [alertThresholds, setAlertThresholds] = useState({
    windSpeedAlertKts: 64, // Hurricane/Severe threshold
    riThresholdKts24h: 30, // Rapid intensification threshold
    enableSoundAlerts: false
  });

  // Modal dialog states
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false);
  const [isManualTriggerOpen, setIsManualTriggerOpen] = useState(false);

  // Active Alert Notification Banner
  const [activeAlert, setActiveAlert] = useState(null);

  const applyPreset = (presetKey) => {
    const preset = LAYOUT_PRESETS[presetKey];
    if (preset) {
      setWidgetOrder(preset.widgets);
      setWidgetVisibility(preset.visible);
    }
  };

  const toggleWidget = (widgetId) => {
    setWidgetVisibility((prev) => ({
      ...prev,
      [widgetId]: !prev[widgetId]
    }));
  };

  const moveWidget = (dragIndex, hoverIndex) => {
    const newOrder = [...widgetOrder];
    const [draggedItem] = newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, draggedItem);
    setWidgetOrder(newOrder);
  };

  return (
    <DashboardContext.Provider value={{
      activeBasin,
      setActiveBasin,
      selectedStormId,
      setSelectedStormId,
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
      activeAlert,
      setActiveAlert
    }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

