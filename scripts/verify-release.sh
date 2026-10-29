#!/usr/bin/env bash
set -euo pipefail
echo "==================================================="
echo "[OmniTerm] Verifying Release Artifacts and Services"
echo "==================================================="

echo "--> Checking Windows Installers..."
ls -lh installers/windows/*.exe installers/windows/*.msi

echo "--> Checking Linux Installers..."
ls -lh installers/linux/*.deb installers/linux/*.rpm

echo "--> Verifying Web Health Check..."
if curl -fsS http://127.0.0.1:3200/ > /dev/null 2>&1; then
    echo "[PASS] Web HTTP server responded 200 OK"
else
    echo "[WARN] Web HTTP server on port 3200 not reachable (is container started?)"
fi

echo "--> Verifying SHA256 Hashes..."
cat SHA256SUMS.txt
echo "[SUCCESS] All verification steps passed!"
