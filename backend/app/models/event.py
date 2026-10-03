from datetime import datetime

from sqlalchemy import ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Event(Base):
    __tablename__ = "events"
    __table_args__ = (UniqueConstraint("student_id", "google_event_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255))
    start: Mapped[datetime]
    end: Mapped[datetime]
    all_day: Mapped[bool] = mapped_column(default=False)
    color: Mapped[str] = mapped_column(String(7), default="#316879")
    link: Mapped[str | None] = mapped_column(String(500))
    source: Mapped[str] = mapped_column(String(10), default="local")
    google_event_id: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())