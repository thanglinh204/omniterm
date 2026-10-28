import React from "react";
import {
  Terminal,
  Server,
  FolderSync,
  Palette,
  Search,
  ShieldCheck,
  Layout,
  ExternalLink,
} from "lucide-react";
import { TERMINAL_THEMES } from "../../styles/terminalThemes";

interface TitleBarProps {
  showSidebar: boolean;
  onToggleSidebar: () => void;
  showSftp: boolean;
  onToggleSftp: () => void;
  activeThemeId: string;
  onSelectTheme: (themeId: string) => void;
  onQuickConnect: (hostStr: string) => void;
  currentView?: "workspace" | "bastion";
  onSwitchView?: (view: "workspace" | "bastion") => void;
  activeUserLabel?: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  showSidebar,
  onToggleSidebar,
  showSftp,
  onToggleSftp,
  activeThemeId,
  onSelectTheme,
  onQuickConnect,
  currentView = "workspace",
  onSwitchView,
  activeUserLabel,
}) => {
  const [quickInput, setQuickInput] = React.useState("");

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickInput.trim()) {
      onQuickConnect(quickInput.trim());
      setQuickInput("");
    }
  };

  return (
    <div className="flex items-center justify-between h-10 bg-[#12141c] border-b border-[#282d3f] px-3 select-none text-slate-200">
      {/* Brand & Sidebar Toggles */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="bg-primary/20 p-1 rounded border border-primary/40">
            <Terminal className="w-4 h-4 text-primary-light" />
          </div>
          <span className="font-bold text-sm text-slate-100 tracking-tight">
            Omni<span className="text-primary-light">Term</span>
          </span>
          <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">
            PRO V0.1
          </span>
        </div>

        <div className="h-4 w-[1px] bg-[#282d3f]" />

        {/* View Switcher: Workspace vs Bastion Console */}
        {onSwitchView && (
          <div className="flex items-center bg-[#181b26] p-0.5 rounded border border-[#282d3f]">
            <button
              onClick={() => onSwitchView("workspace")}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                currentView === "workspace"
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="MobaXterm Pro Terminal Workspace"
            >
              <Layout className="w-3.5 h-3.5" />
              <span>Workspace</span>
            </button>
            <button
              onClick={() => onSwitchView("bastion")}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                currentView === "bastion"
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Enterprise Bastion PAM & Access Governance Console"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Bastion Console</span>
            </button>
          </div>
        )}

        <div className="h-4 w-[1px] bg-[#282d3f]" />

        {currentView === "workspace" && (
          <div className="flex items-center space-x-1">
            <button
              onClick={onToggleSidebar}
              className={`p-1.5 rounded transition-colors text-xs flex items-center space-x-1 ${
                showSidebar ? "bg-[#1f2434] text-white" : "text-slate-400 hover:text-white"
              }`}
              title="Toggle Sessions Sidebar"
            >
              <Server className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium hidden md:inline">Sessions</span>
            </button>

            <button
              onClick={onToggleSftp}
              className={`p-1.5 rounded transition-colors text-xs flex items-center space-x-1 ${
                showSftp ? "bg-[#1f2434] text-white" : "text-slate-400 hover:text-white"
              }`}
              title="Toggle SFTP File Browser"
            >
              <FolderSync className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium hidden md:inline">SFTP</span>
            </button>
          </div>
        )}
      </div>

      {/* Quick SSH Connect Box */}
      {currentView === "workspace" && (
        <form onSubmit={handleQuickSubmit} className="hidden sm:flex items-center max-w-sm flex-1 mx-4">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Quick connect: root@103.154.62.xxx or port..."
              className="w-full bg-[#0a0c10] text-xs text-slate-200 pl-8 pr-2 py-1 rounded border border-[#282d3f] focus:outline-none focus:border-primary font-mono placeholder:text-slate-500"
            />
          </div>
        </form>
      )}

      {/* Right side: User identity badge, Theme selector & Settings */}
      <div className="flex items-center space-x-2.5">
        {activeUserLabel && (
          <div className="hidden md:flex items-center space-x-1.5 text-xs bg-[#181b26] border border-[#282d3f] px-2 py-0.5 rounded text-slate-300">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium">{activeUserLabel}</span>
          </div>
        )}

        <div className="flex items-center space-x-1 text-slate-400">
          <Palette className="w-3.5 h-3.5" />
          <select
            value={activeThemeId}
            onChange={(e) => onSelectTheme(e.target.value)}
            className="bg-[#181b26] text-[11px] text-slate-300 border border-[#282d3f] rounded px-1.5 py-1 focus:outline-none focus:border-primary cursor-pointer"
          >
            {Object.values(TERMINAL_THEMES).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
