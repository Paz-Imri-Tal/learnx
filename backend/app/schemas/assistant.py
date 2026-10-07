from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AssistantMessage(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=5000)


class AssistantIn(BaseModel):

    messages: list[AssistantMessage] = Field(min_length=1, max_length=40) 


class AssistantOut(BaseModel):
    content: str