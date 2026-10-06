import base64
import hashlib
import json
from datetime import datetime, timedelta, timezone

import jwt
from cryptography.fernet import Fernet, InvalidToken
from pwdlib import PasswordHash

from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, SECRET_KEY

password_hash = PasswordHash.recommended()

fernet = Fernet(base64.urlsafe_b64encode(hashlib.sha256(SECRET_KEY.encode()).digest()))


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def create_access_token(student_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(student_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        return None


def encrypt_secret(value: str) -> str:
    return fernet.encrypt(value.encode()).decode()


def decrypt_secret(value: str) -> str:
    return fernet.decrypt(value.encode()).decode()




LINK_STATE_PREFIX = "link."
LINK_STATE_MINUTES = 10
LINK_TOKEN_SECONDS = 300


def create_link_state(student_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=LINK_STATE_MINUTES)
    payload = {"sub": str(student_id), "purpose": "google_link", "exp": expire}
    return LINK_STATE_PREFIX + jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_link_state(state: str) -> int | None:
    if not state.startswith(LINK_STATE_PREFIX):
        return None
    try:
        payload = jwt.decode(
            state.removeprefix(LINK_STATE_PREFIX), SECRET_KEY, algorithms=[ALGORITHM]
        )
        if payload.get("purpose") != "google_link":
            return None
        return int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        return None


def create_link_token(data: dict) -> str:
    return fernet.encrypt(json.dumps(data).encode()).decode()


def open_link_token(token: str) -> dict | None:
    try:
        return json.loads(fernet.decrypt(token.encode(), ttl=LINK_TOKEN_SECONDS))
    except (InvalidToken, ValueError):
        return None