# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-10-29

### Added
- **Multi-Platform Native Desktop Client:** Powered by Tauri v2 and Rust 1.99, delivering high responsiveness with under 40 MB RAM.
- **Windows Installers:**
  - Standard NSIS setup with Start Menu and Desktop shortcuts ().
  - Enterprise MSI package ().
  - Zero-install portable zip ().
- **Linux Packages:**
  - Debian/Ubuntu  installer ().
  - RedHat/Fedora  installer ().
  - Universal standalone  ().
- **Web Docker Distribution:**
  - Standalone multi-stage production Dockerfile ( + Nginx + supervisord).
  - Standalone Compose package () with volume persistence for SQLite.
- **SSH PTY & SFTP Gateway:**
  - Real-time bidirectional streaming over WebSocket ().
  - Interactive SFTP explorer with directory browsing, upload, and download.
- **Monorepo Layout:**
  - Standardized structure: , , , , , , .
