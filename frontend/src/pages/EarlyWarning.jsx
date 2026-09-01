import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  FileText, 
  Download, 
  Copy, 
  Check, 
  ShieldAlert, 
  MapPin, 
  Wind, 
  Waves, 
  Building2, 
  Users
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { useDashboard } from '../context/DashboardContext';
import { CategoryBadge } from '../components/ui/Badge';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const EarlyWarning = () => {
  const { selectedStormId } = useDashboard();
  const [bulletin, setBulletin] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchBulletin = async (stormId) => {
    try {
      setIsLoading(true);
      const resp = await fetch(`${API_BASE}/api/bulletin/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storm_id: stormId || 'IO022026_BIPARJOY',
          bulletin_number: 14
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        setBulletin(data);
      }
    } catch (err) {
      console.error('Failed to generate bulletin:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBulletin(selectedStormId);
  }, [selectedStormId]);

  const handleCopy = () => {
    if (bulletin?.formatted_text) {
      navigator.clipboard.writeText(bulletin.formatted_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!bulletin) return;
    const element = document.createElement('a');
    const file = new Blob([bulletin.formatted_text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `CYCLONE_ADVISORY_${bulletin.storm_name}_BULLETIN_${bulletin.bulletin_number}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto animate-fade-in font-sans">
      {/* Page Header */}
      <div className="bg-[#0d1527] border border-[#1e2f52] p-4 rounded-xl flex items-center justify-between shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-rose-600 to-amber-500 text-white rounded-xl shadow-lg shadow-rose-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              DISASTER EARLY WARNING & COASTAL RISK ADVISORY
              <span className="text-[10px] font-mono bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-800/50">
                WMO / RSMC STANDARD
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Automated meteorological advisory bulletin generation, storm surge calculations, and coastal impact assessment.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#121d33] border border-[#1e2f52] hover:border-cyan-500 text-slate-300 hover:text-white rounded-lg text-xs font-mono font-medium transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Text'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-mono font-semibold transition-all shadow-md shadow-cyan-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Advisory (.txt)</span>
          </button>
        </div>
      </div>

      {/* Grid: Hazard Metrics vs Bulletin */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Coastal Hazard Risk Cards */}
        <div className="lg:col-span-5 space-y-4">
          <Card title="Coastal Hazard & Evacuation Risk Index" icon={AlertTriangle}>
            <div className="space-y-3 font-mono text-xs">
              {/* Alert Level Pill */}
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-600/50 text-rose-200">
                <span className="text-[10px] text-rose-400 block font-bold">CURRENT STATUS</span>
                <div className="text-sm font-extrabold">{bulletin?.alert_level || 'RED ALERT'}</div>
                <p className="text-[11px] font-sans text-rose-300 mt-1">{bulletin?.urgency_directive}</p>
              </div>

              {/* Physical Impact Estimates */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-[#070b14] border border-[#1e2f52] p-3 rounded-xl">
                  <Waves className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-400 block">Peak Storm Surge</span>
                  <strong className="text-cyan-300 text-sm">
                    {bulletin?.telemetry.expected_storm_surge_meters || 3.5} m
                  </strong>
                </div>

                <div className="bg-[#070b14] border border-[#1e2f52] p-3 rounded-xl">
                  <Wind className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-400 block">Gale-Force Wind Extent</span>
                  <strong className="text-amber-300 text-sm">
                    {bulletin?.telemetry.gale_radius_km || 180} km
                  </strong>
                </div>
              </div>

              {/* Vulnerable Sector Matrix */}
              <div className="bg-[#070b14] border border-[#1e2f52] p-3 rounded-xl space-y-2">
                <span className="text-slate-400 block font-bold text-[11px]">COASTAL INFRASTRUCTURE EXPOSURE</span>
                <div className="space-y-1.5 text-[11px] font-sans text-slate-300">
                  <div className="flex justify-between">
                    <span>• Maritime Ports & Harbors:</span>
                    <strong className="text-rose-400 font-mono">Suspended (Level 8)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• Offshore Oil & Gas Platforms:</span>
                    <strong className="text-amber-400 font-mono">Secure Standby</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• Coastal Power Lines & Telecom:</span>
                    <strong className="text-rose-400 font-mono">High Risk of Damage</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• Agricultural Inundation:</span>
                    <strong className="text-amber-400 font-mono">High Saltwater Threat</strong>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Formatted Meteorological Advisory Bulletin */}
        <div className="lg:col-span-7">
          <Card title="Official Meteorological Advisory Bulletin" icon={FileText} className="h-full">
            <div className="flex-1 bg-[#050811] border border-[#142038] rounded-xl p-4 overflow-x-auto font-mono text-[11px] leading-relaxed text-slate-200 shadow-inner">
              {isLoading ? (
                <div className="py-24 text-center text-slate-500">Generating Official Warning Bulletin...</div>
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-cyan-200">
                  {bulletin?.formatted_text}
                </pre>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

