#!/bin/sh
set -e
PORT=3200
if curl -fsS http://localhost:$PORT/api/resources > /dev/null 2>&1 || wget -q --spider http://localhost:$PORT/api/resources 2>&1; then
  echo "OmniTerm Web is healthy and responding on port $PORT"
  exit 0
else
  echo "OmniTerm Web health check failed on port $PORT"
  exit 1
fi
