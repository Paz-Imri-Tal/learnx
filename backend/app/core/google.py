from datetime import datetime
from urllib.parse import urlencode

import requests
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.core.config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly"

SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/drive.file",
    CALENDAR_SCOPE,
]


def build_auth_url(state: str) -> str:
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": state,
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def exchange_code(code: str) -> dict:
    response = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    if not response.ok:
        raise RuntimeError(f"{response.status_code} {response.text}")
    return response.json()


def verify_google_id_token(token: str) -> dict:
    return id_token.verify_oauth2_token(
        token, GoogleRequest(), GOOGLE_CLIENT_ID, clock_skew_in_seconds=10
    )


def get_google_credentials(refresh_token: str, scopes: list[str]) -> Credentials:
    return Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri=GOOGLE_TOKEN_URL,
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scopes=scopes,
    )


def fetch_calendar_events(
    credentials: Credentials, time_min: datetime, time_max: datetime
) -> tuple[list[dict], str]:
    service = build("calendar", "v3", credentials=credentials, cache_discovery=False)
    events = []
    time_zone = "UTC"
    page_token = None

    while True:
        result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=time_min.isoformat(),
                timeMax=time_max.isoformat(),
                singleEvents=True,
                orderBy="startTime",
                maxResults=250,
                pageToken=page_token,
            )
            .execute()
        )
        time_zone = result.get("timeZone", time_zone)
        events.extend(result.get("items", []))
        page_token = result.get("nextPageToken")
        if page_token is None:
            return events, time_zone