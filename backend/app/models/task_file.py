from datetime import datetime

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TaskFile(Base):
    __tablename__ = "task_files"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    file_name: Mapped[str] = mapped_column(String(255))
    drive_file_id: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(255))
    size: Mapped[int]
    uploaded_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("students.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    task: Mapped["Task"] = relationship(back_populates="files")
    uploaded_by: Mapped["Student | None"] = relationship()