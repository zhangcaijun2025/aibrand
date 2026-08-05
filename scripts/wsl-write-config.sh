#!/bin/sh
cat > ~/.hermes/config.yaml <<'YAML'
model:
  provider: deepseek
  default: deepseek-chat
mcp_servers:
  aibrand:
    url: http://172.22.32.1:3099/api/mcp
    headers:
      Cookie: aibrand_token=dev_auto_login_token
    enabled: true
YAML
echo "=== written ==="
cat ~/.hermes/config.yaml 2>&1