from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MaterialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)


    id: int
    file_name: str
    created_at: datetime


class ChatIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    content: str = Field(min_length=1, max_length=5000)


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)


    id: int
    content: str
    role: str
    created_at: datetime