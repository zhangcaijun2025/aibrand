"""Data models for Relay server."""

from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional


@dataclass
class PlatformToken:
    """Stored OAuth token for a platform account."""
    platform: str
    platform_uid: str
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    scopes: list[str] = field(default_factory=list)
    extra: dict = field(default_factory=dict)  # platform-specific data

    def is_expired(self) -> bool:
        if not self.expires_at:
            return False
        return datetime.now() >= self.expires_at

    def to_dict(self) -> dict:
        d = asdict(self)
        d["expires_at"] = self.expires_at.isoformat() if self.expires_at else None
        return d

    @classmethod
    def from_dict(cls, data: dict) -> "PlatformToken":
        data = dict(data)
        if data.get("expires_at") and isinstance(data["expires_at"], str):
            data["expires_at"] = datetime.fromisoformat(data["expires_at"])
        return cls(**data)


@dataclass
class AuthState:
    """Temporary state during OAuth flow."""
    state: str
    platform: str
    user_id: str
    callback_url: str
    created_at: datetime = field(default_factory=datetime.now)
