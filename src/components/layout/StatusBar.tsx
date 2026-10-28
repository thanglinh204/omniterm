import React from "react";
import { TerminalTab } from "../../types/session";
import { ShieldAlert } from "lucide-react";

interface StatusBarProps {
  activeTab?: TerminalTab;
  multiExecActive: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ activeTab, multiExecActive }) => {
  return (
    <div className="flex items-center justify-between h-6 bg-[#0c0e14] border-t border-[#282d3f] px-3 text-[11px] text-slate-400 select-none">
      {/* Left status: Connection info */}
      <div className="flex items-center space-x-3">
        {activeTab ? (
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-amber-400">Demo — not connected</span>
            <span className="font-mono text-slate-300">{activeTab.title}</span>
            <span className="text-slate-600">|</span>
            <span className="uppercase text-[10px] text-slate-400 font-semibold">
              {activeTab.protocol}
            </span>
          </div>
        ) : (
          <span className="text-slate-500">No active connection</span>
        )}

        {multiExecActive && (
          <div className="flex items-center space-x-1 text-amber-400 font-medium bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>MULTI-EXEC PREVIEW ONLY</span>
          </div>
        )}
      </div>

      {/* Right status: Environment info */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1 text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>No credential vault configured</span>
        </div>
        <span>UTF-8</span>
        <span className="font-mono text-slate-500">80x24</span>
      </div>
    </div>
  );
};
