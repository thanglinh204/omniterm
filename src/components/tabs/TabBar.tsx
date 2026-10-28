import React from "react";
import { TerminalTab, SplitLayout } from "../../types/session";
import {
  X,
  Plus,
  Terminal,
  Monitor,
  FolderSync,
  Columns2,
  Rows2,
  Square,
  Radio,
  Layers,
  LayoutGrid,
} from "lucide-react";

interface TabBarProps {
  tabs: TerminalTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewLocalTab: () => void;
  splitLayout: SplitLayout;
  onChangeSplitLayout: (layout: SplitLayout) => void;
  multiExecActive: boolean;
  onToggleMultiExec: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewLocalTab,
  splitLayout,
  onChangeSplitLayout,
  multiExecActive,
  onToggleMultiExec,
}) => {
  const renderProtocolIcon = (proto: string) => {
    switch (proto) {
      case "ssh":
        return <Terminal className="w-3.5 h-3.5 text-emerald-400" />;
      case "rdp":
        return <Monitor className="w-3.5 h-3.5 text-blue-400" />;
      case "sftp":
        return <FolderSync className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="flex items-center justify-between bg-[#12141c] border-b border-[#282d3f] px-2 h-9 select-none overflow-x-auto no-scrollbar">
      {/* Tabs list */}
      <div className="flex items-center space-x-1 flex-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs rounded-t-md cursor-pointer border-t-2 transition-all max-w-[200px] min-w-[120px] ${
                isActive
                  ? "bg-[#0c0e14] text-white border-primary font-medium shadow"
                  : "bg-[#181b26] text-slate-400 hover:text-slate-200 hover:bg-[#1e2230] border-transparent"
              }`}
            >
              {renderProtocolIcon(tab.protocol)}
              <span className="truncate flex-1 font-mono text-[11px]">{tab.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className="p-0.5 rounded-full hover:bg-slate-700/60 text-slate-500 hover:text-slate-200 transition-colors"
                title="Close Tab (Ctrl+W)"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* Plus button to open local shell */}
        <button
          onClick={onNewLocalTab}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1e2230] rounded transition-colors ml-1"
          title="New Local Terminal (Ctrl+T)"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Right control buttons: Split Panes & Multi-Exec */}
      <div className="flex items-center space-x-1 pl-2 border-l border-[#282d3f]">
        {/* Multi-Exec Button (MobaXterm killer feature) */}
        <button
          onClick={onToggleMultiExec}
          className={`flex items-center space-x-1 px-2 py-1 rounded text-[11px] transition-colors ${
            multiExecActive
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#1e2230]"
          }`}
          title="Multi-Execution Mode: Broadcast keystrokes to all open tabs"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-medium">Multi-Exec</span>
        </button>

        {/* Split Layout Controls */}
        <div className="flex items-center bg-[#181b26] rounded border border-[#282d3f] p-0.5">
          <button
            onClick={() => onChangeSplitLayout("single")}
            className={`p-1 rounded ${
              splitLayout === "single" ? "bg-[#282d3f] text-white" : "text-slate-400 hover:text-white"
            }`}
            title="Single Screen"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={() => onChangeSplitLayout("split-vertical")}
            className={`p-1 rounded ${
              splitLayout === "split-vertical"
                ? "bg-[#282d3f] text-white"
                : "text-slate-400 hover:text-white"
            }`}
            title="Split Vertically (2 columns)"
          >
            <Columns2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => onChangeSplitLayout("split-horizontal")}
            className={`p-1 rounded ${
              splitLayout === "split-horizontal"
                ? "bg-[#282d3f] text-white"
                : "text-slate-400 hover:text-white"
            }`}
            title="Split Horizontally (2 rows)"
          >
            <Rows2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => onChangeSplitLayout("grid-4")}
            className={`p-1 rounded ${
              splitLayout === "grid-4"
                ? "bg-[#282d3f] text-white"
                : "text-slate-400 hover:text-white"
            }`}
            title="Quad Grid (4 panes)"
          >
            <LayoutGrid className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
