import logging
import smtplib

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_current_student
from app.core.email import EmailNotConfigured, build_lecturer_email, send_email
from app.database import get_db
from app.models import Contact, Student
from app.schemas.contact import ContactIn, ContactOut, MessageIn

router = APIRouter(prefix="/contacts", tags=["contacts"])
logger = logging.getLogger("uvicorn.error")


def get_own_contact(contact_id: int, student: Student, db: Session) -> Contact:
    contact = db.scalar(
        select(Contact).where(
            Contact.id == contact_id, Contact.student_id == student.id
        )
    )
    if contact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="איש הקשר לא נמצא",
        )
    return contact


def save_contact(contact: Contact, db: Session) -> None:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="המייל הזה כבר קיים ברישומון",
        )
    db.refresh(contact)


@router.get("", response_model=list[ContactOut])
def list_contacts(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Contact)
        .where(Contact.student_id == current_student.id)
        .order_by(Contact.name)
    ).all()


@router.post("", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
def create_contact(
    data: ContactIn,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    contact = Contact(
        name=data.name, email=data.email.lower(), student_id=current_student.id
    )
    db.add(contact)
    save_contact(contact, db)
    return contact


@router.put("/{contact_id}", response_model=ContactOut)
def update_contact(
    contact_id: int,
    data: ContactIn,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    contact = get_own_contact(contact_id, current_student, db)
    contact.name = data.name
    contact.email = data.email.lower()
    save_contact(contact, db)
    return contact


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    contact_id: int,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    contact = get_own_contact(contact_id, current_student, db)
    db.delete(contact)
    db.commit()


@router.post("/{contact_id}/send")
def send_to_contact(
    contact_id: int,
    data: MessageIn,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    contact = get_own_contact(contact_id, current_student, db)
    subject = data.subject or f"פנייה חדשה מ-{current_student.full_name}"
    email = build_lecturer_email(
        to_email=contact.email,
        subject=subject,
        message=data.message,
        student_name=current_student.full_name,
        student_email=current_student.email,
    )

    try:
        send_email(email)
    except EmailNotConfigured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="שליחת מיילים מהאתר לא מוגדרת כרגע",
        )
    except (smtplib.SMTPException, OSError):
        logger.exception("Sending email failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="המייל לא נשלח, נסה שוב בעוד רגע",
        )

    return {"sent": True}