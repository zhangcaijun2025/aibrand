#!/bin/sh
sed -i 's|"main": "./index.js"|"main": "./src/index.js"|' /app/libs/ai-services/package.json
grep '"main"' /app/libs/ai-services/package.json
