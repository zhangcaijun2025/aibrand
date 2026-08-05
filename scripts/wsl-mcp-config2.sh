#!/bin/sh
cat > ~/.hermes/config.yaml <<'YAML'
model:
  provider: deepseek
  default: deepseek-chat
mcp_servers:
  aibrand:
    command: /opt/node-v26.6.0-linux-x64/bin/node
    args:
      - /root/scripts/aibrand-mcp-server.mjs
      - --env
      - AIBRAND_MCP_URL=http://172.22.32.1:3099
    env:
      AIBRAND_MCP_URL: http://172.22.32.1:3099
      AIBRAND_MCP_COOKIE: aibrand_token=dev_auto_login_token
    enabled: true
YAML
echo "=== written ==="
cat ~/.hermes/config.yaml