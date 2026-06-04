"""AI 选股系统配置"""

import os

# 服务端口
AI_STOCK_PORT = int(os.getenv("AI_STOCK_PORT", "4000"))
HEALTH_MONITOR_PORT = int(os.getenv("HEALTH_MONITOR_PORT", "3998"))

# Debug 模式（生产环境必须 False）
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# 数据源
DATA_SOURCE = os.getenv("DATA_SOURCE", "akshare")
FALLBACK_SOURCE = os.getenv("FALLBACK_SOURCE", "tushare")

# API 密钥
DIFY_API_KEY = os.getenv("DIFY_API_KEY", "")
N8N_API_KEY = os.getenv("N8N_API_KEY", "")
