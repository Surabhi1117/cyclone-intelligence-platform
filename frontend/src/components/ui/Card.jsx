import React from 'react';

export const Card = ({ children, className = '', title, headerAction, icon: Icon }) => {
  return (
    <div className={`bg-[#0d1527] border border-[#1e2f52] rounded-xl shadow-xl backdrop-blur-sm overflow-hidden flex flex-col transition-all duration-200 hover:border-cyan-500/30 ${className}`}>
      {title && (
        <div className="px-4 py-3 border-b border-[#1e2f52] flex items-center justify-between bg-[#121d33]/80">
          <div className="flex items-center space-x-2.5">
            {Icon && <Icon className="w-4 h-4 text-cyan-400" />}
            <h3 className="font-semibold text-sm tracking-wide text-slate-100 uppercase">{title}</h3>
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-4 flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
};

