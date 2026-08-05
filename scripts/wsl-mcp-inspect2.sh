#!/bin/sh
PY=/root/.local/share/uv/tools/hermes-agent/bin/python
echo "=== mcp_tool.py 208-260 行 ==="
awk 'NR>=208 && NR<=260' /root/.local/share/uv/tools/hermes-agent/lib/python3.11/site-packages/tools/mcp_tool.py 2>&1
echo "=== 2538-2560 行 ==="
awk 'NR>=2538 && NR<=2560' /root/.local/share/uv/tools/hermes-agent/lib/python3.11/site-packages/tools/mcp_tool.py 2>&1
echo "=== mcp.client.streamable_http 有哪些导出 ==="
$PY -c "import mcp.client.streamable_http as s; print([x for x in dir(s) if 'client' in x.lower()])" 2>&1