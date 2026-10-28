import { SessionItem, ProtocolType } from "../types/session";

export interface MobaImportResult {
  sessions: SessionItem[];
  folders: string[];
  stats: {
    totalSessions: number;
    sshCount: number;
    rdpCount: number;
    sftpCount: number;
    otherCount: number;
    folderCount: number;
  };
}

export function parseMobaXtermIni(iniContent: string): MobaImportResult {
  const lines = iniContent.split(/\r?\n/);
  let currentSection = "";
  let currentFolder = "";

  const folderSet = new Set<string>();
  const sessions: SessionItem[] = [];

  let sshCount = 0;
  let rdpCount = 0;
  let sftpCount = 0;
  let otherCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.startsWith(";")) continue;

    if (rawLine.startsWith("[") && rawLine.endsWith("]")) {
      currentSection = rawLine.substring(1, rawLine.length - 1);
      if (currentSection === "Bookmarks") {
        currentFolder = "";
      }
      continue;
    }

    if (!currentSection.startsWith("Bookmarks")) {
      continue;
    }

    if (rawLine.startsWith("SubRep=")) {
      currentFolder = rawLine.substring(7).trim();
      if (currentFolder) {
        folderSet.add(currentFolder);
        // Also register all ancestor folders
        const parts = currentFolder.split(/[\\/]/);
        let acc = "";
        for (const p of parts) {
          acc = acc ? `${acc}/${p}` : p;
          folderSet.add(acc);
        }
      }
      continue;
    }

    if (rawLine.startsWith("ImgNum=")) {
      continue;
    }

    const eqIdx = rawLine.indexOf("=");
    if (eqIdx === -1) continue;

    const sessionName = rawLine.substring(0, eqIdx).trim();
    const rawValue = rawLine.substring(eqIdx + 1).trim();

    const fields = rawValue.split("%");
    if (fields.length < 4) continue;

    const iconField = fields[0] || "";
    const hostField = fields[1] || "";
    const portField = parseInt(fields[2], 10) || 22;
    const userField = fields[3] || "";
    const keyPathField = fields[4] || "";
    const jumpHostField = fields[58] && fields[58] !== "<none>" ? fields[58] : undefined;

    // Determine protocol
    let protocol: ProtocolType = "ssh";
    if (iconField.includes("#91#") || portField === 3389 || sessionName.toLowerCase().includes("rdp")) {
      protocol = "rdp";
      rdpCount++;
    } else if (iconField.includes("#146#") || sessionName.toLowerCase().includes("sftp")) {
      protocol = "sftp";
      sftpCount++;
    } else if (sessionName.toLowerCase() === "cmd" || sessionName.toLowerCase().includes("powershell") || sessionName.toLowerCase() === "bash") {
      protocol = "local";
      otherCount++;
    } else if (portField === 23 || sessionName.toLowerCase().includes("telnet")) {
      protocol = "telnet";
      otherCount++;
    } else {
      protocol = "ssh";
      sshCount++;
    }

    const session: SessionItem = {
      id: `moba_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: sessionName,
      protocol,
      folderPath: currentFolder.replace(/\\/g, "/"),
      createdAt: Date.now(),
      icon: iconField,
    };

    if (protocol === "ssh") {
      session.ssh = {
        host: hostField,
        port: portField,
        username: userField || "root",
        authMethod: keyPathField ? "key" : "password",
        keyPath: keyPathField || undefined,
        jumpHost: jumpHostField,
        x11Forwarding: true,
        terminalType: fields[49] || "xterm-256color",
      };
    } else if (protocol === "rdp") {
      session.rdp = {
        host: hostField,
        port: portField || 3389,
        username: userField || "Administrator",
      };
    } else if (protocol === "sftp") {
      session.sftp = {
        host: hostField,
        port: portField || 22,
        username: userField || "root",
        authMethod: keyPathField ? "key" : "password",
        keyPath: keyPathField || undefined,
      };
    } else if (protocol === "local") {
      session.local = {
        shellType: sessionName.toLowerCase().includes("cmd") ? "cmd" : "powershell",
      };
    }

    sessions.push(session);
  }

  return {
    sessions,
    folders: Array.from(folderSet).sort(),
    stats: {
      totalSessions: sessions.length,
      sshCount,
      rdpCount,
      sftpCount,
      otherCount,
      folderCount: folderSet.size,
    },
  };
}
