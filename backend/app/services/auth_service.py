from __future__ import annotations

import base64
import hashlib
import hmac
import time
from dataclasses import dataclass

from fastapi import HTTPException, Request

from backend.app.core.config import Settings


@dataclass(slots=True)
class AuthUser:
    username: str


class AuthService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def validate_credentials(self, username: str, password: str) -> tuple[bool, str | None]:
        if username != self.settings.admin_username:
            return False, "아이디가 존재하지 않습니다."
        if password != self.settings.admin_password:
            return False, "비밀번호가 올바르지 않습니다."
        return True, None

    def create_token(self, username: str) -> str:
        expires_at = int(time.time()) + 60 * 60 * 12
        payload = f"{username}:{expires_at}"
        signature = hmac.new(
            self.settings.auth_secret.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        raw = f"{payload}:{signature}".encode("utf-8")
        return base64.urlsafe_b64encode(raw).decode("utf-8")

    def verify_token(self, token: str | None) -> AuthUser | None:
        if not token:
            return None
        try:
            decoded = base64.urlsafe_b64decode(token.encode("utf-8")).decode("utf-8")
            username, expires_at_str, signature = decoded.split(":", 2)
            payload = f"{username}:{expires_at_str}"
            expected = hmac.new(
                self.settings.auth_secret.encode("utf-8"),
                payload.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()
            if not hmac.compare_digest(signature, expected):
                return None
            if int(expires_at_str) < int(time.time()):
                return None
            if username != self.settings.admin_username:
                return None
            return AuthUser(username=username)
        except Exception:
            return None

    def require_user(self, request: Request) -> AuthUser:
        authorization = request.headers.get("Authorization", "")
        token = authorization.removeprefix("Bearer ").strip() if authorization.startswith("Bearer ") else ""
        user = self.verify_token(token)
        if not user:
            raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
        return user
