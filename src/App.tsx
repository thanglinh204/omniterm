import React, { useState, useEffect, useCallback } from "react";
import { TitleBar } from "./components/layout/TitleBar";
import { StatusBar } from "./components/layout/StatusBar";
import { SessionTree } from "./components/sidebar/SessionTree";
import { SftpExplorer } from "./components/sidebar/SftpExplorer";
import { TabBar } from "./components/tabs/TabBar";
import { TerminalView } from "./components/terminal/TerminalView";
import { NewSessionModal } from "./components/dialogs/NewSessionModal";
import { MobaImportModal } from "./components/dialogs/MobaImportModal";
import DemoApp from "./demo/DemoApp";
import { SessionItem, TerminalTab, SplitLayout } from "./types/session";
import { Resource } from "./demo/data";

const INITIAL_SESSIONS: SessionItem[] = [
  {
    id: "local_pwsh",
    name: "PowerShell Core",
    protocol: "local",
    folderPath: "Local Terminals",
    createdAt: Date.now(),
    local: { shellType: "powershell" },
  },
  {
    id: "local_wsl",
    name: "Ubuntu (WSL2)",
    protocol: "local",
    folderPath: "Local Terminals",
    createdAt: Date.now(),
    local: { shellType: "wsl" },
  },
  {
    id: "bastion_atlas_web",
    name: "Atlas / web-app-01",
    protocol: "ssh",
    folderPath: "Enterprise Bastion/Atlas Cloud",
    createdAt: Date.now(),
    ssh: {
      host: "198.51.100.10",
      port: 22,
      username: "deploy",
      authMethod: "password",
    },
  },
  {
    id: "bastion_atlas_db",
    name: "Atlas / db-cluster-01",
    protocol: "ssh",
    folderPath: "Enterprise Bastion/Atlas Cloud",
    createdAt: Date.now(),
    ssh: {
      host: "198.51.100.20",
      port: 22,
      username: "postgres",
      authMethod: "password",
    },
  },
  {
    id: "bastion_harbor_app",
    name: "Harbor / harbor-api-01",
    protocol: "ssh",
    folderPath: "Enterprise Bastion/Harbor Lab",
    createdAt: Date.now(),
    ssh: {
      host: "203.0.113.15",
      port: 22,
      username: "appadmin",
      authMethod: "password",
    },
  },
];

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<"workspace" | "bastion">("workspace");
  const [activeUserLabel, setActiveUserLabel] = useState<string>("Admin Demo (Atlas Cloud)");

  const [sessions, setSessions] = useState<SessionItem[]>(() => {
    try {
      const saved = localStorage.getItem("omniterm_sessions");
      return saved ? JSON.parse(saved) : INITIAL_SESSIONS;
    } catch {
      return INITIAL_SESSIONS;
    }
  });

  const [tabs, setTabs] = useState<TerminalTab[]>([
    {
      id: "tab_default_1",
      title: "Local Shell (PowerShell)",
      protocol: "local",
      isConnected: true,
      hostInfo: "localhost",
      currentRemotePath: "/root",
    },
  ]);

  const [activeTabId, setActiveTabId] = useState<string>("tab_default_1");
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [showSftp, setShowSftp] = useState<boolean>(true);
  const [splitLayout, setSplitLayout] = useState<SplitLayout>("single");
  const [multiExecActive, setMultiExecActive] = useState<boolean>(false);
  const [activeThemeId, setActiveThemeId] = useState<string>("omni-dark");
  const [currentSftpPath, setCurrentSftpPath] = useState<string>("/root");

  // Multi-Exec broadcasting state
  const [broadcastData, setBroadcastData] = useState<{
    timestamp: number;
    data: string;
    senderTabId: string;
  } | null>(null);

  const [isNewSessionOpen, setIsNewSessionOpen] = useState<boolean>(false);
  const [isMobaImportOpen, setIsMobaImportOpen] = useState<boolean>(false);

  // Save sessions to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem("omniterm_sessions", JSON.stringify(sessions));
    } catch (e) {
      console.error("Failed to save sessions", e);
    }
  }, [sessions]);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handleSelectSession = (session: SessionItem) => {
    const newTabId = `tab_${Date.now()}`;
    const newTab: TerminalTab = {
      id: newTabId,
      sessionId: session.id,
      title: session.name,
      protocol: session.protocol,
      isConnected: true,
      hostInfo: session.ssh?.host || session.rdp?.host || "localhost",
      currentRemotePath: "/root",
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);

    // If SSH session, enable SFTP toggle for convenience
    if (session.protocol === "ssh" || session.protocol === "sftp") {
      setShowSftp(true);
    }
  };

  const handleNewLocalTab = () => {
    const newTabId = `tab_${Date.now()}`;
    const newTab: TerminalTab = {
      id: newTabId,
      title: `Local Shell #${tabs.length + 1}`,
      protocol: "local",
      isConnected: true,
      hostInfo: "localhost",
      currentRemotePath: "/root",
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);
  };

  const handleCloseTab = (id: string) => {
    if (tabs.length === 1) return; // Keep at least one tab
    const nextTabs = tabs.filter((t) => t.id !== id);
    setTabs(nextTabs);
    if (activeTabId === id) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id);
    }
  };

  const handleSaveNewSession = (session: SessionItem) => {
    setSessions((prev) => [session, ...prev]);
    handleSelectSession(session);
  };

  const handleImportComplete = (importedSessions: SessionItem[]) => {
    setSessions((prev) => {
      const existingIds = new Set(prev.map((s) => s.id));
      const newlyAdded = importedSessions.filter((s) => !existingIds.has(s.id));
      return [...newlyAdded, ...prev];
    });
  };

  const handleQuickConnect = (hostStr: string) => {
    let user = "root";
    let host = hostStr;
    let port = 22;

    if (hostStr.includes("@")) {
      const parts = hostStr.split("@");
      user = parts[0];
      host = parts[1];
    }
    if (host.includes(":")) {
      const parts = host.split(":");
      host = parts[0];
      port = parseInt(parts[1], 10) || 22;
    }

    const quickSession: SessionItem = {
      id: `quick_${Date.now()}`,
      name: `${host} (${user})`,
      protocol: "ssh",
      folderPath: "Quick Connections",
      createdAt: Date.now(),
      ssh: {
        host,
        port,
        username: user,
        authMethod: "password",
      },
    };

    setSessions((prev) => [quickSession, ...prev]);
    handleSelectSession(quickSession);
  };

  const handleBroadcast = useCallback(
    (data: string, senderTabId: string) => {
      if (!multiExecActive) return;
      setBroadcastData({
        timestamp: Date.now(),
        data,
        senderTabId,
      });
    },
    [multiExecActive]
  );

  const handleDirectoryChange = (tabId: string, newPath: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, currentRemotePath: newPath } : t))
    );
    if (tabId === activeTabId) {
      setCurrentSftpPath(newPath);
    }
  };

  const handleOpenBastionResource = (resource: Resource) => {
    const newTabId = `bastion_tab_${Date.now()}`;
    const newTab: TerminalTab = {
      id: newTabId,
      sessionId: resource.id,
      title: `${resource.name} (${resource.protocol})`,
      protocol: resource.protocol === "RDP" ? "rdp" : resource.protocol === "Telnet" ? "telnet" : "ssh",
      isConnected: true,
      hostInfo: `${resource.host}:${resource.port}`,
      currentRemotePath: "/root",
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);
    setCurrentView("workspace");
  };

  // Extract all unique folder paths for autocomplete
  const folderList = Array.from(
    new Set(sessions.map((s) => s.folderPath).filter(Boolean))
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f1117] text-slate-100 overflow-hidden font-sans">
      {/* 1. Header Title Bar */}
      <TitleBar
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar((s) => !s)}
        showSftp={showSftp}
        onToggleSftp={() => setShowSftp((s) => !s)}
        activeThemeId={activeThemeId}
        onSelectTheme={setActiveThemeId}
        onQuickConnect={handleQuickConnect}
        currentView={currentView}
        onSwitchView={setCurrentView}
        activeUserLabel={activeUserLabel}
      />

      {/* 2. Main Body: Switch between Bastion Console and MobaXterm Pro Workspace */}
      {currentView === "bastion" ? (
        <div className="flex-1 overflow-auto bg-[#0a0c10]">
          <DemoApp
            onOpenInWorkspace={handleOpenBastionResource}
            onActiveUserChange={(name, role) => {
              if (name) setActiveUserLabel(`${name} (${role})`);
            }}
          />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden relative">
          {/* Left Sidebar: Session Tree */}
          {showSidebar && (
            <div className="w-64 shrink-0 h-full border-r border-[#282d3f] animate-in slide-in-from-left-4 duration-150">
              <SessionTree
                sessions={sessions}
                onSelectSession={handleSelectSession}
                onOpenNewSessionModal={() => setIsNewSessionOpen(true)}
                onOpenImportModal={() => setIsMobaImportOpen(true)}
              />
            </div>
          )}

          {/* Left-Middle Sidebar: SFTP Explorer (MobaXterm style) */}
          {showSftp && (
            <div className="w-64 shrink-0 h-full border-r border-[#282d3f] animate-in slide-in-from-left-4 duration-150">
              <SftpExplorer
                currentPath={currentSftpPath}
                onNavigate={(path) => setCurrentSftpPath(path)}
              />
            </div>
          )}

          {/* Right Main Area: Tabs + Terminals */}
          <div className="flex flex-col flex-1 h-full overflow-hidden">
            {/* Multi-Exec Warning Banner */}
            {multiExecActive && (
              <div className="bg-amber-950/80 border-b border-amber-500/40 px-3 py-1 text-xs text-amber-200 flex items-center justify-between font-mono animate-pulse">
                <span>⚠️ MULTI-EXECUTION ACTIVE: Keystrokes are being broadcast to all visible terminals!</span>
                <button
                  onClick={() => setMultiExecActive(false)}
                  className="text-amber-400 hover:text-white underline text-[11px]"
                >
                  Disable
                </button>
              </div>
            )}

            {/* Tab Bar */}
            <TabBar
              tabs={tabs}
              activeTabId={activeTabId}
              onSelectTab={setActiveTabId}
              onCloseTab={handleCloseTab}
              onNewLocalTab={handleNewLocalTab}
              splitLayout={splitLayout}
              onChangeSplitLayout={setSplitLayout}
              multiExecActive={multiExecActive}
              onToggleMultiExec={() => setMultiExecActive((m) => !m)}
            />

            {/* Terminal Screen Container */}
            <div className="flex-1 h-full w-full overflow-hidden relative bg-[#0c0e14]">
              {/* Single Layout */}
              {splitLayout === "single" && activeTab && (
                <TerminalView
                  key={activeTab.id}
                  tab={activeTab}
                  activeThemeId={activeThemeId}
                  multiExecActive={multiExecActive}
                  onBroadcastInput={(d) => handleBroadcast(d, activeTab.id)}
                  broadcastData={broadcastData}
                  onDirectoryChange={(p) => handleDirectoryChange(activeTab.id, p)}
                />
              )}

              {/* Split Vertical Layout (2 columns) */}
              {splitLayout === "split-vertical" && (
                <div className="flex h-full w-full divide-x divide-[#282d3f]">
                  {tabs.slice(0, 2).map((tab) => (
                    <div
                      key={tab.id}
                      onClick={() => setActiveTabId(tab.id)}
                      className={`flex-1 h-full overflow-hidden relative ${
                        tab.id === activeTabId ? "ring-1 ring-primary/60" : ""
                      }`}
                    >
                      <TerminalView
                        tab={tab}
                        activeThemeId={activeThemeId}
                        multiExecActive={multiExecActive}
                        onBroadcastInput={(d) => handleBroadcast(d, tab.id)}
                        broadcastData={broadcastData}
                        onDirectoryChange={(p) => handleDirectoryChange(tab.id, p)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Split Horizontal Layout (2 rows) */}
              {splitLayout === "split-horizontal" && (
                <div className="flex flex-col h-full w-full divide-y divide-[#282d3f]">
                  {tabs.slice(0, 2).map((tab) => (
                    <div
                      key={tab.id}
                      onClick={() => setActiveTabId(tab.id)}
                      className={`flex-1 h-full overflow-hidden relative ${
                        tab.id === activeTabId ? "ring-1 ring-primary/60" : ""
                      }`}
                    >
                      <TerminalView
                        tab={tab}
                        activeThemeId={activeThemeId}
                        multiExecActive={multiExecActive}
                        onBroadcastInput={(d) => handleBroadcast(d, tab.id)}
                        broadcastData={broadcastData}
                        onDirectoryChange={(p) => handleDirectoryChange(tab.id, p)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Quad 2x2 Grid Layout */}
              {splitLayout === "grid-4" && (
                <div className="grid grid-cols-2 grid-rows-2 h-full w-full divide-x divide-y divide-[#282d3f]">
                  {(tabs.length >= 4 ? tabs.slice(0, 4) : [
                    ...tabs,
                    ...Array.from({ length: 4 - tabs.length }).map((_, i) => ({
                      id: `tab_filler_${i}`,
                      title: `Split Pane #${tabs.length + i + 1}`,
                      protocol: "local" as const,
                      isConnected: true,
                      hostInfo: "localhost",
                    })),
                  ]).map((tab) => (
                    <div
                      key={tab.id}
                      onClick={() => setActiveTabId(tab.id)}
                      className={`h-full w-full overflow-hidden relative ${
                        tab.id === activeTabId ? "ring-1 ring-primary/60" : ""
                      }`}
                    >
                      <TerminalView
                        tab={tab}
                        activeThemeId={activeThemeId}
                        multiExecActive={multiExecActive}
                        onBroadcastInput={(d) => handleBroadcast(d, tab.id)}
                        broadcastData={broadcastData}
                        onDirectoryChange={(p) => handleDirectoryChange(tab.id, p)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Bottom Status Bar */}
      <StatusBar activeTab={activeTab} multiExecActive={multiExecActive} />

      {/* 4. Modals */}
      <NewSessionModal
        isOpen={isNewSessionOpen}
        onClose={() => setIsNewSessionOpen(false)}
        onSaveSession={handleSaveNewSession}
        folders={folderList}
      />

      <MobaImportModal
        isOpen={isMobaImportOpen}
        onClose={() => setIsMobaImportOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
};

export default App;
