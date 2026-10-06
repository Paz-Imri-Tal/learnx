import io
import logging
from contextlib import contextmanager
from pathlib import PurePath
from urllib.parse import quote

from fastapi import HTTPException, Response, UploadFile, status
from google.auth.exceptions import RefreshError
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseUpload
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.google import get_google_credentials
from app.core.security import decrypt_secret
from app.models import GoogleCredential

logger = logging.getLogger("uvicorn.error")

DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file"
APP_FOLDER_NAME = "LearnX"
FOLDER_MIME_TYPE = "application/vnd.google-apps.folder"
MAX_FILE_SIZE = 40 * 1024 * 1024
VIEWABLE_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "text/plain",
}


class DriveNotConnected(Exception):
    pass


def get_drive_service(student_id: int, db: Session):
    credential = db.scalar(
        select(GoogleCredential).where(GoogleCredential.student_id == student_id)
    )
    if credential is None or DRIVE_SCOPE not in credential.scopes.split():
        raise DriveNotConnected()

    credentials = get_google_credentials(
        decrypt_secret(credential.refresh_token), credential.scopes.split()
    )
    return build("drive", "v3", credentials=credentials, cache_discovery=False)


def get_app_folder_id(service) -> str:
    query = (
        f"name = '{APP_FOLDER_NAME}' and mimeType = '{FOLDER_MIME_TYPE}' "
        "and trashed = false"
    )
    result = service.files().list(q=query, fields="files(id)", pageSize=1).execute()
    folders = result.get("files", [])
    if folders:
        return folders[0]["id"]

    folder = (
        service.files()
        .create(body={"name": APP_FOLDER_NAME, "mimeType": FOLDER_MIME_TYPE}, fields="id")
        .execute()
    )
    return folder["id"]


def upload_to_drive(service, file_name: str, content: bytes, mime_type: str) -> str:
    media = MediaIoBaseUpload(io.BytesIO(content), mimetype=mime_type, resumable=True)
    created = (
        service.files()
        .create(
            body={"name": file_name, "parents": [get_app_folder_id(service)]},
            media_body=media,
            fields="id",
        )
        .execute()
    )
    return created["id"]


def download_from_drive(service, drive_file_id: str) -> bytes:
    return service.files().get_media(fileId=drive_file_id).execute()


def delete_from_drive(service, drive_file_id: str) -> None:
    try:
        service.files().delete(fileId=drive_file_id).execute()
    except HttpError:
        logger.warning("Drive delete failed for %s", drive_file_id)


@contextmanager
def drive_errors(not_connected_message: str):
    try:
        yield
    except DriveNotConnected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=not_connected_message,
        )
    except RefreshError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ההרשאה ל-Google Drive פגה. צריך להתחבר מחדש עם Google",
        )
    except HttpError:
        logger.exception("Google Drive request failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="לא הצלחנו להתחבר ל-Google Drive. נסה שוב בעוד רגע",
        )


def read_upload(upload: UploadFile) -> tuple[str, bytes, str]:
    file_name = PurePath(upload.filename or "").name[:255]
    if not file_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="לקובץ אין שם",
        )

    content = upload.file.read(MAX_FILE_SIZE + 1)
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f'הקובץ "{file_name}" גדול מ-40MB',
        )
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'הקובץ "{file_name}" ריק',
        )

    mime_type = upload.content_type or "application/octet-stream"
    return file_name, content, mime_type


def file_response(content: bytes, file_name: str, mime_type: str, download: bool) -> Response:
    if mime_type not in VIEWABLE_TYPES:
        download = True
    disposition = "attachment" if download else "inline"
    return Response(
        content=content,
        media_type=mime_type,
        headers={
            "Content-Disposition": f"{disposition}; filename*=UTF-8''{quote(file_name)}",
            "X-Content-Type-Options": "nosniff",
        },
    )