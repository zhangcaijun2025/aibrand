# -*- coding: utf-8 -*-
"""
ruFlo ↔ AI选股系统 集成测试 (PoC)
运行在 N8N 容器内，调用主机 port 4000/4002 数据
"""

import json, subprocess, sys, os, requests
from datetime import datetime

def run(cmd, timeout=30):
    """在容器内执行 ruflo CLI 命令"""
    full_cmd = f"export PATH=$PATH:/home/node/.local/bin && cd /home/node && {cmd}"
    r = subprocess.run(['docker', 'exec', 'n8n', 'sh', '-c', full_cmd],
                       capture_output=True, text=True, timeout=timeout)
    return r.stdout, r.stderr

print("=" * 60)
print(f"ruFlo ↔ AI选股系统 集成测试")
print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
print("=" * 60)

# ─── Step 1: 从现有系统获取市场数据 ───
print("\n[1/5] 获取现有AI选股系统数据...")

# 从 port 4000 获取市场数据
try:
    resp = requests.get("http://host.docker.internal:4000/api/data/market", timeout=10)
    market_data = resp.json()
    print(f"  市场数据: {len(market_data)} 字段 ✓")
except Exception as e:
    print(f"  市场数据失败: {e}")
    market_data = {"模拟": "数据"}

# 从 port 4000 获取板块资金流
try:
    resp = requests.get("http://host.docker.internal:4000/api/data/sector-flow", timeout=10)
    sector_data = resp.json()
    sector_count = len(sector_data.get('sectors', []))
    print(f"  板块资金流: {sector_count} 板块 ✓")
except Exception as e:
    print(f"  板块资金流失败: {e}")
    sector_data = {}

# 从 port 4002 获取智库报告
try:
    resp = requests.get("http://host.docker.internal:4002/api/digest", timeout=10)
    digest = resp.json().get('digest', '')
    print(f"  智库日报: {len(digest)} 字符 ✓")
except Exception as e:
    print(f"  智库日报失败: {e}")
    digest = ""

# 构建分析上下文
analysis_context = {
    "market": market_data,
    "sectors": sector_data,
    "think_tank_digest": digest[:2000] if digest else "",
    "timestamp": datetime.now().isoformat(),
}
ctx_file = "/home/node/.claude-flow/data/poc_analysis_context.json"
with open(f"/tmp/poc_ctx.json", "w") as f:
    json.dump(analysis_context, f, ensure_ascii=False)

# 复制到容器
subprocess.run(['docker', 'cp', '/tmp/poc_ctx.json', 'n8n:/home/node/.claude-flow/data/poc_ctx.json'],
               capture_output=True, timeout=5)

print(f"\n[2/5] 创建 ruFlo 分析任务...")
# 使用分析agent进行市场分析
stdout, stderr = run("""
ruflo agent spawn -t researcher --name stock-analyzer 2>&1
""")
print(f"  创建agent: {'OK' if 'successfully' in stdout else stdout[:100]}")

stdout, stderr = run("""
ruflo task create -t research \\
  -d '基于智库报告和板块资金流数据，分析当前A股市场趋势与风险' \\
  --tags 'poc,stock,market,integration' 2>&1
""")
print(f"  创建任务: {stdout[:200]}")

print(f"\n[3/5] 存储市场数据到 ruFlo 记忆...")
stdout, stderr = run("""
ruflo memory store \\
  --key "poc_market_20260524" \\
  --value "$(cat /home/node/.claude-flow/data/poc_ctx.json | head -c 2000)" 2>&1
""")
print(f"  记忆存储: {stdout[:100]}")

print(f"\n[4/5] 查看现有AI选股系统的 Top5 推荐...")
try:
    resp = requests.get("http://host.docker.internal:4000/api/data/industry-tracker", timeout=10)
    industry = resp.json()
    for k, v in industry.items():
        if isinstance(v, dict):
            print(f"  {k}: {json.dumps(v, ensure_ascii=False)[:100]}...")
except Exception as e:
    print(f"  行业追踪失败: {e}")

print(f"\n[5/5] 检查 ruFlo daemon & agent 状态...")
stdout, stderr = run("ruflo daemon status 2>&1 | head -8")
print(f"  Daemon: {'RUNNING' if 'RUNNING' in stdout else 'STOPPED'}")

stdout, stderr = run("ruflo agent list 2>&1")
print(f"  Agents: {stdout[:200]}")

stdout, stderr = run("""
ruflo memory stats 2>&1 | head -5
""")
print(f"  Memory: {stdout[:100]}")

print("\n" + "=" * 60)
print("  集成测试完成")
print("=" * 60)
