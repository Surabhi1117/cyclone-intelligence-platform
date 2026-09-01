import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { useDashboard } from '../context/DashboardContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const useLiveCycloneData = () => {
  const { addMessageListener } = useWebSocket();
  const { selectedStormId, setSelectedStormId, activeBasin, setActiveAlert } = useDashboard();

  const [activeStorms, setActiveStorms] = useState([]);
  const [currentStormData, setCurrentStormData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastPassTimestamp, setLastPassTimestamp] = useState(null);

  const selectedStormRef = useRef(selectedStormId);
  useEffect(() => {
    selectedStormRef.current = selectedStormId;
  }, [selectedStormId]);

  // 1. Fetch Active Storms List
  const fetchActiveStorms = useCallback(async () => {
    try {
      const url = activeBasin && activeBasin !== 'All Basins'
        ? `${API_BASE}/api/storms/active?basin=${encodeURIComponent(activeBasin)}`
        : `${API_BASE}/api/storms/active`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        setActiveStorms(data);
        if (data.length > 0 && !data.some(s => s.storm_id === selectedStormRef.current)) {
          setSelectedStormId(data[0].storm_id);
        }
      }
    } catch (e) {
      console.warn('Could not fetch active storms:', e);
    }
  }, [activeBasin, setSelectedStormId]);

  // 2. Fetch Latest Inference for Selected Storm
  const fetchLatestInference = useCallback(async (stormId) => {
    if (!stormId) return;
    try {
      setIsLoading(true);
      const resp = await fetch(`${API_BASE}/api/storms/${stormId}/latest`);
      if (resp.ok) {
        const data = await resp.json();
        setCurrentStormData(data);
        setLastPassTimestamp(data.timestamp);
      }
    } catch (e) {
      console.warn(`Could not fetch latest inference for ${stormId}:`, e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 3. Fetch Ingestion Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/ingest/logs?limit=40`);
      if (resp.ok) {
        const logs = await resp.json();
        setAuditLogs(logs);
      }
    } catch (e) {
      console.warn('Could not fetch audit logs:', e);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchActiveStorms();
    fetchAuditLogs();
  }, [fetchActiveStorms, fetchAuditLogs]);

  // Fetch when storm selection changes
  useEffect(() => {
    if (selectedStormId) {
      fetchLatestInference(selectedStormId);
    }
  }, [selectedStormId, fetchLatestInference]);

  // 4. WebSocket Event Handler
  useEffect(() => {
    const handleEvent = (payload) => {
      const { event_type, data } = payload;

      if (event_type === 'NEW_SATELLITE_PASS') {
        setLastPassTimestamp(data.timestamp);
        // Add log entry
        setAuditLogs((prev) => [
          {
            id: Date.now(),
            timestamp: data.timestamp,
            event_type: 'NEW_SATELLITE_PASS',
            level: 'INFO',
            message: `New granule pass ingested: ${data.granule_id}`,
            details: data
          },
          ...prev.slice(0, 49)
        ]);
      } else if (event_type === 'INFERENCE_COMPLETE') {
        setLastPassTimestamp(data.timestamp);
        
        // If message is for the currently viewed storm, update state smoothly
        if (data.storm_id === selectedStormRef.current) {
          setCurrentStormData(data);
        }

        // Update storm card in the active list
        setActiveStorms((prev) =>
          prev.map((s) => {
            if (s.storm_id === data.storm_id) {
              return {
                ...s,
                current_lat: data.center.lat,
                current_lon: data.center.lon,
                vmax_kts: data.current_intensity.vmax_kts,
                pmin_hpa: data.current_intensity.pmin_hpa,
                category: data.current_intensity.category,
                pattern: data.pattern_classification.predicted_pattern,
                last_synced: data.timestamp
              };
            }
            return s;
          })
        );

        // Add to audit logs
        setAuditLogs((prev) => [
          {
            id: Date.now(),
            timestamp: data.timestamp,
            event_type: 'INFERENCE_COMPLETE',
            level: 'SUCCESS',
            message: `Inference complete for ${data.storm_name}: ${data.current_intensity.category} (${data.current_intensity.vmax_kts} kts) [${data.turnaround_ms}ms]`,
            details: {
              turnaround_ms: data.turnaround_ms,
              confidence: data.physics_guardrail.physical_confidence_score
            }
          },
          ...prev.slice(0, 49)
        ]);
      } else if (event_type === 'STORM_INTENSIFICATION_ALERT') {
        setActiveAlert(data);
        setAuditLogs((prev) => [
          {
            id: Date.now(),
            timestamp: data.timestamp,
            event_type: 'STORM_INTENSIFICATION_ALERT',
            level: 'WARNING',
            message: data.message,
            details: data
          },
          ...prev.slice(0, 49)
        ]);
      }
    };

    const unsubscribe = addMessageListener(handleEvent);
    return () => unsubscribe();
  }, [addMessageListener, setActiveAlert]);

  // Manual Trigger helper
  const triggerManualPass = async (params = {}) => {
    try {
      const resp = await fetch(`${API_BASE}/api/ingest/manual-trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storm_id: selectedStormId,
          ...params
        })
      });
      return await resp.json();
    } catch (e) {
      console.error('Manual trigger failed:', e);
      throw e;
    }
  };

  // Simulation Control helper
  const updateSimulation = async (controls = {}) => {
    try {
      const resp = await fetch(`${API_BASE}/api/ingest/simulation-control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(controls)
      });
      return await resp.json();
    } catch (e) {
      console.error('Simulation control failed:', e);
      throw e;
    }
  };

  return {
    activeStorms,
    currentStormData,
    auditLogs,
    isLoading,
    lastPassTimestamp,
    refetch: () => {
      fetchActiveStorms();
      if (selectedStormId) fetchLatestInference(selectedStormId);
      fetchAuditLogs();
    },
    triggerManualPass,
    updateSimulation
  };
};

