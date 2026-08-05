#!/bin/sh
echo "=== 降级 mcp 1.28.1 (与宿主一致) ==="
timeout 180 /usr/local/bin/uv pip install --python /root/.local/share/uv/tools/hermes-agent/bin/python mcp==1.28.1 2>&1
echo "EXIT=$?"
echo "=== 验证两个导入名 ==="
/root/.local/share/uv/tools/hermes-agent/bin/python -c "
from mcp.client.streamable_http import streamablehttp_client
from mcp.client.streamable_http import streamable_http_client
print('both names OK')
" 2>&1