from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field


class TaskIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    due_date: date
    course_id: int


class InviteIn(BaseModel):
    email: EmailStr


class PartnerOut(BaseModel):
    student_id: int
    full_name: str
    email: str
    status: str


class TaskOut(BaseModel):
    id: int
    name: str
    due_date: date
    course_id: int
    course_name: str
    is_owner: bool
    owner_name: str
    updated_at: datetime
    updated_by_name: str | None


class TaskFileOut(BaseModel):
    id: int
    file_name: str
    mime_type: str
    size: int
    uploaded_by_name: str | None
    created_at: datetime


class TaskDetailOut(TaskOut):
    partners: list[PartnerOut]
    files: list[TaskFileOut]


class InvitationOut(BaseModel):
    task_id: int
    task_name: str
    due_date: date
    course_name: str
    invited_by: str