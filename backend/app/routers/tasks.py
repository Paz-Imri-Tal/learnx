from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_student
from app.database import get_db
from app.models import Course, Student, Task, TaskPartner
from app.routers.courses import get_own_course
from app.schemas.task import (
    InvitationOut,
    InviteIn,
    PartnerOut,
    TaskDetailOut,
    TaskIn,
    TaskOut,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])


def is_owner(task: Task, student: Student) -> bool:
    return task.course.student_id == student.id


def find_partner(task: Task, student_id: int) -> TaskPartner | None:
    for partner in task.partners:
        if partner.student_id == student_id:
            return partner
    return None


def get_task_for_member(task_id: int, student: Student, db: Session) -> Task:
    task = db.get(Task, task_id)
    if task is not None:
        if is_owner(task, student):
            return task
        partner = find_partner(task, student.id)
        if partner is not None and partner.status == "accepted":
            return task
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="המטלה לא נמצאה",
    )


def get_task_for_owner(task_id: int, student: Student, db: Session) -> Task:
    task = get_task_for_member(task_id, student, db)
    if not is_owner(task, student):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="רק בעל המטלה יכול לבצע פעולה זו",
        )
    return task

def mark_updated(task: Task, student: Student) -> None:
    task.updated_at = func.now()
    task.updated_by_id = student.id


def to_task_out(task: Task, student: Student) -> TaskOut:
    return TaskOut(
        id=task.id,
        name=task.name,
        due_date=task.due_date,
        course_id=task.course_id,
        course_name=task.course.name,
        is_owner=is_owner(task, student),
        owner_name=task.course.student.full_name,
        updated_at=task.updated_at,
        updated_by_name=task.updated_by.full_name if task.updated_by else None,
    )


def to_partner_out(partner: TaskPartner) -> PartnerOut:
    return PartnerOut(
        student_id=partner.student_id,
        full_name=partner.student.full_name,
        email=partner.student.email,
        status=partner.status,
    )


@router.get("", response_model=list[TaskOut])
def list_tasks(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    owned = db.scalars(
        select(Task).join(Course).where(Course.student_id == current_student.id)
    ).all()
    shared = db.scalars(
        select(Task)
        .join(TaskPartner)
        .where(
            TaskPartner.student_id == current_student.id,
            TaskPartner.status == "accepted",
        )
    ).all()
    tasks = sorted([*owned, *shared], key=lambda task: task.due_date)
    return [to_task_out(task, current_student) for task in tasks]


@router.get("/invitations", response_model=list[InvitationOut])
def list_invitations(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    invitations = db.scalars(
        select(TaskPartner).where(
            TaskPartner.student_id == current_student.id,
            TaskPartner.status == "pending",
        )
    ).all()
    return [
        InvitationOut(
            task_id=invitation.task.id,
            task_name=invitation.task.name,
            due_date=invitation.task.due_date,
            course_name=invitation.task.course.name,
            invited_by=invitation.task.course.student.full_name,
        )
        for invitation in invitations
    ]


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    data: TaskIn,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    get_own_course(data.course_id, current_student, db)
    task = Task(**data.model_dump(), updated_by_id=current_student.id)
    db.add(task)
    db.commit()
    db.refresh(task)
    return to_task_out(task, current_student)


@router.get("/{task_id}", response_model=TaskDetailOut)
def get_task(
    task_id: int,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    task = get_task_for_member(task_id, current_student, db)
    owner = is_owner(task, current_student)
    partners = [
        to_partner_out(partner)
        for partner in task.partners
        if owner or partner.status == "accepted"
    ]
    return TaskDetailOut(**to_task_out(task, current_student).model_dump(), partners=partners)


@router.put("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    data: TaskIn,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    task = get_task_for_owner(task_id, current_student, db)
    get_own_course(data.course_id, current_student, db)
    for field, value in data.model_dump().items():
        setattr(task, field, value)
    mark_updated(task, current_student)
    db.commit()
    db.refresh(task)
    return to_task_out(task, current_student)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    task = get_task_for_owner(task_id, current_student, db)
    db.delete(task)
    db.commit()


@router.post(
    "/{task_id}/partners",
    response_model=PartnerOut,
    status_code=status.HTTP_201_CREATED,
)
def invite_partner(
    task_id: int,
    data: InviteIn,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    task = get_task_for_owner(task_id, current_student, db)
    invitee = db.scalar(select(Student).where(Student.email == data.email.lower()))
    if invitee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="אין סטודנט רשום עם המייל הזה",
        )
    if invitee.id == current_student.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="אי אפשר להזמין את עצמך",
        )
    if find_partner(task, invitee.id) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="הסטודנט הזה כבר הוזמן למטלה",
        )
    partner = TaskPartner(task_id=task.id, student_id=invitee.id, status="pending")
    db.add(partner)
    db.commit()
    db.refresh(partner)
    return to_partner_out(partner)


@router.delete(
    "/{task_id}/partners/{student_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_partner(
    task_id: int,
    student_id: int,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    task = get_task_for_owner(task_id, current_student, db)
    partner = find_partner(task, student_id)
    if partner is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="השותף לא נמצא",
        )
    db.delete(partner)
    db.commit()


def get_own_invitation(
    task_id: int, student: Student, db: Session, expected_status: str
) -> TaskPartner:
    partner = db.scalar(
        select(TaskPartner).where(
            TaskPartner.task_id == task_id,
            TaskPartner.student_id == student.id,
            TaskPartner.status == expected_status,
        )
    )
    if partner is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ההזמנה לא נמצאה",
        )
    return partner


@router.post("/{task_id}/accept", response_model=TaskOut)
def accept_invitation(
    task_id: int,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    partner = get_own_invitation(task_id, current_student, db, "pending")
    partner.status = "accepted"
    db.commit()
    return to_task_out(partner.task, current_student)


@router.post("/{task_id}/decline", status_code=status.HTTP_204_NO_CONTENT)
def decline_invitation(
    task_id: int,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    partner = get_own_invitation(task_id, current_student, db, "pending")
    db.delete(partner)
    db.commit()


@router.post("/{task_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_task(
    task_id: int,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    partner = get_own_invitation(task_id, current_student, db, "accepted")
    db.delete(partner)
    db.commit()