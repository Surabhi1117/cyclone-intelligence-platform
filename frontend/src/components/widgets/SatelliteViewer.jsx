import React, { useState, useRef, useEffect } from 'react';
import { 
  Radio, 
  Sparkles, 
  Layers, 
  Sliders, 
  Maximize2, 
  Info,
  Flame,
  Droplets,
  Zap,
  Eye
} from 'lucide-react';
import { Card } from '../ui/Card';

export const SatelliteViewer = ({ stormData, isLoading }) => {
  const [activeChannel, setActiveChannel] = useState('tir_10_8'); // 'tir_10_8' | 'wv_6_7' | 'mw_89'
  const [showGradCam, setShowGradCam] = useState(true);
  const [blendFactor, setBlendFactor] = useState(0.55); // 0.0 to 1.0
  const [hoverPixelInfo, setHoverPixelInfo] = useState(null);

  const canvasRef = useRef(null);
  const previews = stormData?.previews || {};
  const gradCamMatrix = stormData?.grad_cam_attention_map || [];
  const stormName = stormData?.storm_name || 'Active Cyclone';

  // Render combined composite (Satellite Base + GradCAM Canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 128;
    canvas.width = size;
    canvas.height = size;

    const baseImgSrc = previews[activeChannel];
    if (!baseImgSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = baseImgSrc;
    img.onload = () => {
      ctx.clearRect(0, 0, size, size);
      // Draw satellite channel
      ctx.drawImage(img, 0, 0, size, size);

      // Draw Grad-CAM overlay if enabled
      if (showGradCam && gradCamMatrix && gradCamMatrix.length === 128) {
        const camImageData = ctx.createImageData(size, size);
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const camVal = gradCamMatrix[y][x] || 0.0;
            const index = (y * size + x) * 4;
            
            // Only draw where AI attention is active (> 0.25)
            if (camVal > 0.25) {
              // Colormap: Turbo/Plasma heat (Red-Yellow-Cyan)
              const r = Math.min(255, Math.floor(camVal * 255 * 1.3));
              const g = Math.min(255, Math.floor(Math.sin(camVal * Math.PI) * 255));
              const b = Math.min(255, Math.floor((1 - camVal) * 180));
              const alpha = Math.floor(camVal * blendFactor * 255);

              camImageData.data[index] = r;
              camImageData.data[index + 1] = g;
              camImageData.data[index + 2] = b;
              camImageData.data[index + 3] = alpha;
            }
          }
        }
        // Use a temporary canvas to composite with 'screen' or 'source-over'
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = size;
        tempCanvas.height = size;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(camImageData, 0, 0);

        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
      }
    };
  }, [activeChannel, previews, showGradCam, blendFactor, gradCamMatrix]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 128 / rect.width;
    const scaleY = 128 / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x >= 0 && x < 128 && y >= 0 && y < 128) {
      const camVal = gradCamMatrix[y] ? gradCamMatrix[y][x] : 0;
      // Estimate physical brightness temp
      const distFromCenter = Math.sqrt((x - 64)**2 + (y - 64)**2);
      let tempC = -70 + (distFromCenter * 0.9);
      if (activeChannel === 'tir_10_8') tempC = -85 + (distFromCenter * 1.1);

      setHoverPixelInfo({
        x,
        y,
        tempC: Math.round(tempC),
        tempK: Math.round(tempC + 273.15),
        camAttention: Math.round(camVal * 100)
      });
    }
  };

  const handleMouseLeave = () => {
    setHoverPixelInfo(null);
  };

  return (
    <Card
      title="Multi-Spectral Satellite & AI Attention"
      icon={Radio}
      className="h-[520px]"
      headerAction={
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setShowGradCam(!showGradCam)}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-mono font-medium border transition-colors ${
              showGradCam
                ? 'bg-amber-950 border-amber-500 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Toggle Grad-CAM AI Attention Heatmap Overlay"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Grad-CAM</span>
          </button>
        </div>
      }
    >
      {/* Channel Switcher Tabs */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        <button
          onClick={() => setActiveChannel('tir_10_8')}
          className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
            activeChannel === 'tir_10_8'
              ? 'bg-gradient-to-r from-red-950 to-orange-950 border-red-500/80 text-red-300 shadow-md'
              : 'bg-[#121d33] border-[#1e2f52] text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-red-400" />
          <span>IR 10.8µm</span>
        </button>

        <button
          onClick={() => setActiveChannel('wv_6_7')}
          className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
            activeChannel === 'wv_6_7'
              ? 'bg-gradient-to-r from-blue-950 to-cyan-950 border-cyan-500/80 text-cyan-300 shadow-md'
              : 'bg-[#121d33] border-[#1e2f52] text-slate-400 hover:text-slate-200'
          }`}
        >
          <Droplets className="w-3.5 h-3.5 text-cyan-400" />
          <span>WV 6.7µm</span>
        </button>

        <button
          onClick={() => setActiveChannel('mw_89')}
          className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
            activeChannel === 'mw_89'
              ? 'bg-gradient-to-r from-purple-950 to-pink-950 border-purple-500/80 text-purple-300 shadow-md'
              : 'bg-[#121d33] border-[#1e2f52] text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-purple-400" />
          <span>MW 89GHz</span>
        </button>
      </div>

      {/* Main Imagery Canvas Area */}
      <div className="relative flex-1 bg-black rounded-lg overflow-hidden border border-[#1e2f52] flex items-center justify-center group">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full object-contain cursor-crosshair image-rendering-pixelated"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Center Grid Reticle Crosshairs */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
          <div className="w-full h-[1px] bg-cyan-400/50"></div>
          <div className="h-full w-[1px] bg-cyan-400/50 absolute"></div>
          <div className="w-20 h-20 rounded-full border border-cyan-400/40 absolute"></div>
        </div>

        {/* Dynamic Hover Telemetry HUD */}
        {hoverPixelInfo && (
          <div className="absolute top-2 left-2 pointer-events-none bg-[#070b14]/90 border border-cyan-500/50 p-2 rounded text-[11px] font-mono text-cyan-200 shadow-xl backdrop-blur-sm space-y-0.5">
            <div>Grid: ({hoverPixelInfo.x}, {hoverPixelInfo.y})</div>
            <div>Temp: <strong className="text-white">{hoverPixelInfo.tempC}°C</strong> ({hoverPixelInfo.tempK} K)</div>
            {showGradCam && (
              <div className="text-amber-400">Grad-CAM Focus: <strong>{hoverPixelInfo.camAttention}%</strong></div>
            )}
          </div>
        )}

        {/* Top-Right Granule Tag */}
        <div className="absolute top-2 right-2 bg-[#070b14]/80 border border-[#1e2f52] px-2 py-0.5 rounded text-[10px] font-mono text-slate-300">
          1000×1000 km (128²)
        </div>
      </div>

      {/* Footer Controls & Colormap Scale */}
      <div className="mt-3 space-y-2">
        {/* Grad-CAM Blend Slider */}
        {showGradCam && (
          <div className="flex items-center justify-between text-xs font-mono text-slate-300 bg-[#121d33] px-3 py-1.5 rounded-lg border border-[#1e2f52]">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>AI Blend Ratio:</span>
            </span>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={blendFactor}
                onChange={(e) => setBlendFactor(parseFloat(e.target.value))}
                className="w-28 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <span className="font-bold text-amber-300">{Math.round(blendFactor * 100)}%</span>
            </div>
          </div>
        )}

        {/* Radiometric Scale Bar */}
        <div className="space-y-1">
          <div className="h-2 w-full rounded bg-gradient-to-r from-red-600 via-amber-400 via-emerald-400 via-cyan-400 to-blue-700 shadow-inner"></div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>-85°C (Cold Tops)</span>
            <span>-40°C</span>
            <span>0°C</span>
            <span>+30°C (Warm Ocean)</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

