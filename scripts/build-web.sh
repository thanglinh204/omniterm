#!/usr/bin/env bash
set -euo pipefail
echo "==================================================="
echo "[OmniTerm] Building Web Docker Container"
echo "==================================================="
docker compose -f deploy/docker/compose.yaml build
docker compose -f deploy/docker/compose.yaml up -d
echo "[SUCCESS] OmniTerm Web is running at http://localhost:3200"
