from datetime import datetime

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    credits: Mapped[float]
    academic_year: Mapped[int]
    semester: Mapped[str] = mapped_column(String(10))
    grade: Mapped[float | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())