import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const [status, setStatus] = useState('CONNECTING'); // 'CONNECTED' | 'RECONNECTING' | 'OFFLINE'
  const [latencyMs, setLatencyMs] = useState(12);
  const [lastMessageTime, setLastMessageTime] = useState(null);
  const listenersRef = useRef(new Set());
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const pingIntervalRef = useRef(null);

  const getWsUrl = () => {
    if (import.meta.env.VITE_WS_URL) {
      return import.meta.env.VITE_WS_URL;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.port === '5173' || window.location.port === '5174' ? '127.0.0.1:8001' : window.location.host;
    return `${protocol}//${host}/ws/live-feed`;
  };

  const connect = useCallback(() => {
    try {
      const url = getWsUrl();
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('CONNECTED');
        reconnectAttempts.current = 0;
        
        // Start ping loop for latency tracking
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            const start = performance.now();
            ws.send('ping');
            ws._lastPingTime = start;
          }
        }, 5000);
      };

      ws.onmessage = (event) => {
        setLastMessageTime(new Date());
        if (event.data === 'pong') {
          if (ws._lastPingTime) {
            const lat = Math.round(performance.now() - ws._lastPingTime);
            setLatencyMs(lat);
          }
          return;
        }

        try {
          const parsed = JSON.parse(event.data);
          listenersRef.current.forEach((listener) => listener(parsed));
        } catch (e) {
          // Non-JSON message
        }
      };

      ws.onerror = () => {
        setStatus('RECONNECTING');
      };

      ws.onclose = () => {
        setStatus('RECONNECTING');
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        const timeout = Math.min(5000, 1000 * Math.pow(1.5, reconnectAttempts.current));
        reconnectAttempts.current += 1;
        setTimeout(connect, timeout);
      };
    } catch (e) {
      setStatus('OFFLINE');
      setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const addMessageListener = useCallback((callback) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ status, latencyMs, lastMessageTime, addMessageListener }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

