from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FolderIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)


class FolderOut(BaseModel):
    id: int
    name: str
    file_count: int
    created_at: datetime


class FolderFileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_name: str
    mime_type: str
    size: int
    created_at: datetime


class FolderDetailOut(BaseModel):
    id: int
    name: str
    files: list[FolderFileOut]