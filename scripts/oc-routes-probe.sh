#!/bin/sh
echo "=== routes file ==="
grep -oE "\"/api/[a-zA-Z0-9/_-]+\"" /app/dist/routes-Cam04GYV.js | sort -u | head -40
echo "=== bridge-server ==="
grep -oE "\"/api/[a-zA-Z0-9/_-]+\"" /app/dist/bridge-server-Ctia_MEw.js | sort -u | head -20