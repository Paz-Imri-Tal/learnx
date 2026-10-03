from fastapi import Depends, HTTPException,status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session 

from app.core.security import decode_access_token
from app.database import get_db
from app.models import Student

bearer_scheme = HTTPBearer()


def get_current_student(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Student:
    student_id = decode_access_token(credentials.credentials)
    if student_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="החיבור פג תוקף, יש להתחבר מחדש",
        )
    
    student = db.get(Student, student_id)
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="החיבור פג תוקף, יש להתחבר מחדש",
        )
    
    return student