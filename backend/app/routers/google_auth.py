import logging
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import FRONTEND_URL
from app.core.deps import get_current_student
from app.core.drive import DRIVE_SCOPE
from app.core.google import (
    CALENDAR_SCOPE,
    build_auth_url,
    exchange_code,
    verify_google_id_token,
)
from app.core.security import (
    LINK_STATE_PREFIX,
    create_access_token,
    create_link_state,
    create_link_token,
    decode_link_state,
    encrypt_secret,
    open_link_token,
)
from app.database import get_db
from app.models import GoogleCredential, Student

router = APIRouter(prefix="/auth/google", tags=["google"])
logger = logging.getLogger("uvicorn.error")

STATE_COOKIE = "oauth_state"


class LinkCompleteIn(BaseModel):
    link_token: str


def login_failed(reason: str) -> RedirectResponse:
    logger.warning("Google login failed: %s", reason)
    response = RedirectResponse(f"{FRONTEND_URL}/login?error=google")
    response.delete_cookie(STATE_COOKIE)
    return response


def link_failed(reason: str) -> RedirectResponse:
    logger.warning("Google link failed: %s", reason)
    return RedirectResponse(f"{FRONTEND_URL}/google/linked#error=1")


def handle_link_callback(code: str | None, state: str, error: str | None) -> RedirectResponse:
    student_id = decode_link_state(state)
    if error:
        return link_failed(f"Google returned error: {error}")
    if not code or student_id is None:
        return link_failed("missing code or invalid link state")

    try:
        tokens = exchange_code(code)
        info = verify_google_id_token(tokens["id_token"])
    except Exception as exc:
        return link_failed(f"token exchange or verification error: {exc}")

    refresh_token = tokens.get("refresh_token")
    if refresh_token is None:
        return link_failed("Google did not return a refresh token")

    link_token = create_link_token(
        {
            "student_id": student_id,
            "google_id": info["sub"],
            "refresh_token": refresh_token,
            "scope": tokens.get("scope", ""),
        }
    )
    return RedirectResponse(f"{FRONTEND_URL}/google/linked#link={link_token}")


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
    if state and state.startswith(LINK_STATE_PREFIX):
        return handle_link_callback(code, state, error)

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


@router.post("/link-start")
def google_link_start(current_student: Student = Depends(get_current_student)):
    return {"url": build_auth_url(create_link_state(current_student.id))}


@router.post("/link-complete")
def google_link_complete(
    data: LinkCompleteIn,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    link = open_link_token(data.link_token)
    if link is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="החיבור ל-Google פג תוקף. נסה שוב",
        )
    if link["student_id"] != current_student.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="החיבור ל-Google התחיל בחשבון אחר. נסה שוב",
        )

    other = db.scalar(
        select(Student).where(
            Student.google_id == link["google_id"],
            Student.id != current_student.id,
        )
    )
    if other is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="חשבון Google הזה כבר מחובר למשתמש אחר ב-LearnX",
        )

    current_student.google_id = link["google_id"]
    save_refresh_token(
        current_student,
        {"refresh_token": link["refresh_token"], "scope": link["scope"]},
        db,
    )
    db.commit()
    return {"connected": True}


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
    scopes = credential.scopes.split() if credential else []
    return {
        "connected": credential is not None,
        "drive": DRIVE_SCOPE in scopes,
        "calendar": CALENDAR_SCOPE in scopes,
    }