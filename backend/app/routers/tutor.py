from fastapi import APIRouter, Depends, status, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.deps import get_current_student
from app.models.student import Student
from app.models.tutor import Material, Message
from app.schemas.tutor import MaterialOut, MessageOut, ChatIn
from app.routers.courses import get_own_course
from app.core.drive import read_upload
from app.core.text_extract import extract_text
from app.core.tutor_ai import ask_tutor
from anthropic import AnthropicError


router = APIRouter(prefix="/tutor", tags=["tutor"])
MAX_MATERIAL_SIZE = 20 * 1024 * 1024
MAX_MATERIALS_PER_COURSE = 15
MAX_HISTORY_MESSAGES = 20

@router.get("/courses/{course_id}/materials", response_model=list[MaterialOut])
def list_materials(course_id: int, current_student: Student = Depends(get_current_student), db: Session = Depends(get_db)):

    get_own_course(course_id, current_student, db)

    return db.scalars(
        select(Material)
        .where(Material.course_id == course_id)
        .order_by(Material.id)
    ).all()


@router.post("/courses/{course_id}/materials", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
def upload_material(
    course_id: int,
    file: UploadFile = File(...),
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    get_own_course(course_id, current_student, db)
    name, content, _ = read_upload(file)

    if len(content) > MAX_MATERIAL_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"הקובץ {name} גדול מ- 20MB"
        )
    
    all_materials = db.scalars(
        select(Material)
        .where(Material.course_id == course_id)
        .order_by(Material.id)
        ).all()
    
    if len(all_materials) >= MAX_MATERIALS_PER_COURSE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="קיימת חריגה בכמות הקבצים עבור הקורס!"
        )
    try:
        text = extract_text(name, content)

    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err)
        )
    
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="לא הצלחתי לקרוא את הקובץ"
        )
    
    if text.strip() == "":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="לא נמצא טקסט בקובץ. ייתכן שזה קובץ סרוק (תמונה). יש להעלות קובץ עם טקסט שאפשר לסמן ולהעתיק."
        )
    

    material = Material(
        course_id=course_id,
        file_name=name,
        content_text=text
    )

    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.delete("/courses/{course_id}/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    course_id: int,
    material_id: int,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    get_own_course(course_id, current_student, db)

    material = db.scalar(
        select(Material)
        .where(Material.course_id == course_id, Material.id == material_id)
    )

    if material is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="חומר הלימוד לא נמצא"
        )

    
    db.delete(material)
    db.commit()


@router.get("/courses/{course_id}/messages", response_model=list[MessageOut])
def list_messages(course_id: int, current_student: Student = Depends(get_current_student),
 db: Session = Depends(get_db)):

    get_own_course(course_id, current_student, db)

    return db.scalars(
        select(Message)
        .where(Message.course_id == course_id)
        .order_by(Message.id)
    ).all()


@router.post("/courses/{course_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
def send_message(
    course_id: int,
    data: ChatIn,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    get_own_course(course_id, current_student, db)
    course_materials = db.scalars(
        select(Material)
        .where(Material.course_id == course_id)
        .order_by(Material.id)
    ).all()

    if not course_materials:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="כדי לשאול את המורה, צריך קודם להעלות חומר לימוד"
        )
    
    texts = []
    for material in course_materials:
        texts.append(material.content_text)
    materials_text = "\n\n".join(texts)

    previous_messages = db.scalars(
        select(Message)
        .where(Message.course_id == course_id)
        .order_by(Message.id)
    ).all()

    recent_messages = previous_messages[len(previous_messages) - MAX_HISTORY_MESSAGES:]

    history = []
    for message in recent_messages:
        history.append({"role": message.role, "content": message.content})
    
    history.append({"role": "user", "content": data.content})

    try:
        answer = ask_tutor(materials_text, history)
    except AnthropicError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="המורה לא זמין כרגע. נסה שוב בעוד רגע.",
        )

    student_message = Message(course_id=course_id, role="user", content=data.content)
    tutor_message = Message(course_id=course_id, role="assistant", content=answer)
    db.add(student_message)
    db.add(tutor_message)
    db.commit()
    db.refresh(tutor_message)
    return tutor_message
