import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from google.auth.exceptions import RefreshError
from googleapiclient.errors import HttpError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_student
from app.core.drive import (
    DriveNotConnected,
    delete_from_drive,
    download_from_drive,
    drive_errors,
    file_response,
    get_drive_service,
    read_upload,
    upload_to_drive,
)
from app.database import get_db
from app.models import Folder, FolderFile, Student
from app.schemas.folder import FolderDetailOut, FolderFileOut, FolderIn, FolderOut

router = APIRouter(prefix="/folders", tags=["folders"])
logger = logging.getLogger("uvicorn.error")

DRIVE_MISSING = "כדי לשמור קבצים בתיקיות, צריך להתחבר לפחות פעם אחת עם Google"


def get_own_folder(folder_id: int, student: Student, db: Session) -> Folder:
    folder = db.scalar(
        select(Folder).where(Folder.id == folder_id, Folder.student_id == student.id)
    )
    if folder is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="התיקייה לא נמצאה",
        )
    return folder


def find_folder_file(folder: Folder, file_id: int) -> FolderFile:
    for folder_file in folder.files:
        if folder_file.id == file_id:
            return folder_file
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="הקובץ לא נמצא",
    )


def to_folder_out(folder: Folder) -> FolderOut:
    return FolderOut(
        id=folder.id,
        name=folder.name,
        file_count=len(folder.files),
        created_at=folder.created_at,
    )


def with_extension(custom_name: str, original_name: str) -> str:
    custom_name = custom_name.strip()
    if not custom_name:
        return original_name
    if "." in original_name and "." not in custom_name:
        extension = original_name.rsplit(".", 1)[1]
        return f"{custom_name}.{extension}"[:255]
    return custom_name[:255]


@router.get("", response_model=list[FolderOut])
def list_folders(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    folders = db.scalars(
        select(Folder)
        .where(Folder.student_id == current_student.id)
        .order_by(Folder.name)
    ).all()
    return [to_folder_out(folder) for folder in folders]


@router.post("", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
def create_folder(
    data: FolderIn,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    folder = Folder(name=data.name, student_id=current_student.id)
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return to_folder_out(folder)


@router.get("/{folder_id}", response_model=FolderDetailOut)
def get_folder(
    folder_id: int,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    folder = get_own_folder(folder_id, current_student, db)
    return FolderDetailOut(
        id=folder.id,
        name=folder.name,
        files=[FolderFileOut.model_validate(folder_file) for folder_file in folder.files],
    )


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_id: int,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    folder = get_own_folder(folder_id, current_student, db)
    if folder.files:
        try:
            service = get_drive_service(current_student.id, db)
            for folder_file in folder.files:
                delete_from_drive(service, folder_file.drive_file_id)
        except (DriveNotConnected, RefreshError, HttpError):
            logger.warning("Could not delete Drive files of folder %s", folder.id)
    db.delete(folder)
    db.commit()


@router.post(
    "/{folder_id}/files",
    response_model=FolderFileOut,
    status_code=status.HTTP_201_CREATED,
)
def upload_folder_file(
    folder_id: int,
    file: UploadFile = File(...),
    display_name: str = Form(""),
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    folder = get_own_folder(folder_id, current_student, db)
    original_name, content, mime_type = read_upload(file)
    file_name = with_extension(display_name, original_name)

    with drive_errors(DRIVE_MISSING):
        service = get_drive_service(current_student.id, db)
        drive_file_id = upload_to_drive(service, file_name, content, mime_type)

    folder_file = FolderFile(
        folder_id=folder.id,
        file_name=file_name,
        drive_file_id=drive_file_id,
        mime_type=mime_type,
        size=len(content),
    )
    db.add(folder_file)
    db.commit()
    db.refresh(folder_file)
    return folder_file


@router.get("/{folder_id}/files/{file_id}")
def get_folder_file_content(
    folder_id: int,
    file_id: int,
    download: bool = False,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    folder = get_own_folder(folder_id, current_student, db)
    folder_file = find_folder_file(folder, file_id)
    with drive_errors(DRIVE_MISSING):
        service = get_drive_service(current_student.id, db)
        content = download_from_drive(service, folder_file.drive_file_id)
    return file_response(content, folder_file.file_name, folder_file.mime_type, download)


@router.delete("/{folder_id}/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder_file(
    folder_id: int,
    file_id: int,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    folder = get_own_folder(folder_id, current_student, db)
    folder_file = find_folder_file(folder, file_id)
    with drive_errors(DRIVE_MISSING):
        service = get_drive_service(current_student.id, db)
        delete_from_drive(service, folder_file.drive_file_id)
    db.delete(folder_file)
    db.commit()