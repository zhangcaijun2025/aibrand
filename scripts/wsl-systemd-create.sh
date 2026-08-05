#!/bin/sh
echo "=== 检查是否已有 hermes 服务 ==="
ls /etc/systemd/system/ | grep -i hermes 2>&1
echo "=== 创建 hermes-gateway.service ==="
cat > /etc/systemd/system/hermes-gateway.service <<'EOF'
[Unit]
Description=Hermes Agent Gateway (WSL deepin) - cron scheduler + messaging
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
Environment=PATH=/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:/usr/local/bin:/usr/bin:/bin
Environment=HOME=/root
ExecStart=/root/.local/bin/hermes gateway run
Restart=on-failure
RestartSec=10
# 不启用消息平台, 仅作为 cron 调度器常驻
# 日志
StandardOutput=append:/var/log/hermes-gateway.log
StandardError=append:/var/log/hermes-gateway.log

[Install]
WantedBy=multi-user.target
EOF
echo "=== 创建 hermes-serve.service ==="
cat > /etc/systemd/system/hermes-serve.service <<'EOF'
[Unit]
Description=Hermes Agent Backend Server (JSON-RPC/WebSocket, port 9119)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
Environment=PATH=/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:/usr/local/bin:/usr/bin:/bin
Environment=HOME=/root
ExecStart=/root/.local/bin/hermes serve --port 9119 --skip-build
Restart=on-failure
RestartSec=10
StandardOutput=append:/var/log/hermes-serve.log
StandardError=append:/var/log/hermes-serve.log

[Install]
WantedBy=multi-user.target
EOF
echo "=== 文件确认 ==="
ls -la /etc/systemd/system/hermes-*.service 2>&1