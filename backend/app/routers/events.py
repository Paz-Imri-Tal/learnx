import logging

from fastapi import APIRouter, Depends, HTTPException, status
from google.auth.exceptions import RefreshError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.calendar_sync import sync_google_calendar
from app.core.deps import get_current_student
from app.database import get_db
from app.models import Event, GoogleCredential, Student
from app.schemas.event import EventIn, EventOut

router = APIRouter(prefix="/events", tags=["events"])
logger = logging.getLogger("uvicorn.error")


def get_own_local_event(event_id: int, student: Student, db: Session) -> Event:
    event = db.scalar(
        select(Event).where(Event.id == event_id, Event.student_id == student.id)
    )
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="האירוע לא נמצא",
        )
    if event.source != "local":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="אירוע מ-Google Calendar אפשר לשנות רק ב-Google Calendar",
        )
    return event


@router.get("", response_model=list[EventOut])
def list_events(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Event)
        .where(Event.student_id == current_student.id)
        .order_by(Event.start)
    ).all()


@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(
    data: EventIn,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    event = Event(**data.model_dump(), student_id=current_student.id)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.post("/sync-google")
def sync_google(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    credential = db.scalar(
        select(GoogleCredential).where(
            GoogleCredential.student_id == current_student.id
        )
    )
    if credential is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="כדי לסנכרן, צריך קודם להתחבר עם Google",
        )

    try:
        return sync_google_calendar(current_student, credential, db)
    except (PermissionError, RefreshError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ההרשאה ל-Google Calendar חסרה או פגה. התחבר מחדש עם Google",
        )
    except Exception:
        logger.exception("Google Calendar sync failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="לא הצלחנו להתחבר ל-Google Calendar. נסה שוב בעוד רגע",
        )


@router.put("/{event_id}", response_model=EventOut)
def update_event(
    event_id: int,
    data: EventIn,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    event = get_own_local_event(event_id, current_student, db)
    for field, value in data.model_dump().items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    event = get_own_local_event(event_id, current_student, db)
    db.delete(event)
    db.commit()