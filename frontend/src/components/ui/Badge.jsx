import React from 'react';

export const CategoryBadge = ({ category, className = '' }) => {
  const getColors = (cat) => {
    switch (cat) {
      case 'Super Cyclonic Storm':
        return 'bg-purple-950 text-purple-300 border-purple-500/50 shadow-purple-500/20';
      case 'Extremely Severe Cyclonic Storm':
        return 'bg-rose-950 text-rose-300 border-rose-500/50 shadow-rose-500/20';
      case 'Very Severe Cyclonic Storm':
        return 'bg-red-950 text-red-300 border-red-500/50 shadow-red-500/20';
      case 'Cyclonic Storm':
        return 'bg-amber-950 text-amber-300 border-amber-500/50 shadow-amber-500/20';
      case 'Deep Depression':
        return 'bg-cyan-950 text-cyan-300 border-cyan-500/50 shadow-cyan-500/20';
      default:
        return 'bg-blue-950 text-blue-300 border-blue-500/50 shadow-blue-500/20';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border shadow-sm ${getColors(category)} ${className}`}>
      {category || 'Depression'}
    </span>
  );
};

export const PatternBadge = ({ pattern }) => {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-800 text-cyan-400 border border-cyan-500/30">
      {pattern || 'Unknown'}
    </span>
  );
};

