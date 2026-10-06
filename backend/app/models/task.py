from datetime import date, datetime

from sqlalchemy import ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    due_date: Mapped[date]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("students.id", ondelete="SET NULL")
    )

    course: Mapped["Course"] = relationship()
    updated_by: Mapped["Student | None"] = relationship()
    partners: Mapped[list["TaskPartner"]] = relationship(
        back_populates="task", cascade="all, delete-orphan", passive_deletes=True
    )
    files: Mapped[list["TaskFile"]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="TaskFile.id",
    )


class TaskPartner(Base):
    __tablename__ = "task_partners"
    __table_args__ = (UniqueConstraint("task_id", "student_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(10), default="pending")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    task: Mapped[Task] = relationship(back_populates="partners")
    student: Mapped["Student"] = relationship()