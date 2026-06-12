"""Inspect n8n database for workflows and webhooks"""
import sqlite3
import os
import sys

DB_PATH = os.path.join(os.environ.get('TEMP', '/tmp'), 'n8n_inspect.sqlite')

if not os.path.exists(DB_PATH):
    print(f"DB not found: {DB_PATH}")
    sys.exit(1)

conn = sqlite3.connect(DB_PATH)

# List tables
tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
print("=== Tables ===")
for t in tables:
    print(f"  {t[0]}")

# Try to find workflow-like tables
for table_name in [r[0] for r in tables]:
    if 'workflow' in table_name.lower():
        cols = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
        col_names = [c[1] for c in cols]
        print(f"\n=== {table_name} ({', '.join(col_names)}) ===")
        rows = conn.execute(f"SELECT * FROM {table_name}").fetchall()
        for r in rows:
            print(f"  {r}")

conn.close()
