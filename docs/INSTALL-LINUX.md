# OmniTerm Linux Installation Guide

OmniTerm supports major Linux distributions on `x86_64` (amd64) architecture.

---

## 1. Debian / Ubuntu / Linux Mint (.deb)
Supported: Ubuntu 20.04 LTS+, Debian 11+, Linux Mint 20+, Pop!_OS.

### Installation
```bash
# 1. Download Debian package
wget https://github.com/thanglinh204/omniterm/releases/download/v0.1.0/OmniTerm-v0.1.0-linux-x64.deb

# 2. Install via apt (automatically resolves WebKitGTK and libayatana dependencies)
sudo apt update
sudo apt install -y ./OmniTerm-v0.1.0-linux-x64.deb
```

### Launch
```bash
# Via terminal
omniterm

# Or search "OmniTerm" in GNOME / KDE / XFCE Application Menu
```

### Uninstallation
```bash
sudo apt remove omniterm
```

---

## 2. Fedora / RHEL / CentOS / Rocky Linux (.rpm)
Supported: Fedora 38+, RHEL 9+, CentOS Stream 9+, Rocky Linux 9+, openSUSE Leap 15+.

### Installation
```bash
# 1. Download RPM package
wget https://github.com/thanglinh204/omniterm/releases/download/v0.1.0/OmniTerm-v0.1.0-linux-x64.rpm

# 2. Install via dnf
sudo dnf install -y ./OmniTerm-v0.1.0-linux-x64.rpm
```

### Uninstallation
```bash
sudo dnf remove omniterm
```

---

## 3. Universal Linux AppImage (No Root Required)
Supported across any Linux distribution with glibc 2.31+.

### Usage
```bash
# 1. Download AppImage
wget https://github.com/thanglinh204/omniterm/releases/download/v0.1.0/OmniTerm-v0.1.0-linux-x64.AppImage

# 2. Make executable and launch
chmod +x OmniTerm-v0.1.0-linux-x64.AppImage
./OmniTerm-v0.1.0-linux-x64.AppImage
```

---

## 4. User Configuration & Logs
- **Configuration & Sessions:** `~/.config/com.suncloud.omniterm/`
- **Application Data:** `~/.local/share/com.suncloud.omniterm/`
