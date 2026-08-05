#!/bin/sh
PY=/root/.local/share/uv/tools/hermes-agent/bin/python
echo "=== mcp 包位置 ==="
$PY -c "import mcp, os; print(os.path.dirname(mcp.__file__))" 2>&1
echo "=== client 子模块 ==="
$PY -c "import mcp.client, pkgutil; print([m.name for m in pkgutil.iter_modules(mcp.client.__path__)])" 2>&1
echo "=== streamable_http 检查 ==="
$PY -c "from mcp.client import streamable_http; print('streamable_http OK')" 2>&1
echo "=== hermes 自己的 mcp 检测逻辑 ==="
grep -rn "streamable_http" /root/.local/share/uv/tools/hermes-agent/lib/python3.11/site-packages/tools/mcp_tool.py 2>&1 | head -5