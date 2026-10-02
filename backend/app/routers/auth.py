from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password, create_access_token, verify_password
from app.core.deps import get_current_student
from app.database import get_db
from app.models import Student
from app.schemas.auth import RegisterRequest, StudentOut, LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    email = data.email.lower()

    existing = db.scalar(select(Student).where(Student.email == email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    student = Student(
        email=email,
        full_name=data.full_name,
        password_hash=hash_password(data.password),
        phone=data.phone,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    email = data.email.lower()
    student = db.scalar(select(Student).where(Student.email == email))

    if  (
        student is None
        or student.password_hash is None
        or not verify_password(data.password, student.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    return TokenResponse(access_token=create_access_token(student.id))


@router.get("/me", response_model=StudentOut)
def me(current_student: Student = Depends(get_current_student)):
    return current_student
