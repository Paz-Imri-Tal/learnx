from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.google import CALENDAR_SCOPE, fetch_calendar_events, get_google_credentials
from app.core.security import decrypt_secret
from app.models import Event, GoogleCredential, Student

GOOGLE_EVENT_COLOR = "#5f7f89"
SYNC_DAYS_BACK = 30
SYNC_DAYS_AHEAD = 180


def parse_google_time(value: dict, local_zone: ZoneInfo) -> tuple[datetime, bool]:
    if "date" in value:
        return datetime.combine(date.fromisoformat(value["date"]), datetime.min.time()), True
    moment = datetime.fromisoformat(value["dateTime"].replace("Z", "+00:00"))
    return moment.astimezone(local_zone).replace(tzinfo=None), False


def sync_google_calendar(
    student: Student, credential: GoogleCredential, db: Session
) -> dict:
    if CALENDAR_SCOPE not in credential.scopes.split():
        raise PermissionError("missing calendar scope")

    now = datetime.now(timezone.utc)
    time_min = now - timedelta(days=SYNC_DAYS_BACK)
    time_max = now + timedelta(days=SYNC_DAYS_AHEAD)

    credentials = get_google_credentials(
        decrypt_secret(credential.refresh_token), credential.scopes.split()
    )
    google_events, time_zone = fetch_calendar_events(credentials, time_min, time_max)
    local_zone = ZoneInfo(time_zone)

    existing = {
        event.google_event_id: event
        for event in db.scalars(
            select(Event).where(
                Event.student_id == student.id, Event.source == "google"
            )
        )
    }

    imported = 0
    updated = 0
    seen_ids = set()

    for item in google_events:
        if item.get("status") == "cancelled":
            continue

        start, all_day = parse_google_time(item["start"], local_zone)
        end, _ = parse_google_time(item["end"], local_zone)
        fields = {
            "title": (item.get("summary") or "(ללא כותרת)")[:255],
            "start": start,
            "end": end,
            "all_day": all_day,
            "link": (item.get("htmlLink") or None),
        }
        seen_ids.add(item["id"])

        event = existing.get(item["id"])
        if event is None:
            db.add(
                Event(
                    **fields,
                    student_id=student.id,
                    color=GOOGLE_EVENT_COLOR,
                    source="google",
                    google_event_id=item["id"],
                )
            )
            imported += 1
        else:
            for field, value in fields.items():
                setattr(event, field, value)
            updated += 1

    removed = 0
    window_start = time_min.astimezone(local_zone).replace(tzinfo=None)
    window_end = time_max.astimezone(local_zone).replace(tzinfo=None)
    for google_id, event in existing.items():
        if google_id not in seen_ids and window_start <= event.start <= window_end:
            db.delete(event)
            removed += 1

    db.commit()
    return {"imported": imported, "updated": updated, "removed": removed}