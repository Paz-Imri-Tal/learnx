from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ContactIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    email: EmailStr


class ContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


class MessageIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    subject: str = Field(default="", max_length=150)
    message: str = Field(min_length=1, max_length=5000)