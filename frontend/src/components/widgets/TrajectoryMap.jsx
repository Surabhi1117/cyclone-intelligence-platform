import React, { useState, useEffect, useMemo } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polyline, 
  Polygon, 
  Circle,
  useMap,
  ImageOverlay
} from 'react-leaflet';
import L from 'leaflet';
import { 
  Compass, 
  Eye, 
  Layers, 
  Maximize2, 
  ShieldCheck, 
  Sliders,
  Wind
} from 'lucide-react';
import { Card } from '../ui/Card';
import { CategoryBadge } from '../ui/Badge';

// Helper to center map dynamically when storm changes
const MapCenterController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center.lat !== undefined && center.lon !== undefined) {
      map.setView([center.lat, center.lon], map.getZoom() || 6, { animate: true });
    }
  }, [center, map]);
  return null;
};

// Custom SVG Icons for Leaflet
const createVortexIcon = (vmax) => {
  return L.divIcon({
    className: 'custom-vortex-icon',
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="absolute w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400 radar-ring"></div>
        <div class="relative z-10 w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 border-2 border-white shadow-lg flex items-center justify-center text-[9px] font-bold text-white">
          ${Math.round(vmax)}
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const createHistoryIcon = (category) => {
  let color = '#38bdf8';
  if (category?.includes('Super')) color = '#c084fc';
  else if (category?.includes('Extremely')) color = '#fb7185';
  else if (category?.includes('Very')) color = '#f87171';
  else if (category?.includes('Cyclonic')) color = '#fbbf24';

  return L.divIcon({
    className: 'custom-hist-icon',
    html: `<div style="background-color: ${color}; width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid #ffffff; box-shadow: 0 0 4px ${color};"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5]
  });
};

const createForecastNodeIcon = (horizon, vmax) => {
  return L.divIcon({
    className: 'custom-fcst-icon',
    html: `
      <div class="bg-[#121d33] border border-cyan-400 text-cyan-300 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow-lg">
        +${horizon}h
      </div>
    `,
    iconSize: [34, 18],
    iconAnchor: [17, 9]
  });
};

export const TrajectoryMap = ({ stormData, isLoading }) => {
  const [showIRHeatmap, setShowIRHeatmap] = useState(true);
  const [irOpacity, setIrOpacity] = useState(0.65);
  const [showUncertaintyCone, setShowUncertaintyCone] = useState(true);
  const [showWindRadii, setShowWindRadii] = useState(true);
  const [baseMap, setBaseMap] = useState('dark');

  const center = stormData?.center || { lat: 15.4, lon: 67.8 };
  const history = stormData?.history || [];
  const forecastTrack = stormData?.forecast_track || [];
  const currentIntensity = stormData?.current_intensity || { vmax_kts: 65, pmin_hpa: 975, category: 'Cyclonic Storm' };
  const previews = stormData?.previews || {};

  // Tile layers (100% free, no API key or watermark required)
  const TILE_LAYERS = {
    dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ocean: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  };

  // Build Uncertainty Cone Polygon from forecast track
  const conePolygonCoords = useMemo(() => {
    if (!forecastTrack || forecastTrack.length === 0) return [];

    const leftBoundary = [];
    const rightBoundary = [];

    // Starting at current location
    leftBoundary.push([center.lat, center.lon]);
    rightBoundary.push([center.lat, center.lon]);

    forecastTrack.forEach((pt) => {
      // Expanding uncertainty radius with lead time
      const spreadDeg = Math.max(0.3, pt.horizon_h * 0.035);
      const sigmaLat = pt.sigma_lat || spreadDeg;
      const sigmaLon = pt.sigma_lon || spreadDeg;

      leftBoundary.push([pt.lat + sigmaLat, pt.lon - sigmaLon]);
      rightBoundary.push([pt.lat - sigmaLat, pt.lon + sigmaLon]);
    });

    // Complete closed polygon loop: left boundary forward, right boundary backward
    return [...leftBoundary, ...rightBoundary.reverse()];
  }, [center, forecastTrack]);

  // History path coordinates
  const historyPath = useMemo(() => {
    const coords = history.map((h) => [h.lat, h.lon]);
    coords.push([center.lat, center.lon]);
    return coords;
  }, [history, center]);

  // Forecast path coordinates
  const forecastPath = useMemo(() => {
    const coords = [[center.lat, center.lon]];
    forecastTrack.forEach((f) => coords.push([f.lat, f.lon]));
    return coords;
  }, [center, forecastTrack]);

  // Calculate 1000km x 1000km raster bounding box
  const heatmapBounds = useMemo(() => {
    const halfDeg = 1000.0 / (111.0 * 2.0);
    return [
      [center.lat - halfDeg, center.lon - halfDeg],
      [center.lat + halfDeg, center.lon + halfDeg]
    ];
  }, [center]);

  return (
    <Card 
      title="Dynamic Trajectory & Probabilistic Track Cone" 
      icon={Compass}
      className="h-[520px]"
      headerAction={
        <div className="flex items-center space-x-2">
          {/* Heatmap overlay toggle */}
          <button
            onClick={() => setShowIRHeatmap(!showIRHeatmap)}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-mono font-medium border transition-colors ${
              showIRHeatmap 
                ? 'bg-cyan-950 border-cyan-500 text-cyan-300' 
                : 'bg-slate-800/60 border-slate-700 text-slate-400'
            }`}
            title="Toggle Satellite Thermal IR Raster Overlay"
          >
            <Eye className="w-3 h-3" />
            <span>IR Raster</span>
          </button>

          {/* Cone toggle */}
          <button
            onClick={() => setShowUncertaintyCone(!showUncertaintyCone)}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-mono font-medium border transition-colors ${
              showUncertaintyCone 
                ? 'bg-purple-950 border-purple-500 text-purple-300' 
                : 'bg-slate-800/60 border-slate-700 text-slate-400'
            }`}
            title="Toggle Cone of Uncertainty"
          >
            <Wind className="w-3 h-3" />
            <span>Cone</span>
          </button>

          {/* Basemap switch */}
          <select
            value={baseMap}
            onChange={(e) => setBaseMap(e.target.value)}
            className="bg-[#070b14] border border-[#1e2f52] text-[11px] rounded px-1.5 py-1 text-slate-300 focus:outline-none"
          >
            <option value="dark">Dark Canvas</option>
            <option value="satellite">Satellite</option>
            <option value="ocean">Bathymetry</option>
            <option value="osm">OpenStreetMap</option>
          </select>
        </div>
      }
    >
      <div className="relative w-full h-full rounded-lg overflow-hidden border border-[#1e2f52]/80">
        <MapContainer
          center={[center.lat, center.lon]}
          zoom={6}
          className="w-full h-full"
          scrollWheelZoom={true}
          zoomControl={false}
        >
          <MapCenterController center={center} />
          
          {/* Base Tile Layer */}
          <TileLayer
            attribution='&copy; ESRI / OpenStreetMap'
            url={TILE_LAYERS[baseMap]}
          />

          {/* Satellite IR Thermal Raster Overlay */}
          {showIRHeatmap && previews.tir_10_8 && (
            <ImageOverlay
              url={previews.tir_10_8}
              bounds={heatmapBounds}
              opacity={irOpacity}
            />
          )}

          {/* Cone of Uncertainty Polygon */}
          {showUncertaintyCone && conePolygonCoords.length > 0 && (
            <Polygon
              positions={conePolygonCoords}
              pathOptions={{
                color: '#818cf8',
                fillColor: '#6366f1',
                fillOpacity: 0.18,
                weight: 1.5,
                dashArray: '4, 4'
              }}
            />
          )}

          {/* Historical Trajectory Polyline */}
          {historyPath.length > 1 && (
            <Polyline
              positions={historyPath}
              pathOptions={{
                color: '#38bdf8',
                weight: 3,
                opacity: 0.8
              }}
            />
          )}

          {/* Forecasted Trajectory Polyline */}
          {forecastPath.length > 1 && (
            <Polyline
              positions={forecastPath}
              pathOptions={{
                color: '#00f0ff',
                weight: 3.5,
                dashArray: '6, 6',
                opacity: 0.95
              }}
            />
          )}

          {/* Historical Track Points */}
          {history.map((pt, idx) => (
            <Marker
              key={`hist-${idx}`}
              position={[pt.lat, pt.lon]}
              icon={createHistoryIcon(pt.category)}
            >
              <Popup>
                <div className="p-1 space-y-1 font-mono text-xs">
                  <div className="font-bold text-slate-100">{new Date(pt.timestamp).toUTCString()}</div>
                  <div className="text-cyan-400 font-semibold">{pt.category}</div>
                  <div>Wind: <strong>{pt.vmax_kts} kts</strong> • Pres: <strong>{pt.pmin_hpa} hPa</strong></div>
                  <div className="text-slate-400">Position: {pt.lat}°N, {pt.lon}°E</div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Current Storm Center Vortex Marker */}
          <Marker
            position={[center.lat, center.lon]}
            icon={createVortexIcon(currentIntensity.vmax_kts)}
          >
            <Popup>
              <div className="p-1.5 space-y-1 font-mono text-xs">
                <div className="font-bold text-sm text-cyan-300">{stormData?.storm_name || 'Active TC'} (Current Center)</div>
                <div className="text-slate-200">Category: <strong>{currentIntensity.category}</strong></div>
                <div className="text-slate-200">Vmax: <strong>{currentIntensity.vmax_kts} kts</strong> ({Math.round(currentIntensity.vmax_kts * 1.852)} km/h)</div>
                <div className="text-slate-200">Pmin: <strong>{currentIntensity.pmin_hpa} hPa</strong></div>
                <div className="text-slate-400">Coordinates: {center.lat.toFixed(2)}°N, {center.lon.toFixed(2)}°E</div>
              </div>
            </Popup>
          </Marker>

          {/* Radius of Maximum Wind (Rmax) Circle */}
          {showWindRadii && (
            <Circle
              center={[center.lat, center.lon]}
              radius={Math.max(30000, (180 - currentIntensity.vmax_kts) * 600)}
              pathOptions={{
                color: '#ffaa00',
                fillColor: '#ffaa00',
                fillOpacity: 0.08,
                weight: 1.5,
                dashArray: '3, 3'
              }}
            />
          )}

          {/* Forecast Horizon Waypoints */}
          {forecastTrack.map((pt, idx) => (
            <Marker
              key={`fcst-${idx}`}
              position={[pt.lat, pt.lon]}
              icon={createForecastNodeIcon(pt.horizon_h, pt.lat)}
            >
              <Popup>
                <div className="p-1.5 space-y-1 font-mono text-xs">
                  <div className="font-bold text-cyan-300">Forecast +{pt.horizon_h} Hours</div>
                  <div className="text-slate-200">Coord: {pt.lat}°N, {pt.lon}°E</div>
                  <div className="text-slate-400">Position Std: ±{pt.sigma_lat}° lat / ±{pt.sigma_lon}° lon</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Floating Map Controls & Legend Overlay */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-[#070b14]/90 backdrop-blur-md border border-[#1e2f52] p-2.5 rounded-lg text-[11px] font-mono space-y-1.5 text-slate-300 shadow-xl">
          <div className="font-bold text-slate-100 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
            <span>TRACK TRAJECTORY LEGEND</span>
          </div>
          <div className="flex items-center space-x-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-sky-400 inline-block"></span> Observed Track</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-cyan-400 border-b border-dashed inline-block"></span> AI Forecast (+72h)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-indigo-500/40 border border-indigo-400 inline-block"></span> Uncertainty Cone</span>
          </div>

          {/* IR Opacity Slider if active */}
          {showIRHeatmap && (
            <div className="pt-1 border-t border-slate-800 flex items-center space-x-2 text-[10px]">
              <span>IR Opacity:</span>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={irOpacity}
                onChange={(e) => setIrOpacity(parseFloat(e.target.value))}
                className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <span className="text-cyan-300 font-bold">{Math.round(irOpacity * 100)}%</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

