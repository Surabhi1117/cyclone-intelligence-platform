import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { WebSocketProvider } from './context/WebSocketContext.jsx';
import { DashboardProvider } from './context/DashboardContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WebSocketProvider>
      <DashboardProvider>
        <App />
      </DashboardProvider>
    </WebSocketProvider>
  </React.StrictMode>,
);

