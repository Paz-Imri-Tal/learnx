from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_student
from app.database import get_db
from app.models import Course, Student
from app.schemas.course import AverageOut, CourseIn, CourseOut, GradeUpdate

router = APIRouter(prefix="/courses", tags=["courses"])


def get_own_course(course_id: int, student: Student, db: Session) -> Course:
    course = db.scalar(
        select(Course).where(Course.id == course_id, Course.student_id == student.id)
    )
    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="הקורס לא נמצא",
        )
    return course


@router.get("", response_model=list[CourseOut])
def list_courses(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Course)
        .where(Course.student_id == current_student.id)
        .order_by(Course.academic_year, Course.semester, Course.name)
    ).all()


@router.post("", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
    data: CourseIn,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    course = Course(**data.model_dump(), student_id=current_student.id)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/average", response_model=AverageOut)
def get_average(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    courses = db.scalars(
        select(Course).where(Course.student_id == current_student.id)
    ).all()

    graded = [course for course in courses if course.grade is not None]
    graded_credits = sum(course.credits for course in graded)
    total_credits = sum(course.credits for course in courses)

    if graded_credits == 0:
        average = None
    else:
        weighted_sum = sum(course.grade * course.credits for course in graded)
        average = round(weighted_sum / graded_credits, 2)

    return AverageOut(
        average=average,
        graded_credits=graded_credits,
        total_credits=total_credits,
    )


@router.put("/{course_id}", response_model=CourseOut)
def update_course(
    course_id: int,
    data: CourseIn,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    course = get_own_course(course_id, current_student, db)
    for field, value in data.model_dump().items():
        setattr(course, field, value)
    db.commit()
    db.refresh(course)
    return course


@router.patch("/{course_id}/grade", response_model=CourseOut)
def update_grade(
    course_id: int,
    data: GradeUpdate,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    course = get_own_course(course_id, current_student, db)
    course.grade = data.grade
    db.commit()
    db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: int,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    course = get_own_course(course_id, current_student, db)
    db.delete(course)
    db.commit()