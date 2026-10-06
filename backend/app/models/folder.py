from datetime import datetime

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Folder(Base):
    __tablename__ = "folders"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    files: Mapped[list["FolderFile"]] = relationship(
        back_populates="folder",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="FolderFile.id",
    )


class FolderFile(Base):
    __tablename__ = "folder_files"

    id: Mapped[int] = mapped_column(primary_key=True)
    folder_id: Mapped[int] = mapped_column(
        ForeignKey("folders.id", ondelete="CASCADE"), index=True
    )
    file_name: Mapped[str] = mapped_column(String(255))
    drive_file_id: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(255))
    size: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    folder: Mapped[Folder] = relationship(back_populates="files")