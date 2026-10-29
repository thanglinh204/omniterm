#!/usr/bin/env bash
set -euo pipefail
echo "==================================================="
echo "[OmniTerm] Building Linux Distribution (.deb, .rpm, .AppImage)"
echo "==================================================="
export PATH="/c/Users/Administrator/.cargo/bin:/c/Users/Administrator/bin:/mingw64/bin:/usr/local/bin:/usr/bin:/bin:/mingw64/bin:/usr/bin:/c/Users/Administrator/bin:/mingw64/bin:/usr/bin:/bin:/c/Users/Administrator/AppData/Local/hermes/hermes-agent/venv/Scripts:/c/Users/Administrator/AppData/Local/hermes/hermes-agent/.hermes/bin:/c/Users/Administrator/AppData/Local/hermes/installs/bd3acbc64406c95b/environments/9c262e096baa4c9ba82a87d32dfb455c/venv/Scripts:/c/Program Files/Python314/Scripts:/c/Program Files/Python314:/c/Windows/system32:/c/Windows:/c/Windows/System32/Wbem:/c/Windows/System32/WindowsPowerShell/v1.0:/c/Windows/System32/OpenSSH:/c/Program Files/PowerShell/7:/cmd:/c/Program Files/nodejs:/c/Program Files/Microsoft VS Code/bin:/c/Program Files/Microsoft VS Code/bin/copilot-shim:/c/Users/Administrator/.cargo/bin:/c/Users/Administrator/AppData/Local/hermes/bin:/c/Users/Administrator/AppData/Local/hermes/tools/python-3.14.9+20261021-win32-x64:/c/Users/Administrator/AppData/Local/Microsoft/WindowsApps:/c/Users/Administrator/AppData/Roaming/npm:/c/Users/Administrator/AppData/Roaming/npm/node_modules/@anthropic-ai/claude-code/bin:/c/Users/Administrator/AppData/Local/Programs/Cua/cua-driver/bin:/c/Users/Administrator/AppData/Local/hermes/tools/cua-driver-0.21.0-win32-x64:/c/Users/Administrator/AppData/Local/hermes/tools/ffmpeg-9.0.1-win32-x64/bin:/c/Users/Administrator/AppData/Local/hermes/tools/npm-12.0.2-win32-x64:/c/Users/Administrator/AppData/Local/hermes/tools/node-26.12.1-win32-x64:/c/Users/Administrator/AppData/Local/hermes/tools/ripgrep-15.2.0-win32-x64:/usr/bin/vendor_perl:/usr/bin/core_perl"

npm run build
cargo tauri build -c '{"build":{"beforeBuildCommand":""}}'

# Package AppImage if AppDir is present
if [ -d "src-tauri/target/release/bundle/appimage/OmniTerm.AppDir" ]; then
    echo "Packaging AppImage..."
    cd src-tauri/target/release/bundle/appimage
    ARCH=x86_64 appimagetool OmniTerm.AppDir OmniTerm_0.1.0_amd64.AppImage || true
    cd ../../../..
fi

echo "[SUCCESS] Linux packages generated in src-tauri/target/release/bundle/"
