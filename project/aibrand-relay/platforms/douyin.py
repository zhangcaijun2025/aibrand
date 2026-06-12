"""抖音 (Douyin) OAuth2 平台集成."""

from datetime import datetime, timedelta

import httpx

from storage.models import PlatformToken
from .base import OAuth2Platform


class DouyinPlatform(OAuth2Platform):
    """抖音开放平台 OAuth2 — https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/account-permission"""

    platform_name = "douyin"

    auth_url = "https://open.douyin.com/platform/oauth/connect"
    token_url = "https://open.douyin.com/oauth/access_token"
    # Fallback URL for trial/test mode
    trial_auth_url = "https://open.douyin.com/oauth/authorize"
    user_info_url = "https://open.douyin.com/oauth/userinfo"

    # 抖音 scope: user_info 获取用户公开信息
    DEFAULT_SCOPE = "user_info"

    def get_auth_params(self, state: str) -> dict:
        return {
            "client_key": self.client_id,
            "scope": self.DEFAULT_SCOPE,
            "response_type": "code",
        }

    def build_auth_url(self, state: str) -> str:
        # 抖音用 client_key 而不是 client_id
        params = {
            "client_key": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "state": state,
            "scope": self.DEFAULT_SCOPE,
        }
        qs = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{self.auth_url}?{qs}"

    def get_token_params(self, code: str) -> dict:
        # 抖音用 client_key 而不是 client_id
        return {"client_key": self.client_id}

    def parse_token_response(self, data: dict) -> PlatformToken:
        if "data" in data:
            inner = data["data"]
        else:
            inner = data

        if "error_code" in data and data["error_code"] != 0:
            raise Exception(f"Douyin token error: {data.get('description', 'unknown')}")

        expires_in = inner.get("expires_in", 3600 * 24 * 15)  # 默认 15 天
        return PlatformToken(
            platform=self.platform_name,
            platform_uid=inner.get("open_id", ""),
            access_token=inner["access_token"],
            refresh_token=inner.get("refresh_token"),
            expires_at=datetime.now() + timedelta(seconds=expires_in),
            scopes=inner.get("scope", "").split(",") if inner.get("scope") else [self.DEFAULT_SCOPE],
        )

    # ── 抖音用户信息 ──────────────────────────────

    async def fetch_channel_info(self, token: PlatformToken) -> dict:
        """获取已授权用户的抖音账号信息."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                self.user_info_url,
                params={
                    "access_token": token.access_token,
                    "open_id": token.platform_uid,
                },
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
                "uid": user.get("open_id", token.platform_uid),
                "nickname": user.get("nickname", f"抖音用户_{token.platform_uid[:8]}"),
                "avatar": user.get("avatar", user.get("avatar_larger", "")),
                "description": user.get("signature", ""),
                "follower_count": user.get("follower_count", 0),
                "following_count": user.get("following_count", 0),
                "video_count": user.get("item_count", 0),
            }

    async def proxy_request(
        self, token: PlatformToken, method: str, path: str, body: dict | None = None
    ) -> dict:
        """代理请求到抖音开放平台 API."""
        url = f"https://open.douyin.com/{path.lstrip('/')}"
        params = {"access_token": token.access_token, "open_id": token.platform_uid}
        async with httpx.AsyncClient() as client:
            resp = await client.request(
                method,
                url,
                params=params,
                json=body,
                headers={"Content-Type": "application/json"},
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()
