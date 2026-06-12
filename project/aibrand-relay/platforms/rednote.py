"""小红书 (Rednote / XHS) OAuth2 平台集成."""

from datetime import datetime, timedelta

import httpx

from storage.models import PlatformToken
from .base import OAuth2Platform


class RednotePlatform(OAuth2Platform):
    """小红书开放平台 OAuth2 — https://open.xiaohongshu.com/document/develop/oauth2"""

    platform_name = "rednote"

    auth_url = "https://open.xiaohongshu.com/oauth2/authorize"
    token_url = "https://open.xiaohongshu.com/oauth2/token"
    user_info_url = "https://open.xiaohongshu.com/v2/user/me"

    DEFAULT_SCOPE = "user_info"

    def get_auth_params(self, state: str) -> dict:
        return {
            "scope": self.DEFAULT_SCOPE,
            "response_type": "code",
        }

    def get_token_params(self, code: str) -> dict:
        return {}

    def parse_token_response(self, data: dict) -> PlatformToken:
        if "data" in data:
            inner = data["data"]
        else:
            inner = data

        if data.get("code") and data["code"] != 0:
            raise Exception(f"Rednote token error: {data.get('msg', 'unknown')}")

        expires_in = inner.get("expires_in", 3600 * 24 * 30)
        return PlatformToken(
            platform=self.platform_name,
            platform_uid=inner.get("open_id", ""),
            access_token=inner["access_token"],
            refresh_token=inner.get("refresh_token"),
            expires_at=datetime.now() + timedelta(seconds=expires_in),
            scopes=inner.get("scope", "").split() if inner.get("scope") else [self.DEFAULT_SCOPE],
        )

    # ── 小红书用户信息 ──────────────────────────────

    async def fetch_channel_info(self, token: PlatformToken) -> dict:
        """获取已授权用户的小红书账号信息."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                self.user_info_url,
                params={"access_token": token.access_token},
                headers={"Content-Type": "application/json"},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()

            if "data" in data:
                user = data["data"]
            else:
                user = data

            return {
                "uid": user.get("open_id", user.get("id", token.platform_uid)),
                "nickname": user.get("nickname", user.get("name", f"小红书用户_{token.platform_uid[:8]}")),
                "avatar": user.get("avatar", user.get("avatar_url", "")),
                "description": user.get("desc", user.get("description", "")),
                "follower_count": user.get("follower_count", user.get("fans", 0)),
                "following_count": user.get("following_count", 0),
                "note_count": user.get("note_count", user.get("notes", 0)),
            }

    async def proxy_request(
        self, token: PlatformToken, method: str, path: str, body: dict | None = None
    ) -> dict:
        """代理请求到小红书开放平台 API."""
        url = f"https://open.xiaohongshu.com/{path.lstrip('/')}"
        async with httpx.AsyncClient() as client:
            resp = await client.request(
                method,
                url,
                params={"access_token": token.access_token},
                json=body,
                headers={"Content-Type": "application/json"},
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()
