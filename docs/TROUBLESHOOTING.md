# OmniTerm Troubleshooting & FAQ

## 1. Windows Issues
### Missing Microsoft Edge WebView2 Runtime
- **Symptom:** Application fails to launch or displays an initialization error.
- **Resolution:** Download and install the Evergreen Bootstrapper from Microsoft WebView2.

---

## 2. Linux Issues
### Missing WebKit2GTK Dependencies
- **Symptom:** error while loading shared libraries: libwebkit2gtk-4.1.so.0.
- **Resolution:**
  - Ubuntu / Debian: `sudo apt install -y libwebkit2gtk-4.1-0`
  - Fedora / RHEL: `sudo dnf install -y webkit2gtk4.1`

---

## 3. Web Docker Issues
### WebSocket Connection Error (HTTP 400 or 502)
- **Symptom:** Terminal connects briefly and immediately closes.
- **Resolution:** Ensure reverse proxy passes WebSocket upgrade headers (`Upgrade: $http_upgrade` and `Connection: "upgrade"`). See docs/INSTALL-DOCKER.md.

