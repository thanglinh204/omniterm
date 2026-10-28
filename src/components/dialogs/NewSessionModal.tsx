import React, { useState } from "react";
import { SessionItem, ProtocolType } from "../../types/session";
import { X, Terminal, Monitor, FolderSync, Radio, Key, Server, Folder } from "lucide-react";

interface NewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSession: (session: SessionItem) => void;
  folders: string[];
}

export const NewSessionModal: React.FC<NewSessionModalProps> = ({
  isOpen,
  onClose,
  onSaveSession,
  folders,
}) => {
  const [activeTab, setActiveTab] = useState<ProtocolType>("ssh");

  // Common fields
  const [name, setName] = useState("");
  const [folderPath, setFolderPath] = useState("");

  // SSH fields
  const [sshHost, setSshHost] = useState("");
  const [sshPort, setSshPort] = useState(22);
  const [sshUser, setSshUser] = useState("root");
  const [sshAuthMethod, setSshAuthMethod] = useState<"password" | "key">("password");
  const [sshKeyPath, setSshKeyPath] = useState("");
  const [sshJumpHost, setSshJumpHost] = useState("");

  // Local fields
  const [shellType, setShellType] = useState<"powershell" | "cmd" | "wsl" | "bash">("powershell");

  // RDP fields
  const [rdpHost, setRdpHost] = useState("");
  const [rdpPort, setRdpPort] = useState(3389);
  const [rdpUser, setRdpUser] = useState("Administrator");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const sessionName = name.trim() || (activeTab === "ssh" ? `${sshHost} (${sshUser})` : "New Session");

    const newSession: SessionItem = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: sessionName,
      protocol: activeTab,
      folderPath: folderPath.trim(),
      createdAt: Date.now(),
    };

    if (activeTab === "ssh") {
      newSession.ssh = {
        host: sshHost.trim(),
        port: Number(sshPort) || 22,
        username: sshUser.trim() || "root",
        authMethod: sshAuthMethod,
        keyPath: sshAuthMethod === "key" ? sshKeyPath.trim() : undefined,
        jumpHost: sshJumpHost.trim() || undefined,
        x11Forwarding: true,
      };
    } else if (activeTab === "local") {
      newSession.local = {
        shellType,
      };
    } else if (activeTab === "rdp") {
      newSession.rdp = {
        host: rdpHost.trim(),
        port: Number(rdpPort) || 3389,
        username: rdpUser.trim() || "Administrator",
      };
    }

    onSaveSession(newSession);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#181b26] border border-[#282d3f] rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#282d3f] bg-[#12141c]">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-slate-100">Session Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#282d3f] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Protocol Selector Tabs */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-[#12141c]/60 border-b border-[#282d3f]">
          <button
            type="button"
            onClick={() => setActiveTab("ssh")}
            className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded text-xs font-medium transition-colors ${
              activeTab === "ssh"
                ? "bg-primary text-white shadow"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#282d3f]"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>SSH</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("local")}
            className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded text-xs font-medium transition-colors ${
              activeTab === "local"
                ? "bg-primary text-white shadow"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#282d3f]"
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Shell</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rdp")}
            className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded text-xs font-medium transition-colors ${
              activeTab === "rdp"
                ? "bg-primary text-white shadow"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#282d3f]"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>RDP</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sftp")}
            className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded text-xs font-medium transition-colors ${
              activeTab === "sftp"
                ? "bg-primary text-white shadow"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#282d3f]"
            }`}
          >
            <FolderSync className="w-3.5 h-3.5" />
            <span>SFTP</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Session Name & Folder */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Session Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production Web01"
                className="w-full bg-[#0f1117] text-xs text-slate-200 px-3 py-1.5 rounded border border-[#282d3f] focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Folder / Group</label>
              <input
                type="text"
                list="folder-options"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="e.g. 1-SunCloud/Servers"
                className="w-full bg-[#0f1117] text-xs text-slate-200 px-3 py-1.5 rounded border border-[#282d3f] focus:outline-none focus:border-primary"
              />
              <datalist id="folder-options">
                {folders.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>
          </div>

          {/* SSH Configuration */}
          {activeTab === "ssh" && (
            <div className="space-y-3 pt-2 border-t border-[#282d3f]">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Remote Host / IP *
                  </label>
                  <input
                    type="text"
                    required
                    value={sshHost}
                    onChange={(e) => setSshHost(e.target.value)}
                    placeholder="103.154.62.xxx or domain.com"
                    className="w-full bg-[#0f1117] text-xs text-slate-200 px-3 py-1.5 rounded border border-[#282d3f] focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Port</label>
                  <input
                    type="number"
                    value={sshPort}
                    onChange={(e) => setSshPort(parseInt(e.target.value, 10))}
                    className="w-full bg-[#0f1117] text-xs text-slate-200 px-3 py-1.5 rounded border border-[#282d3f] focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={sshUser}
                  onChange={(e) => setSshUser(e.target.value)}
                  placeholder="root"
                  className="w-full bg-[#0f1117] text-xs text-slate-200 px-3 py-1.5 rounded border border-[#282d3f] focus:outline-none focus:border-primary font-mono"
                />
              </div>

              {/* Authentication Mode */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Authentication</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSshAuthMethod("password")}
                    className={`py-1.5 text-xs rounded border transition-colors ${
                      sshAuthMethod === "password"
                        ? "bg-primary/20 border-primary text-primary-light"
                        : "border-[#282d3f] text-slate-400 hover:bg-[#282d3f]"
                    }`}
                  >
                    Password (Prompt on connect)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSshAuthMethod("key")}
                    className={`py-1.5 text-xs rounded border transition-colors ${
                      sshAuthMethod === "key"
                        ? "bg-primary/20 border-primary text-primary-light"
                        : "border-[#282d3f] text-slate-400 hover:bg-[#282d3f]"
                    }`}
                  >
                    Private Key File (.pem / .id_rsa)
                  </button>
                </div>
              </div>

              {sshAuthMethod === "key" && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Private Key Path</label>
                  <input
                    type="text"
                    value={sshKeyPath}
                    onChange={(e) => setSshKeyPath(e.target.value)}
                    placeholder="C:/Users/name/.ssh/id_rsa or /Users/.../.ssh/id_ed25519"
                    className="w-full bg-[#0f1117] text-xs text-slate-200 px-3 py-1.5 rounded border border-[#282d3f] focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              )}

              {/* Jump Host */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Bastion / Jump Host (Optional)
                </label>
                <input
                  type="text"
                  value={sshJumpHost}
                  onChange={(e) => setSshJumpHost(e.target.value)}
                  placeholder="bastion.suncloud.vn:22"
                  className="w-full bg-[#0f1117] text-xs text-slate-200 px-3 py-1.5 rounded border border-[#282d3f] focus:outline-none focus:border-primary font-mono"
                />
              </div>
            </div>
          )}

          {/* Local Terminal Configuration */}
          {activeTab === "local" && (
            <div className="space-y-3 pt-2 border-t border-[#282d3f]">
              <label className="block text-xs font-medium text-slate-300 mb-1">Shell Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShellType("powershell")}
                  className={`py-2 px-3 text-xs rounded border text-left transition-colors ${
                    shellType === "powershell"
                      ? "bg-primary/20 border-primary text-primary-light"
                      : "border-[#282d3f] text-slate-400 hover:bg-[#282d3f]"
                  }`}
                >
                  <div className="font-medium text-slate-200">PowerShell</div>
                  <div className="text-[10px] text-slate-400">Windows PowerShell / pwsh</div>
                </button>
                <button
                  type="button"
                  onClick={() => setShellType("wsl")}
                  className={`py-2 px-3 text-xs rounded border text-left transition-colors ${
                    shellType === "wsl"
                      ? "bg-primary/20 border-primary text-primary-light"
                      : "border-[#282d3f] text-slate-400 hover:bg-[#282d3f]"
                  }`}
                >
                  <div className="font-medium text-slate-200">WSL (Linux)</div>
                  <div className="text-[10px] text-slate-400">Ubuntu / Debian on Windows</div>
                </button>
                <button
                  type="button"
                  onClick={() => setShellType("cmd")}
                  className={`py-2 px-3 text-xs rounded border text-left transition-colors ${
                    shellType === "cmd"
                      ? "bg-primary/20 border-primary text-primary-light"
                      : "border-[#282d3f] text-slate-400 hover:bg-[#282d3f]"
                  }`}
                >
                  <div className="font-medium text-slate-200">Command Prompt (CMD)</div>
                  <div className="text-[10px] text-slate-400">Classic Windows cmd.exe</div>
                </button>
                <button
                  type="button"
                  onClick={() => setShellType("bash")}
                  className={`py-2 px-3 text-xs rounded border text-left transition-colors ${
                    shellType === "bash"
                      ? "bg-primary/20 border-primary text-primary-light"
                      : "border-[#282d3f] text-slate-400 hover:bg-[#282d3f]"
                  }`}
                >
                  <div className="font-medium text-slate-200">Git Bash / Zsh</div>
                  <div className="text-[10px] text-slate-400">Native POSIX shell</div>
                </button>
              </div>
            </div>
          )}

          {/* RDP Configuration */}
          {activeTab === "rdp" && (
            <div className="space-y-3 pt-2 border-t border-[#282d3f]">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Remote Desktop Host *
                  </label>
                  <input
                    type="text"
                    required
                    value={rdpHost}
                    onChange={(e) => setRdpHost(e.target.value)}
                    placeholder="14.225.16.xxx"
                    className="w-full bg-[#0f1117] text-xs text-slate-200 px-3 py-1.5 rounded border border-[#282d3f] focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">RDP Port</label>
                  <input
                    type="number"
                    value={rdpPort}
                    onChange={(e) => setRdpPort(parseInt(e.target.value, 10))}
                    className="w-full bg-[#0f1117] text-xs text-slate-200 px-3 py-1.5 rounded border border-[#282d3f] focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={rdpUser}
                  onChange={(e) => setRdpUser(e.target.value)}
                  placeholder="Administrator"
                  className="w-full bg-[#0f1117] text-xs text-slate-200 px-3 py-1.5 rounded border border-[#282d3f] focus:outline-none focus:border-primary font-mono"
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#282d3f]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-[#282d3f] rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-primary hover:bg-primary-hover text-white font-medium rounded shadow transition-colors"
            >
              Save & Connect
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
