# OmniTerm Pro

> The Clean-Room, Ultra-Fast Multi-Platform Terminal Client and Cloud Session Gateway.

[![Release](https://img.shields.io/github/v/release/thanglinh204/omniterm?style=flat-square)](https://github.com/thanglinh204/omniterm/releases/tag/v0.1.0)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20Web%20Docker-brightgreen.svg?style=flat-square)](#download--installers)

---

## Highlights

- **Native Desktop Performance:** Built on Rust and Tauri v2. Starts in milliseconds, uses under 40 MB RAM.
- **Web VPS Standalone Mode:** Deploy the exact same interface to your VPS via Docker Compose with zero external dependencies.
- **Real SSH & SFTP Engine:** Bidirectional WebSocket PTY streaming and integrated file manager.
- **Enterprise Multi-Platform:** Native installers for Windows (NSIS, MSI), Linux (.deb, .rpm, AppImage), and Docker.

---

## Download & Installers

### 1. Windows (x64)
- **NSIS Installer:** [OmniTerm-Setup-v0.1.0-win-x64.exe](https://github.com/thanglinh204/omniterm/releases/download/v0.1.0/OmniTerm-Setup-v0.1.0-win-x64.exe)
- **Enterprise MSI:** [OmniTerm-v0.1.0-win-x64.msi](https://github.com/thanglinh204/omniterm/releases/download/v0.1.0/OmniTerm-v0.1.0-win-x64.msi)
- **Portable Zip:** [OmniTerm-v0.1.0-win-x64-portable.zip](https://github.com/thanglinh204/omniterm/releases/download/v0.1.0/OmniTerm-v0.1.0-win-x64-portable.zip)
- *See [Windows Installation Guide](docs/INSTALL-WINDOWS.md)*

### 2. Linux (x64)
- **Debian / Ubuntu:** [OmniTerm-v0.1.0-linux-x64.deb](https://github.com/thanglinh204/omniterm/releases/download/v0.1.0/OmniTerm-v0.1.0-linux-x64.deb)
- **Fedora / RHEL:** [OmniTerm-v0.1.0-linux-x64.rpm](https://github.com/thanglinh204/omniterm/releases/download/v0.1.0/OmniTerm-v0.1.0-linux-x64.rpm)
- **Universal AppImage:** [OmniTerm-v0.1.0-linux-x64.AppImage](https://github.com/thanglinh204/omniterm/releases/download/v0.1.0/OmniTerm-v0.1.0-linux-x64.AppImage)
- *See [Linux Installation Guide](docs/INSTALL-LINUX.md)*

### 3. Web Cloud (Docker Compose)
Deploy standalone on any server in seconds:

Access UI at .
- *See [Docker Deployment Guide](docs/INSTALL-DOCKER.md)*

---

## Monorepo Structure



---

## Verification & Integrity

All release binaries are cryptographically signed with SHA-256 hashes available in [SHA256SUMS.txt](SHA256SUMS.txt).
