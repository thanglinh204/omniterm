# OmniTerm Architecture Specification

## Clean-Room Dual-Distribution Architecture

OmniTerm is engineered to provide modern, lightweight terminal and session management across both Desktop operating systems and Cloud VPS hosts.

### 1. Core Principles
- **Clean-Room Design:** Completely independent implementation built from scratch using modern web standards (React 18, TypeScript, Tailwind) and Rust (Tauri v2).
- **Dual-Distribution Model:** Single codebase serving both native Desktop clients (Windows, Linux, macOS) and headless Web Docker VPS servers.
- **Resource Efficiency:** Desktop app runs in under 40 MB RAM with instantaneous startup.

---

### 2. Desktop Native Architecture (Tauri v2)
- **Host Layer:** Rust 1.99 with MSVC (Windows) and GCC/WebKitGTK (Linux).
- **PTY Engine:** Native cross-platform pseudo-terminal management via Rust channels.
- **Security:** IPC whitelist isolation, zero plain-text credential leaks, secure credential storage.

---

### 3. Web Cloud Docker Architecture
- **Supervisor Multi-Process:** Orchestrates Nginx Alpine (static asset serving and SSL/WSS termination) alongside Node.js 22 (SSH/SFTP gateway).
- **SSH PTY WebSocket Gateway:** Direct streaming over `/ws/ssh` using `ssh2` and `ws` protocols.
- **SFTP Explorer:** Real-time directory navigation, stat, upload, and download bridging browser fetch requests with remote SSH servers.
