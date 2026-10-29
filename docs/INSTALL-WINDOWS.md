# OmniTerm Windows Installation Guide

## 1. System Requirements
- **Operating System:** Windows 10 (64-bit, build 19041+) or Windows 11.
- **Hardware:** 2 Core CPU, 2 GB RAM, 100 MB free disk space.
- **Prerequisite:** Microsoft Edge WebView2 Runtime (pre-installed by default on modern Windows 10/11). If needed, download the Evergreen Bootstrapper from [Microsoft WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

---

## 2. Installation Options

### Option A: Standard NSIS Installer (Recommended)
1. Download `OmniTerm-Setup-v0.1.0-win-x64.exe` from [GitHub Releases](https://github.com/thanglinh204/omniterm/releases/tag/v0.1.0) or locate it in `installers/windows/`.
2. Run the installer. You can select custom installation directory (default: `%LOCALAPPDATA%\Programs\OmniTerm`).
3. Select Start Menu and Desktop shortcuts as desired.
4. Click **Install**. Launch OmniTerm upon completion.

#### Silent Unattended Installation
```cmd
OmniTerm-Setup-v0.1.0-win-x64.exe /S
```

---

### Option B: Enterprise MSI Package
For domain deployment via Group Policy (GPO), Microsoft Endpoint Configuration Manager (SCCM), or InTune:
```cmd
msiexec /i OmniTerm-v0.1.0-win-x64.msi /qn /norestart
```

---

### Option C: Portable Zero-Install
1. Download `OmniTerm-v0.1.0-win-x64-portable.zip`.
2. Extract the archive to any folder (e.g. `D:\Tools\OmniTerm`).
3. Run `omniterm.exe` directly without administrative privileges.

---

## 3. Configuration & Data Directory
- **User Sessions & Profiles:** `%APPDATA%\com.suncloud.omniterm\`
- **Cache & Logs:** `%LOCALAPPDATA%\com.suncloud.omniterm\`

---

## 4. Upgrade & Uninstallation
- **Upgrade:** Run the new setup `.exe` or `.msi`. User sessions and private key configurations are automatically preserved.
- **Uninstall:** Navigate to **Windows Settings > Apps > Installed apps**, locate **OmniTerm**, and click **Uninstall**. User data in `%APPDATA%` is kept intact to prevent data loss.
