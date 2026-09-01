import React, { useState } from 'react';
import { 
  ScrollText, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Filter, 
  Search, 
  Pause, 
  Play,
  Hash,
  Clock
} from 'lucide-react';
import { Card } from '../ui/Card';

export const IngestionLog = ({ logs, isLoading }) => {
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  const filteredLogs = (logs || []).filter((log) => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const msgMatch = log.message?.toLowerCase().includes(q);
      const eventMatch = log.event_type?.toLowerCase().includes(q);
      return msgMatch || eventMatch;
    }
    return true;
  });

  const getLevelBadge = (level) => {
    switch (level) {
      case 'SUCCESS':
        return <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50"><CheckCircle2 className="w-3 h-3" /> OK</span>;
      case 'WARNING':
        return <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800/50"><AlertCircle className="w-3 h-3" /> WARN</span>;
      case 'ERROR':
        return <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800/50">ERR</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50"><Info className="w-3 h-3" /> INFO</span>;
    }
  };

  return (
    <Card
      title="Continuous Ingestion & Audit Stream"
      icon={ScrollText}
      className="h-[300px]"
      headerAction={
        <div className="flex items-center space-x-2">
          {/* Level Filter */}
          <div className="flex items-center space-x-1 bg-[#070b14] border border-[#1e2f52] rounded-lg px-2 py-0.5 text-xs font-mono">
            <Filter className="w-3 h-3 text-slate-400" />
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="bg-transparent text-slate-300 focus:outline-none cursor-pointer text-[11px]"
            >
              <option value="ALL" className="bg-[#0d1527]">All Events</option>
              <option value="SUCCESS" className="bg-[#0d1527]">Inference Success</option>
              <option value="WARNING" className="bg-[#0d1527]">Alerts</option>
              <option value="INFO" className="bg-[#0d1527]">Granules</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative hidden sm:block">
            <input
              type="text"
              placeholder="Filter audit logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#070b14] border border-[#1e2f52] rounded-lg pl-6 pr-2 py-0.5 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-cyan-500 w-36"
            />
            <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1.5" />
          </div>

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-1 rounded border text-xs ${
              isPaused 
                ? 'bg-amber-950 border-amber-600 text-amber-300' 
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title={isPaused ? 'Resume live autoscroll' : 'Pause log stream'}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No audit events recorded matching current filter.
          </div>
        ) : (
          filteredLogs.map((log, idx) => (
            <div
              key={log.id || idx}
              className="p-2 rounded bg-[#070b14] border border-[#142038] hover:border-[#1e2f52] transition-colors flex flex-wrap items-center justify-between gap-2"
            >
              <div className="flex items-center space-x-2.5 flex-1 min-w-[240px]">
                {getLevelBadge(log.level)}
                <span className="text-slate-500 text-[10px] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-slate-200 text-[11px] font-medium">{log.message}</span>
              </div>

              {/* Ingestion & Performance Metadata */}
              <div className="flex items-center space-x-3 text-[10px] text-slate-400">
                {log.details?.turnaround_ms && (
                  <span className="text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                    ⏱ {log.details.turnaround_ms} ms
                  </span>
                )}
                {log.details?.file_hash && (
                  <span className="text-slate-500 flex items-center gap-0.5">
                    <Hash className="w-2.5 h-2.5" />
                    {log.details.file_hash.substring(0, 10)}...
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

