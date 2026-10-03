from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class EventIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    start: datetime
    end: datetime
    all_day: bool = False
    color: str = Field(default="#316879", pattern=r"^#[0-9a-fA-F]{6}$")
    link: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def end_after_start(self):
        if self.end < self.start:
            raise ValueError("זמן הסיום חייב להיות אחרי זמן ההתחלה")
        return self


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    start: datetime
    end: datetime
    all_day: bool
    color: str
    link: str | None
    source: str