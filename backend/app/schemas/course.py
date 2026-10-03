from datetime import datetime
from typing import Literal 

from pydantic import BaseModel, ConfigDict, Field

Semester = Literal["א", "ב", "ג"]


class CourseIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    credits: float = Field(gt=0, le=10, multiple_of=0.5)
    academic_year: int = Field(ge=1, le=4)
    semester: Semester
    grade: float | None = Field(default=None, ge=0, le=100)


class GradeUpdate(BaseModel):
    grade: float | None = Field(default=None, ge=0, le=100)


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    credits: float
    academic_year: int
    semester: str
    grade: float | None
    created_at: datetime


class AverageOut(BaseModel):
    average: float | None
    graded_credits: float
    total_credits: float