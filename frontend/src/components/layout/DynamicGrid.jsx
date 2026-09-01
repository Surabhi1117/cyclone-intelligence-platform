import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { TrajectoryMap } from '../widgets/TrajectoryMap';
import { SatelliteViewer } from '../widgets/SatelliteViewer';
import { TelemetryCard } from '../widgets/TelemetryCard';
import { ForecastCharts } from '../widgets/ForecastCharts';
import { IngestionLog } from '../widgets/IngestionLog';

export const DynamicGrid = ({ stormData, auditLogs, isLoading }) => {
  const { widgetOrder, widgetVisibility } = useDashboard();

  const renderWidget = (widgetId) => {
    switch (widgetId) {
      case 'map':
        return <TrajectoryMap stormData={stormData} isLoading={isLoading} />;
      case 'satellite':
        return <SatelliteViewer stormData={stormData} isLoading={isLoading} />;
      case 'telemetry':
        return <TelemetryCard stormData={stormData} isLoading={isLoading} />;
      case 'forecast':
        return <ForecastCharts stormData={stormData} isLoading={isLoading} />;
      case 'logs':
        return <IngestionLog logs={auditLogs} isLoading={isLoading} />;
      default:
        return null;
    }
  };

  const getWidgetColSpan = (widgetId) => {
    switch (widgetId) {
      case 'map':
        return 'col-span-12 xl:col-span-8';
      case 'satellite':
        return 'col-span-12 xl:col-span-4';
      case 'telemetry':
        return 'col-span-12 lg:col-span-4';
      case 'forecast':
        return 'col-span-12 lg:col-span-8';
      case 'logs':
        return 'col-span-12';
      default:
        return 'col-span-12';
    }
  };

  return (
    <div className="grid grid-cols-12 gap-4 p-4 max-w-[1700px] mx-auto">
      {widgetOrder.map((widgetId) => {
        if (!widgetVisibility[widgetId]) return null;

        return (
          <div 
            key={widgetId} 
            className={`${getWidgetColSpan(widgetId)} transition-all duration-300`}
          >
            {renderWidget(widgetId)}
          </div>
        );
      })}
    </div>
  );
};

