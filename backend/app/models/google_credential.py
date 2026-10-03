from datetime import datetime

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class GoogleCredential(Base):
    __tablename__ = "google_credentials"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), unique=True
    )
    refresh_token: Mapped[str] = mapped_column(String(1024))
    scopes: Mapped[str] = mapped_column(String(1000))
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now())