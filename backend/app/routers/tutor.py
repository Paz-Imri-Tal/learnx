from fastapi import APIRouter, Depends, status, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.deps import get_current_student
from app.models import Student, Material
from app.schemas.tutor import MaterialOut
from app.routers.courses import get_own_course
from app.core.drive import read_upload
from app.core.text_extract import extract_text


router = APIRouter(prefix="/tutor", tags=["tutor"])
MAX_MATERIAL_SIZE = 20 * 1024 * 1024
MAX_MATERIALS_PER_COURSE = 15

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
