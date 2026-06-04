"""
AiBrand Relay Server — Self-hosted OAuth proxy for social platforms.

Replaces the aitoearn.cn relay dependency.
Protocol: Compatible with existing RelayExceptionFilter in aitoearn-backend.

Architecture:
  AiBrand → THIS RELAY → Platform OAuth
  (改 1 行 RELAY_SERVER_URL env, 其余代码不变)
"""

import os
import secrets
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel

from platforms.base import OAuth2Platform
from platforms.youtube import YouTubePlatform
from storage.models import AuthState
from storage.token_store import TokenStore

# ── Config ─────────────────────────────────────

load_dotenv()

ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "change-me")
AIBRAND_CALLBACK = os.getenv("AIBRAND_CALLBACK_URL", "http://localhost:8080/api/plat/relay-callback")

# ── Global state ───────────────────────────────

token_store: Optional[TokenStore] = None
platforms: dict[str, object] = {}  # platform_name → OAuth2Platform
pending_states: dict[str, AuthState] = {}  # state → AuthState


def get_platform(name: str):
    """Get a registered platform handler."""
    p = platforms.get(name)
    if not p:
        raise HTTPException(400, f"Platform '{name}' not configured")
    return p


# ── App lifecycle ──────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global token_store
    token_store = TokenStore(ENCRYPTION_KEY)

    # Register platforms that have credentials configured
    yt_id = os.getenv("YOUTUBE_CLIENT_ID")
    if yt_id and yt_id != "your-google-client-id":
        platforms["youtube"] = YouTubePlatform(
            client_id=yt_id,
            client_secret=os.getenv("YOUTUBE_CLIENT_SECRET", ""),
            redirect_uri=os.getenv("YOUTUBE_REDIRECT_URI", ""),
        )

    print(f"Relay started. Platforms: {list(platforms.keys())}")
    yield


app = FastAPI(title="AiBrand Relay", version="0.1.0", lifespan=lifespan)


# ── Health ─────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "platforms": list(platforms.keys())}


# ── OAuth: get auth URL ────────────────────────
# Called by AiBrand when user clicks "Add Platform Account"

@app.post("/api/plat/{platform}/auth")
async def start_auth(
    platform: str,
    request: Request,
    callback_url: str = Query(None, alias="callbackUrl"),
    user_id: str = Query(None, alias="userId"),
):
    """Forwarded from AiBrand's RelayExceptionFilter."""
    p = get_platform(platform)

    state = OAuth2Platform.generate_state()
    auth_url = p.build_auth_url(state)

    # Store pending state
    pending_states[state] = AuthState(
        state=state,
        platform=platform,
        user_id=user_id or "",
        callback_url=callback_url or AIBRAND_CALLBACK,
    )

    return {"url": auth_url}


# ── OAuth: callback from platform ──────────────
# Platform redirects user here after OAuth consent

@app.get("/api/plat/{platform}/callback")
async def handle_callback(
    platform: str,
    code: str = Query(...),
    state: str = Query(...),
):
    """Platform redirects here after OAuth."""
    p = get_platform(platform)

    # Verify state
    auth_state = pending_states.pop(state, None)
    if not auth_state:
        return HTMLResponse("<h3>授权已过期，请返回重试</h3>", status_code=400)

    try:
        # Exchange code for token
        token = await p.exchange_code(code)

        # Fetch platform-specific user info
        if hasattr(p, "fetch_channel_info"):
            info = await p.fetch_channel_info(token)
            token.platform_uid = info.get("uid", "")
            token.extra = info

        # Store encrypted token
        token_store.save(token)

        # Callback to AiBrand main server
        if auth_state.callback_url:
            async with httpx.AsyncClient() as client:
                await client.post(
                    auth_state.callback_url,
                    json={
                        "accountType": platform,
                        "platformUid": token.platform_uid,
                        "nickname": token.extra.get("nickname", ""),
                        "avatar": token.extra.get("avatar", ""),
                        "relayAccountRef": token.platform_uid,
                        "taskId": auth_state.state,
                    },
                    params={"userId": auth_state.user_id},
                    timeout=10,
                )

        return HTMLResponse("<h3>授权成功！正在返回...</h3><script>window.close()</script>")

    except Exception as e:
        return HTMLResponse(f"<h3>授权失败: {e}</h3>", status_code=500)


# ── Proxy: forward API calls to platform ───────
# AiBrand's RelayExceptionFilter proxies these

@app.api_route("/api/plat/{platform}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_platform_request(
    platform: str,
    path: str,
    request: Request,
):
    """Proxy API calls from AiBrand to the actual platform."""
    p = get_platform(platform)

    # Get relay account from headers or query
    relay_account_ref = request.headers.get("x-relay-account-ref") or request.query_params.get("relayAccountRef")
    if not relay_account_ref:
        raise HTTPException(400, "Missing relay account reference")

    token = token_store.get(platform, relay_account_ref)
    if not token:
        raise HTTPException(401, "Platform token not found — re-authenticate required")

    # Auto-refresh if expired
    if token.is_expired():
        try:
            token = await p.refresh_token(token)
            token_store.save(token)
        except Exception:
            raise HTTPException(401, "Token refresh failed — re-authenticate required")

    # Proxy the request
    if hasattr(p, "proxy_request"):
        body = None
        if request.method in ("POST", "PUT", "PATCH"):
            body = await request.json()
        result = await p.proxy_request(token, request.method, path, body)
        return result

    raise HTTPException(501, f"Proxy not implemented for {platform}")


# ── Token management ───────────────────────────

@app.delete("/api/plat/{platform}/token/{uid}")
async def revoke_token(platform: str, uid: str):
    """Revoke a stored token."""
    if token_store.delete(platform, uid):
        return {"status": "revoked"}
    raise HTTPException(404, "Token not found")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("RELAY_PORT", "4011")))
