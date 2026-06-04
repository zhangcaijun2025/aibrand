"""APScheduler 定时任务 — 行情轮询 + 数据更新"""

from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime

scheduler = BackgroundScheduler(daemon=True)
_cache = {"last_market_update": None}


def _update_market_data():
    """每 60s 更新行情数据"""
    from .data_source import get_realtime_quote, get_market_sentiment

    try:
        quote = get_realtime_quote("600519")
        sentiment = get_market_sentiment()
        _cache["last_market_update"] = datetime.now().isoformat()
        _cache["last_quote"] = quote
        _cache["last_sentiment"] = sentiment
    except Exception as e:
        print(f"[Scheduler] Market update error: {e}")


def start_scheduler():
    """启动定时任务"""
    _update_market_data()
    scheduler.add_job(_update_market_data, "interval", seconds=60, id="market_poll")
    scheduler.start()
    print(f"[Scheduler] Started at {datetime.now().strftime('%H:%M:%S')}")


def get_cached(key, default=None):
    return _cache.get(key, default)


def stop_scheduler():
    scheduler.shutdown(wait=False)
