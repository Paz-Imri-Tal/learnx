import logging
import secrets

from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import FRONTEND_URL
from app.core.deps import get_current_student
from app.core.google import build_auth_url, exchange_code, verify_google_id_token
from app.core.security import create_access_token, encrypt_secret
from app.database import get_db
from app.models import GoogleCredential, Student

router = APIRouter(prefix="/auth/google", tags=["google"])
logger = logging.getLogger("uvicorn.error")

STATE_COOKIE = "oauth_state"


def login_failed(reason: str) -> RedirectResponse:
    logger.warning("Google login failed: %s", reason)
    response = RedirectResponse(f"{FRONTEND_URL}/login?error=google")
    response.delete_cookie(STATE_COOKIE)
    return response


def find_or_create_student(info: dict, db: Session) -> Student:
    google_id = info["sub"]
    email = info["email"].lower()

    student = db.scalar(select(Student).where(Student.google_id == google_id))
    if student is not None:
        return student

    student = db.scalar(select(Student).where(Student.email == email))
    if student is not None:
        student.google_id = google_id
        return student

    name = info.get("name") or email.split("@")[0]
    student = Student(email=email, full_name=name[:100], google_id=google_id)
    db.add(student)
    db.flush()
    return student


def save_refresh_token(student: Student, tokens: dict, db: Session) -> None:
    refresh_token = tokens.get("refresh_token")
    if refresh_token is None:
        return

    credential = db.scalar(
        select(GoogleCredential).where(GoogleCredential.student_id == student.id)
    )
    if credential is None:
        credential = GoogleCredential(student_id=student.id)
        db.add(credential)
    credential.refresh_token = encrypt_secret(refresh_token)
    credential.scopes = tokens.get("scope", "")


@router.get("/login")
def google_login():
    state = secrets.token_urlsafe(32)
    response = RedirectResponse(build_auth_url(state))
    response.set_cookie(
        STATE_COOKIE, state, max_age=600, httponly=True, samesite="lax"
    )
    return response


@router.get("/callback")
def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    saved_state = request.cookies.get(STATE_COOKIE)
    if error:
        return login_failed(f"Google returned error: {error}")
    if not code or not state or not saved_state:
        return login_failed("missing code, state or state cookie")
    if not secrets.compare_digest(state, saved_state):
        return login_failed("state does not match cookie")

    try:
        tokens = exchange_code(code)
        info = verify_google_id_token(tokens["id_token"])
    except Exception as exc:
        return login_failed(f"token exchange or verification error: {exc}")

    if not info.get("email_verified"):
        return login_failed("email not verified by Google")

    student = find_or_create_student(info, db)
    save_refresh_token(student, tokens, db)
    db.commit()

    access_token = create_access_token(student.id)
    response = RedirectResponse(f"{FRONTEND_URL}/auth/google#token={access_token}")
    response.delete_cookie(STATE_COOKIE)
    return response


@router.get("/status")
def google_status(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    credential = db.scalar(
        select(GoogleCredential).where(
            GoogleCredential.student_id == current_student.id
        )
    )
    return {"connected": credential is not None}