export type ProtocolType = "ssh" | "local" | "rdp" | "sftp" | "serial" | "telnet" | "vnc";

export interface SshConfig {
  host: string;
  port: number;
  username: string;
  authMethod: "password" | "key" | "agent";
  keyPath?: string;
  jumpHost?: string;
  x11Forwarding?: boolean;
  compression?: boolean;
  keepAliveInterval?: number;
  terminalType?: string;
}

export interface LocalConfig {
  shellType: "powershell" | "cmd" | "wsl" | "bash" | "zsh" | "custom";
  customPath?: string;
  workingDir?: string;
  env?: Record<string, string>;
}

export interface RdpConfig {
  host: string;
  port: number;
  username: string;
  domain?: string;
  resolution?: string;
  colorDepth?: number;
}

export interface SftpConfig {
  host: string;
  port: number;
  username: string;
  authMethod: "password" | "key";
  keyPath?: string;
  initialRemoteDir?: string;
  initialLocalDir?: string;
}

export interface SessionItem {
  id: string;
  name: string;
  protocol: ProtocolType;
  folderPath: string; // e.g. "1-SunCloud/01_Lab-NPS" or "" for root
  icon?: string;
  color?: string;
  lastUsed?: number;
  createdAt: number;
  ssh?: SshConfig;
  local?: LocalConfig;
  rdp?: RdpConfig;
  sftp?: SftpConfig;
  notes?: string;
  tags?: string[];
}

export interface FolderItem {
  id: string;
  name: string;
  fullPath: string; // "Parent/Child"
  parentPath: string;
  isExpanded?: boolean;
}

export interface TerminalTab {
  id: string;
  sessionId?: string;
  title: string;
  protocol: ProtocolType;
  isConnected: boolean;
  splitPane?: "horizontal" | "vertical" | null;
  pairedSftpOpen?: boolean;
  currentRemotePath?: string;
  hostInfo?: string;
}

export type SplitLayout = "single" | "split-horizontal" | "split-vertical" | "grid-4";
