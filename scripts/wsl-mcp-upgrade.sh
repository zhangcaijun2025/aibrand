#!/bin/sh
echo "=== hermes-agent venv 位置 ==="
ls /root/.local/share/uv/tools/ 2>&1
ls /root/.local/share/uv/tools/hermes-agent/bin/ 2>&1
echo "=== mcp 版本 ==="
/root/.local/share/uv/tools/hermes-agent/bin/python -c "import mcp; print(getattr(mcp,'__version__','?'))" 2>&1
echo "=== 升级 mcp ==="
timeout 180 /usr/local/bin/uv pip install --python /root/.local/share/uv/tools/hermes-agent/bin/python --upgrade mcp 2>&1
echo "EXIT=$?"
echo "=== 升级后版本 ==="
/root/.local/share/uv/tools/hermes-agent/bin/python -c "import mcp; print(getattr(mcp,'__version__','?'))" 2>&1