#!/usr/bin/env python3
"""AiBrand Five-Layer Health Probe Dashboard"""
import requests, time, sys, io
from datetime import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ENDPOINTS = {
    "L5 OpenClaw":     ("http://localhost:19001/health", "GET"),
    "L4 Dify":         ("http://localhost:5001/health", "GET"),
    "L3 LangChain":    ("http://localhost:4010/health", "GET"),
    "L2 n8n":          ("http://localhost:5678/healthz", "GET"),
    "L1 Claude Bridge":("http://localhost:4020/health", "GET"),
    "Backend API":     ("http://localhost:8080/api/health", "GET"),
    "Frontend":        ("http://localhost:6060/zh-CN/welcome", "GET"),
}

def check(name, url, method):
    start = time.time()
    try:
        r = requests.get(url, timeout=10) if method == "GET" else requests.post(url, json={"test":True}, timeout=10)
        lat = int((time.time() - start) * 1000)
        ok = r.status_code < 500
        return (name, ok, r.status_code, lat)
    except Exception as e:
        return (name, False, 0, 0)

def main():
    print(f"\n{'='*60}")
    print(f"  AiBrand Five-Layer Health Probe")
    print(f"  {datetime.now().isoformat()}")
    print(f"{'='*60}")

    results = [check(n, u, m) for n, (u, m) in ENDPOINTS.items()]

    for name, ok, code, lat in results:
        icon = "[OK]" if ok else "[!!]"
        print(f"  {icon} {name:20s} -> HTTP {code} ({lat}ms)")

    up = sum(1 for _, ok, _, _ in results if ok)
    total = len(results)

    print(f"\n{'='*60}")
    print(f"  Total: {up}/{total} healthy")
    print(f"  Status: {'ALL SYSTEMS GO' if up == total else 'ISSUES DETECTED'}")
    print(f"{'='*60}\n")
    return 0 if up == total else 1

if __name__ == "__main__":
    sys.exit(main())
