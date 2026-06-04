"""YouTube (Google OAuth2) platform integration."""

import time
from datetime import datetime, timedelta

import httpx

from storage.models import PlatformToken
from .base import OAuth2Platform


class YouTubePlatform(OAuth2Platform):
    """YouTube Data API v3 via Google OAuth2."""

    platform_name = "youtube"

    auth_url = "https://accounts.google.com/o/oauth2/v2/auth"
    token_url = "https://oauth2.googleapis.com/token"

    # YouTube scopes
    DEFAULT_SCOPES = [
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.force-ssl",
        "openid",
        "profile",
    ]

    def get_auth_params(self, state: str) -> dict:
        return {
            "scope": " ".join(self.DEFAULT_SCOPES),
            "access_type": "offline",  # Get refresh_token
            "prompt": "consent",       # Force consent screen to get refresh_token
        }

    def get_token_params(self, code: str) -> dict:
        return {}  # Google uses standard OAuth2 params only

    def parse_token_response(self, data: dict) -> PlatformToken:
        expires_in = data.get("expires_in", 3600)
        return PlatformToken(
            platform=self.platform_name,
            platform_uid="",  # Filled after fetching channel info
            access_token=data["access_token"],
            refresh_token=data.get("refresh_token"),
            expires_at=datetime.now() + timedelta(seconds=expires_in),
            scopes=data.get("scope", "").split(),
        )

    # ── YouTube-specific ─────────────────────────────

    async def fetch_channel_info(self, token: PlatformToken) -> dict:
        """Fetch the authenticated user's YouTube channel."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/youtube/v3/channels",
                params={"part": "snippet,statistics", "mine": "true"},
                headers={"Authorization": f"Bearer {token.access_token}"},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            items = data.get("items", [])
            if items:
                channel = items[0]
                return {
                    "uid": channel["id"],
                    "nickname": channel["snippet"]["title"],
                    "avatar": channel["snippet"]["thumbnails"]["default"]["url"],
                    "subscriber_count": int(channel["statistics"].get("subscriberCount", 0)),
                }
            return {}

    async def proxy_request(
        self, token: PlatformToken, method: str, path: str, body: dict | None = None
    ) -> dict:
        """Proxy a request to YouTube API."""
        url = f"https://www.googleapis.com/youtube/v3/{path.lstrip('/')}"
        async with httpx.AsyncClient() as client:
            resp = await client.request(
                method,
                url,
                json=body,
                headers={"Authorization": f"Bearer {token.access_token}"},
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()
