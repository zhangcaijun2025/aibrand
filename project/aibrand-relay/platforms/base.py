"""OAuth2 base class — all platform integrations extend this."""

import secrets
from abc import ABC, abstractmethod
from typing import Optional

import httpx

from storage.models import AuthState, PlatformToken


class OAuth2Platform(ABC):
    """Abstract OAuth2 handler for a social platform."""

    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri

    # ── subclasses must implement ───────────────────

    @property
    @abstractmethod
    def platform_name(self) -> str:
        """e.g. 'youtube', 'douyin'."""
        ...

    @property
    @abstractmethod
    def auth_url(self) -> str:
        """Platform's OAuth authorization endpoint."""
        ...

    @property
    @abstractmethod
    def token_url(self) -> str:
        """Platform's token exchange endpoint."""
        ...

    @abstractmethod
    def get_auth_params(self, state: str) -> dict:
        """Extra query params for the auth URL."""
        ...

    @abstractmethod
    def get_token_params(self, code: str) -> dict:
        """Body params for token exchange."""
        ...

    @abstractmethod
    def parse_token_response(self, data: dict) -> PlatformToken:
        """Convert platform's token response to our PlatformToken."""
        ...

    # ── shared OAuth2 flow ───────────────────────────

    def build_auth_url(self, state: str) -> str:
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "state": state,
            **self.get_auth_params(state),
        }
        qs = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{self.auth_url}?{qs}"

    async def exchange_code(self, code: str) -> PlatformToken:
        body = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code",
            "code": code,
            **self.get_token_params(code),
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(self.token_url, data=body, timeout=15)
            resp.raise_for_status()
            return self.parse_token_response(resp.json())

    async def refresh_token(self, token: PlatformToken) -> PlatformToken:
        if not token.refresh_token:
            raise ValueError("No refresh token available")
        body = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "refresh_token",
            "refresh_token": token.refresh_token,
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(self.token_url, data=body, timeout=15)
            resp.raise_for_status()
            new_token = self.parse_token_response(resp.json())
            new_token.platform_uid = token.platform_uid
            new_token.extra = token.extra
            return new_token

    @staticmethod
    def generate_state() -> str:
        return secrets.token_urlsafe(32)
