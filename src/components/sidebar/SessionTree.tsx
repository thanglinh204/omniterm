import React, { useState, useMemo } from "react";
import { SessionItem, ProtocolType } from "../../types/session";
import {
  Folder,
  FolderOpen,
  Terminal,
  Monitor,
  FolderSync,
  Radio,
  Search,
  ChevronRight,
  ChevronDown,
  Plus,
  FileUp,
  Server,
} from "lucide-react";

interface SessionTreeProps {
  sessions: SessionItem[];
  onSelectSession: (session: SessionItem) => void;
  onOpenNewSessionModal: () => void;
  onOpenImportModal: () => void;
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: Record<string, TreeNode>;
  session?: SessionItem;
}

export const SessionTree: React.FC<SessionTreeProps> = ({
  sessions,
  onSelectSession,
  onOpenNewSessionModal,
  onOpenImportModal,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  // Build tree from flat sessions list
  const treeRoot = useMemo(() => {
    const root: TreeNode = {
      name: "Root",
      path: "",
      isFolder: true,
      children: {},
    };

    const filtered = searchQuery.trim()
      ? sessions.filter(
          (s) =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.ssh?.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.rdp?.host.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : sessions;

    for (const session of filtered) {
      const parts = session.folderPath ? session.folderPath.split("/").filter(Boolean) : [];
      let current = root;
      let currentPath = "";

      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: currentPath,
            isFolder: true,
            children: {},
          };
        }
        current = current.children[part];
      }

      // Add session leaf
      current.children[`session_${session.id}`] = {
        name: session.name,
        path: currentPath ? `${currentPath}/${session.name}` : session.name,
        isFolder: false,
        children: {},
        session,
      };
    }

    return root;
  }, [sessions, searchQuery]);

  const renderProtocolIcon = (proto: ProtocolType) => {
    switch (proto) {
      case "ssh":
        return <Terminal className="w-4 h-4 text-emerald-400" />;
      case "rdp":
        return <Monitor className="w-4 h-4 text-blue-400" />;
      case "sftp":
        return <FolderSync className="w-4 h-4 text-amber-400" />;
      case "serial":
        return <Radio className="w-4 h-4 text-purple-400" />;
      default:
        return <Server className="w-4 h-4 text-slate-400" />;
    }
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    if (node.isFolder) {
      const isExpanded = !!expandedFolders[node.path] || !!searchQuery.trim();
      const childKeys = Object.keys(node.children);

      return (
        <div key={node.path || "root"}>
          {node.path && (
            <div
              onClick={() => toggleFolder(node.path)}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              className="flex items-center space-x-1.5 py-1 px-2 rounded cursor-pointer hover:bg-[#1e2230] text-slate-300 hover:text-white transition-colors group select-none"
            >
              <span className="text-slate-500 group-hover:text-slate-300">
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </span>
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-amber-400" />
              ) : (
                <Folder className="w-4 h-4 text-amber-500" />
              )}
              <span className="text-xs font-medium truncate flex-1">{node.name}</span>
              <span className="text-[10px] text-slate-500 bg-[#161922] px-1 rounded">
                {childKeys.length}
              </span>
            </div>
          )}

          {(isExpanded || !node.path) && (
            <div>
              {childKeys.map((key) => renderNode(node.children[key], node.path ? depth + 1 : 0))}
            </div>
          )}
        </div>
      );
    }

    // Leaf session
    const session = node.session!;
    return (
      <div
        key={session.id}
        onDoubleClick={() => onSelectSession(session)}
        style={{ paddingLeft: `${depth * 12 + 16}px` }}
        className="flex items-center space-x-2 py-1 px-2 rounded cursor-pointer hover:bg-[#252a3b] text-slate-300 hover:text-white transition-colors group select-none"
      >
        {renderProtocolIcon(session.protocol)}
        <span className="text-xs truncate flex-1 font-mono">{session.name}</span>
        {session.ssh?.host && (
          <span className="text-[10px] text-slate-500 truncate max-w-[90px] font-mono">
            {session.ssh.host}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#161922] border-r border-[#282d3f] select-none">
      {/* Top action header */}
      <div className="flex items-center justify-between p-2.5 border-b border-[#282d3f]">
        <div className="flex items-center space-x-1.5">
          <Server className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            User Sessions
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={onOpenNewSessionModal}
            className="p-1 hover:bg-[#282d3f] rounded text-slate-400 hover:text-white transition-colors"
            title="New Session (Ctrl+N)"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenImportModal}
            className="p-1 hover:bg-[#282d3f] rounded text-slate-400 hover:text-white transition-colors"
            title="Import from MobaXterm"
          >
            <FileUp className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Search box */}
      <div className="p-2 border-b border-[#282d3f]/60">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sessions or IP..."
            className="w-full bg-[#0f1117] text-xs text-slate-200 pl-8 pr-2 py-1.5 rounded border border-[#282d3f] focus:outline-none focus:border-primary transition-colors font-mono"
          />
        </div>
      </div>

      {/* Session Tree View */}
      <div className="flex-1 overflow-y-auto p-1 text-slate-300">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4">
            <Server className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-xs text-slate-400 font-medium">No sessions configured</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Create a new session or import your MobaXterm bookmarks.
            </p>
            <button
              onClick={onOpenImportModal}
              className="mt-3 text-xs bg-primary hover:bg-primary-hover text-white px-3 py-1 rounded shadow transition-colors"
            >
              Import MobaXterm.ini
            </button>
          </div>
        ) : (
          renderNode(treeRoot)
        )}
      </div>

      {/* Bottom stats footer */}
      <div className="p-2 border-t border-[#282d3f] bg-[#12141c] text-[11px] text-slate-500 flex justify-between items-center">
        <span>Total: {sessions.length} sessions</span>
        <button
          onClick={onOpenImportModal}
          className="text-primary hover:underline flex items-center space-x-1"
        >
          <span>Moba Import</span>
        </button>
      </div>
    </div>
  );
};
