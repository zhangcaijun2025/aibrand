"""Encrypted token storage using AES-256 (Fernet)."""

import json
import os
import threading
from pathlib import Path
from typing import Optional

from cryptography.fernet import Fernet

from .models import PlatformToken

TOKEN_FILE = Path(os.getenv("TOKEN_STORE_PATH", Path(__file__).parent / "tokens.json"))


class TokenStore:
    """File-based encrypted token store. Replace with DB in production."""

    def __init__(self, encryption_key: str):
        self._fernet = Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)
        self._lock = threading.Lock()
        self._cache: dict[str, PlatformToken] = {}
        self._load()

    # ── public API ────────────────────────────────

    def save(self, token: PlatformToken) -> None:
        key = self._make_key(token.platform, token.platform_uid)
        with self._lock:
            self._cache[key] = token
            self._persist()

    def get(self, platform: str, platform_uid: str) -> Optional[PlatformToken]:
        key = self._make_key(platform, platform_uid)
        with self._lock:
            return self._cache.get(key)

    def delete(self, platform: str, platform_uid: str) -> bool:
        key = self._make_key(platform, platform_uid)
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                self._persist()
                return True
        return False

    # ── internal ───────────────────────────────────

    def _make_key(self, platform: str, uid: str) -> str:
        return f"{platform}:{uid}"

    def _persist(self) -> None:
        data = {k: t.to_dict() for k, t in self._cache.items()}
        plain = json.dumps(data, ensure_ascii=False, indent=2)
        encrypted = self._fernet.encrypt(plain.encode())
        TOKEN_FILE.write_bytes(encrypted)

    def _load(self) -> None:
        if not TOKEN_FILE.exists():
            return
        try:
            encrypted = TOKEN_FILE.read_bytes()
            plain = self._fernet.decrypt(encrypted)
            data = json.loads(plain)
            self._cache = {k: PlatformToken.from_dict(v) for k, v in data.items()}
        except Exception:
            # Corrupted or old format — start fresh
            self._cache = {}
