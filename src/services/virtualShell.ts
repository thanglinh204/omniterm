export interface VirtualFile {
  name: string;
  isDir: boolean;
  size: number;
  modified: string;
  permissions: string;
  content?: string;
}

export interface VirtualFsState {
  [path: string]: VirtualFile[];
}

export function createInitialFs(): VirtualFsState {
  return {
    "/": [
      { name: "bin", isDir: true, size: 4096, modified: "Oct 22 08:00", permissions: "drwxr-xr-x" },
      { name: "etc", isDir: true, size: 4096, modified: "Oct 22 08:00", permissions: "drwxr-xr-x" },
      { name: "home", isDir: true, size: 4096, modified: "Oct 22 08:00", permissions: "drwxr-xr-x" },
      { name: "opt", isDir: true, size: 4096, modified: "Oct 22 08:00", permissions: "drwxr-xr-x" },
      { name: "root", isDir: true, size: 4096, modified: "Oct 27 09:30", permissions: "drwx------" },
      { name: "var", isDir: true, size: 4096, modified: "Oct 22 08:00", permissions: "drwxr-xr-x" },
      { name: "tmp", isDir: true, size: 4096, modified: "Oct 27 09:00", permissions: "drwxrwxrwt" },
    ],
    "/root": [
      { name: "conf.d", isDir: true, size: 4096, modified: "Oct 25 14:20", permissions: "drwxr-xr-x" },
      { name: "logs", isDir: true, size: 4096, modified: "Oct 27 09:15", permissions: "drwxr-xr-x" },
      {
        name: "docker-compose.yml",
        isDir: false,
        size: 1420,
        modified: "Oct 26 18:02",
        permissions: "-rw-r--r--",
        content: `version: '3.8'\nservices:\n  omniterm-gateway:\n    image: omniterm/gateway:v0.1.0\n    ports:\n      - "8080:8080"\n    restart: unless-stopped\n    environment:\n      - NODE_ENV=production\n      - LOG_LEVEL=info\n  postgres:\n    image: postgres:16-alpine\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n    environment:\n      - POSTGRES_DB=omniterm\nvolumes:\n  pgdata:\n`,
      },
      {
        name: "nginx.conf",
        isDir: false,
        size: 2840,
        modified: "Oct 25 11:30",
        permissions: "-rw-r--r--",
        content: `user nginx;\nworker_processes auto;\nerror_log /var/log/nginx/error.log notice;\npid /var/run/nginx.pid;\n\nevents {\n    worker_connections 1024;\n}\n\nhttp {\n    include /etc/nginx/mime.types;\n    default_type application/octet-stream;\n    sendfile on;\n    keepalive_timeout 65;\n\n    server {\n        listen 80;\n        server_name localhost;\n        location / {\n            proxy_pass http://127.0.0.1:8080;\n            proxy_http_version 1.1;\n            proxy_set_header Upgrade $http_upgrade;\n            proxy_set_header Connection "upgrade";\n        }\n    }\n}\n`,
      },
      {
        name: "deploy.sh",
        isDir: false,
        size: 850,
        modified: "Oct 24 16:45",
        permissions: "-rwxr-xr-x",
        content: `#!/usr/bin/env bash\nset -euo pipefail\necho "==> Deploying OmniTerm infrastructure service..."\ndocker compose pull\ndocker compose up -d\necho "==> Health check passed at $(date)"\n`,
      },
      {
        name: ".env",
        isDir: false,
        size: 420,
        modified: "Oct 26 08:00",
        permissions: "-rw-------",
        content: `OIDC_ISSUER=https://id.company.internal/realms/omniterm\nOIDC_AUDIENCE=omniterm-api\nDATABASE_PATH=/var/data/control-plane.sqlite\nPORT=8080\n`,
      },
      {
        name: "README.md",
        isDir: false,
        size: 610,
        modified: "Oct 25 10:00",
        permissions: "-rw-r--r--",
        content: `# Production Bastion Host\nManaged by OmniTerm Enterprise Control Plane.\nAuthorized technicians only. All sessions are audited.\n`,
      },
    ],
    "/root/conf.d": [
      {
        name: "ssl.conf",
        isDir: false,
        size: 512,
        modified: "Oct 25 14:20",
        permissions: "-rw-r--r--",
        content: `ssl_protocols TLSv1.2 TLSv1.3;\nssl_ciphers HIGH:!aNULL:!MD5;\nssl_prefer_server_ciphers on;\n`,
      },
    ],
    "/root/logs": [
      {
        name: "access.log",
        isDir: false,
        size: 12450,
        modified: "Oct 27 09:15",
        permissions: "-rw-r--r--",
        content: `[2026-10-27T08:12:04Z] GET /healthz 200 - 1.2ms\n[2026-10-27T08:14:22Z] POST /api/sessions 200 - 4.1ms\n[2026-10-27T08:15:00Z] WSS /ws/terminal 101 - connected\n`,
      },
    ],
    "/etc": [
      { name: "hostname", isDir: false, size: 14, modified: "Oct 22 08:00", permissions: "-rw-r--r--", content: "omniterm-host\n" },
      { name: "os-release", isDir: false, size: 280, modified: "Oct 22 08:00", permissions: "-rw-r--r--", content: "NAME=\"Ubuntu\"\nVERSION=\"24.04 LTS (Noble Numbat)\"\nID=ubuntu\nID_LIKE=debian\nVERSION_ID=\"24.04\"\n" },
    ],
    "/home": [
      { name: "operator", isDir: true, size: 4096, modified: "Oct 22 08:00", permissions: "drwxr-xr-x" },
    ],
    "/var/log": [
      { name: "syslog", isDir: false, size: 8192, modified: "Oct 27 09:30", permissions: "-rw-r-----", content: "Oct 27 09:30:00 omniterm systemd[1]: Started OmniTerm Bastion Service.\n" },
    ],
  };
}

export class VirtualShellSession {
  private fs: VirtualFsState;
  private currentDir: string = "/root";
  private history: string[] = [];
  private historyIndex: number = -1;
  private hostInfo: string;
  private user: string;

  constructor(hostInfo = "omniterm-bastion", user = "root") {
    this.fs = createInitialFs();
    this.hostInfo = hostInfo;
    this.user = user;
    if (this.user !== "root") {
      this.currentDir = `/home/${this.user}`;
      if (!this.fs[this.currentDir]) {
        this.fs[this.currentDir] = [];
      }
    }
  }

  public getPrompt(): string {
    const symbol = this.user === "root" ? "#" : "$";
    const displayDir = this.currentDir === `/root` ? "~" : this.currentDir;
    return `\x1b[1;32m${this.user}@${this.hostInfo}\x1b[0m:\x1b[1;34m${displayDir}\x1b[0m${symbol} `;
  }

  public getCurrentDir(): string {
    return this.currentDir;
  }

  public getFiles(path = this.currentDir): VirtualFile[] {
    const resolved = this.resolvePath(path);
    return this.fs[resolved] || [];
  }

  public getFileContent(filePath: string): string | null {
    const { dir, base } = this.splitPath(filePath);
    const files = this.fs[dir] || [];
    const match = files.find((f) => f.name === base);
    return match && !match.isDir ? match.content ?? "" : null;
  }

  public saveFile(filePath: string, content: string): boolean {
    const { dir, base } = this.splitPath(filePath);
    if (!this.fs[dir]) return false;
    const files = this.fs[dir];
    const existing = files.find((f) => f.name === base);
    if (existing) {
      existing.content = content;
      existing.size = content.length;
      existing.modified = "Just now";
    } else {
      files.push({
        name: base,
        isDir: false,
        size: content.length,
        modified: "Just now",
        permissions: "-rw-r--r--",
        content,
      });
    }
    return true;
  }

  public createDirectory(dirPath: string): boolean {
    const resolved = this.resolvePath(dirPath);
    if (this.fs[resolved]) return true;
    const { dir, base } = this.splitPath(resolved);
    if (!this.fs[dir]) return false;
    this.fs[dir].push({
      name: base,
      isDir: true,
      size: 4096,
      modified: "Just now",
      permissions: "drwxr-xr-x",
    });
    this.fs[resolved] = [];
    return true;
  }

  public deleteItem(itemPath: string): boolean {
    const { dir, base } = this.splitPath(itemPath);
    if (!this.fs[dir]) return false;
    this.fs[dir] = this.fs[dir].filter((f) => f.name !== base);
    const resolved = this.resolvePath(itemPath);
    delete this.fs[resolved];
    return true;
  }

  private resolvePath(input: string): string {
    if (!input || input === "~") return this.user === "root" ? "/root" : `/home/${this.user}`;
    let p = input;
    if (p.startsWith("~/")) {
      p = (this.user === "root" ? "/root" : `/home/${this.user}`) + p.substring(1);
    }
    if (!p.startsWith("/")) {
      p = this.currentDir === "/" ? `/${p}` : `${this.currentDir}/${p}`;
    }
    const segments = p.split("/").filter(Boolean);
    const stack: string[] = [];
    for (const seg of segments) {
      if (seg === ".") continue;
      if (seg === "..") {
        if (stack.length > 0) stack.pop();
      } else {
        stack.push(seg);
      }
    }
    return `/${stack.join("/")}`;
  }

  private splitPath(input: string): { dir: string; base: string } {
    const resolved = this.resolvePath(input);
    const lastSlash = resolved.lastIndexOf("/");
    if (lastSlash <= 0) {
      return { dir: "/", base: resolved.substring(1) };
    }
    return {
      dir: resolved.substring(0, lastSlash),
      base: resolved.substring(lastSlash + 1),
    };
  }

  public execute(commandLine: string): { output: string; clear?: boolean; exit?: boolean } {
    const line = commandLine.trim();
    if (!line) return { output: "" };

    this.history.push(line);
    this.historyIndex = this.history.length;

    // Handle pipe or redirection basics
    const args = line.split(/\s+/);
    const cmd = args[0].toLowerCase();
    const rest = args.slice(1);

    switch (cmd) {
      case "clear":
        return { output: "", clear: true };

      case "exit":
        return { output: "\x1b[33mSession terminated by user.\x1b[0m\r\n", exit: true };

      case "help":
        return {
          output:
            `\x1b[1;36mOmniTerm Interactive Virtual Shell\x1b[0m\r\n` +
            `Available commands:\r\n` +
            `  \x1b[1mls\x1b[0m [-la] [path]       List directory contents\r\n` +
            `  \x1b[1mcd\x1b[0m [path]             Change directory\r\n` +
            `  \x1b[1mpwd\x1b[0m                   Print working directory\r\n` +
            `  \x1b[1mcat\x1b[0m <file>            Display file contents\r\n` +
            `  \x1b[1mecho\x1b[0m [text] [> file]  Print text or redirect to file\r\n` +
            `  \x1b[1mmkdir\x1b[0m [-p] <dir>      Create directory\r\n` +
            `  \x1b[1mtouch\x1b[0m <file>          Create empty file\r\n` +
            `  \x1b[1mrm\x1b[0m [-rf] <path>       Remove file or directory\r\n` +
            `  \x1b[1mwhoami\x1b[0m / \x1b[1mid\x1b[0m         Show current user\r\n` +
            `  \x1b[1mhostname\x1b[0m              Show system host name\r\n` +
            `  \x1b[1muname\x1b[0m [-a]            Show system kernel and architecture\r\n` +
            `  \x1b[1muptime\x1b[0m / \x1b[1mdate\x1b[0m        System running time and current time\r\n` +
            `  \x1b[1mps\x1b[0m [aux] / \x1b[1mtop\x1b[0m        List active processes\r\n` +
            `  \x1b[1mdf\x1b[0m [-h] / \x1b[1mfree\x1b[0m [-m]    Disk and memory statistics\r\n` +
            `  \x1b[1mdocker\x1b[0m ps             List containers\r\n` +
            `  \x1b[1mping\x1b[0m <host>           Check network latency\r\n` +
            `  \x1b[1mcurl\x1b[0m [-I] <url>       Simulate HTTP request\r\n` +
            `  \x1b[1menv\x1b[0m                   Print environment variables\r\n` +
            `  \x1b[1mhistory\x1b[0m               Show command history\r\n` +
            `  \x1b[1mclear\x1b[0m                 Clear terminal screen\r\n` +
            `  \x1b[1mexit\x1b[0m                  Close this session\r\n`,
        };

      case "pwd":
        return { output: `${this.currentDir}\r\n` };

      case "cd": {
        const target = rest[0] || "~";
        const resolved = this.resolvePath(target);
        if (this.fs[resolved]) {
          this.currentDir = resolved;
          return { output: "" };
        }
        return { output: `\x1b[31mbash: cd: ${target}: No such file or directory\x1b[0m\r\n` };
      }

      case "ls": {
        let showLong = false;
        let showAll = false;
        let targetPath = this.currentDir;

        for (const arg of rest) {
          if (arg.startsWith("-")) {
            if (arg.includes("l")) showLong = true;
            if (arg.includes("a")) showAll = true;
          } else {
            targetPath = this.resolvePath(arg);
          }
        }

        const files = this.fs[targetPath];
        if (!files) {
          return { output: `\x1b[31mls: cannot access '${rest[0] || ""}': No such file or directory\x1b[0m\r\n` };
        }

        const filtered = showAll ? files : files.filter((f) => !f.name.startsWith("."));

        if (!showLong) {
          const names = filtered.map((f) => {
            if (f.isDir) return `\x1b[1;34m${f.name}\x1b[0m`;
            if (f.permissions.includes("x")) return `\x1b[1;32m${f.name}\x1b[0m`;
            return f.name;
          });
          return { output: names.join("  ") + (names.length > 0 ? "\r\n" : "") };
        }

        let out = `total ${filtered.length * 4}\r\n`;
        for (const f of filtered) {
          const colorName = f.isDir
            ? `\x1b[1;34m${f.name}\x1b[0m`
            : f.permissions.includes("x")
            ? `\x1b[1;32m${f.name}\x1b[0m`
            : f.name;
          out += `${f.permissions}  1 ${this.user} ${this.user}  ${String(f.size).padStart(6, " ")} ${f.modified} ${colorName}\r\n`;
        }
        return { output: out };
      }

      case "cat": {
        if (rest.length === 0) return { output: `\x1b[31mcat: missing operand\x1b[0m\r\n` };
        const content = this.getFileContent(rest[0]);
        if (content === null) {
          return { output: `\x1b[31mcat: ${rest[0]}: No such file or directory\x1b[0m\r\n` };
        }
        return { output: content.replace(/\n/g, "\r\n") + (content.endsWith("\n") ? "" : "\r\n") };
      }

      case "echo": {
        const redirIdx = rest.indexOf(">");
        if (redirIdx !== -1) {
          const text = rest.slice(0, redirIdx).join(" ").replace(/^["']|["']$/g, "");
          const targetFile = rest[redirIdx + 1];
          if (!targetFile) return { output: `\x1b[31mbash: syntax error near unexpected token 'newline'\x1b[0m\r\n` };
          this.saveFile(targetFile, text + "\n");
          return { output: "" };
        }
        return { output: rest.join(" ").replace(/^["']|["']$/g, "") + "\r\n" };
      }

      case "mkdir": {
        const dirName = rest.filter((a) => !a.startsWith("-"))[0];
        if (!dirName) return { output: `\x1b[31mmkdir: missing operand\x1b[0m\r\n` };
        const ok = this.createDirectory(dirName);
        return ok ? { output: "" } : { output: `\x1b[31mmkdir: cannot create directory '${dirName}'\x1b[0m\r\n` };
      }

      case "touch": {
        const fileName = rest[0];
        if (!fileName) return { output: `\x1b[31mtouch: missing file operand\x1b[0m\r\n` };
        this.saveFile(fileName, "");
        return { output: "" };
      }

      case "rm": {
        const item = rest.filter((a) => !a.startsWith("-"))[0];
        if (!item) return { output: `\x1b[31mrm: missing operand\x1b[0m\r\n` };
        this.deleteItem(item);
        return { output: "" };
      }

      case "whoami":
        return { output: `${this.user}\r\n` };

      case "id":
        return { output: `uid=0(${this.user}) gid=0(${this.user}) groups=0(${this.user}),27(sudo),110(lxd)\r\n` };

      case "hostname":
        return { output: `${this.hostInfo}\r\n` };

      case "uname":
        return { output: `Linux ${this.hostInfo} 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC x86_64 x86_64 x86_64 GNU/Linux\r\n` };

      case "uptime":
        return { output: ` 09:42:15 up 14 days,  3:18,  2 users,  load average: 0.12, 0.08, 0.05\r\n` };

      case "date":
        return { output: `${new Date().toUTCString()}\r\n` };

      case "free":
        return {
          output:
            `               total        used        free      shared  buff/cache   available\r\n` +
            `Mem:           16384        4820        9120         180        2444       11384\r\n` +
            `Swap:           4096           0        4096\r\n`,
        };

      case "df":
        return {
          output:
            `Filesystem      Size  Used Avail Use% Mounted on\r\n` +
            `/dev/sda1        80G   24G   53G  32% /\r\n` +
            `tmpfs           7.8G     0  7.8G   0% /dev/shm\r\n` +
            `/dev/sda15      105M  6.1M   99M   6% /boot/efi\r\n` +
            `/dev/sdb1       500G  112G  363G  24% /var/data\r\n`,
        };

      case "ps":
        return {
          output:
            `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\r\n` +
            `root         1  0.0  0.1 168340 12844 ?        Ss   Oct13   0:14 /sbin/init\r\n` +
            `root       420  0.1  0.3 720184 28410 ?        Ssl  Oct13   2:48 /usr/bin/dockerd\r\n` +
            `root       890  0.0  0.1  18420  4820 ?        Ss   Oct13   0:02 /usr/sbin/sshd -D\r\n` +
            `omniterm  1420  0.4  1.2 920400 98400 ?        Sl   08:00   0:45 node server/src/main.mjs\r\n` +
            `postgres  1510  0.1  0.8 384120 64200 ?        S    08:00   0:18 postgres: checkpointer\r\n` +
            `root      3840  0.0  0.0  14200  3800 pts/1    R+   09:42   0:00 ps aux\r\n`,
        };

      case "top":
        return {
          output:
            `top - 09:42:18 up 14 days,  3:18,  2 users,  load average: 0.14, 0.09, 0.05\r\n` +
            `Tasks: 142 total,   1 running, 141 sleeping,   0 stopped,   0 zombie\r\n` +
            `%Cpu(s):  1.2 us,  0.4 sy,  0.0 ni, 98.2 id,  0.1 wa,  0.0 hi,  0.1 si\r\n` +
            `MiB Mem :  16384.0 total,   9120.4 free,   4820.2 used,   2443.4 buff/cache\r\n` +
            `MiB Swap:   4096.0 total,   4096.0 free,      0.0 used.  11384.1 avail Mem\r\n`,
        };

      case "docker": {
        if (rest[0] === "ps") {
          return {
            output:
              `CONTAINER ID   IMAGE                    COMMAND                  CREATED        STATUS        PORTS                    NAMES\r\n` +
              `8f3a91b2c4e1   omniterm/gateway:v0.1.0  "node src/main.mjs"      2 hours ago    Up 2 hours    0.0.0.0:8080->8080/tcp   omniterm-gateway\r\n` +
              `3d1e4c7b8a90   postgres:16-alpine       "docker-entrypoint.s…"   2 hours ago    Up 2 hours    5432/tcp                 omniterm-postgres\r\n`,
          };
        }
        return { output: `Usage: docker ps\r\n` };
      }

      case "ping": {
        const host = rest[0] || "8.8.8.8";
        return {
          output:
            `PING ${host} (${host}) 56(84) bytes of data.\r\n` +
            `64 bytes from ${host}: icmp_seq=1 ttl=118 time=8.42 ms\r\n` +
            `64 bytes from ${host}: icmp_seq=2 ttl=118 time=8.15 ms\r\n` +
            `64 bytes from ${host}: icmp_seq=3 ttl=118 time=8.30 ms\r\n` +
            `64 bytes from ${host}: icmp_seq=4 ttl=118 time=8.08 ms\r\n` +
            `--- ${host} ping statistics ---\r\n` +
            `4 packets transmitted, 4 received, 0% packet loss, time 3004ms\r\n` +
            `rtt min/avg/max/mdev = 8.082/8.237/8.421/0.134 ms\r\n`,
        };
      }

      case "curl": {
        const url = rest[rest.length - 1] || "http://localhost:8080/healthz";
        return {
          output:
            `HTTP/1.1 200 OK\r\n` +
            `Content-Type: application/json; charset=utf-8\r\n` +
            `X-Request-ID: 7b819f20-22c3-4d61-8f44-99881122aabb\r\n` +
            `Date: ${new Date().toUTCString()}\r\n` +
            `Content-Length: 64\r\n\r\n` +
            `{"status":"ok","stage":"control-plane-pilot","version":"0.1.0"}\r\n`,
        };
      }

      case "env":
        return {
          output:
            `USER=${this.user}\r\n` +
            `HOME=${this.user === "root" ? "/root" : `/home/${this.user}`}\r\n` +
            `SHELL=/bin/bash\r\n` +
            `TERM=xterm-256color\r\n` +
            `PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\r\n` +
            `OMNITERM_VERSION=0.1.0\r\n` +
            `HOST=${this.hostInfo}\r\n`,
        };

      case "history":
        return {
          output: this.history.map((cmd, i) => `  ${String(i + 1).padStart(4, " ")}  ${cmd}\r\n`).join(""),
        };

      default:
        return { output: `\x1b[31mbash: ${cmd}: command not found\x1b[0m\r\n` };
    }
  }

  public getHistory(direction: "up" | "down"): string {
    if (this.history.length === 0) return "";
    if (direction === "up") {
      if (this.historyIndex > 0) this.historyIndex--;
    } else {
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
      } else {
        this.historyIndex = this.history.length;
        return "";
      }
    }
    return this.history[this.historyIndex] || "";
  }

  public getCompletions(currentWord: string): string[] {
    const builtins = [
      "help", "clear", "ls", "cd", "pwd", "cat", "echo", "mkdir", "touch", "rm",
      "whoami", "id", "hostname", "uname", "uptime", "date", "free", "df", "ps", "top",
      "docker", "ping", "curl", "env", "history", "exit",
    ];

    if (!currentWord.includes("/")) {
      const matchingCmds = builtins.filter((c) => c.startsWith(currentWord));
      const files = this.fs[this.currentDir] || [];
      const matchingFiles = files.map((f) => f.name).filter((name) => name.startsWith(currentWord));
      return Array.from(new Set([...matchingCmds, ...matchingFiles]));
    }

    const { dir, base } = this.splitPath(currentWord);
    const files = this.fs[dir] || [];
    return files.filter((f) => f.name.startsWith(base)).map((f) => f.name);
  }
}
