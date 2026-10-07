from datetime import date, datetime

from anthropic import AnthropicError
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_student
from app.core.tutor_ai import ask_assistant
from app.database import get_db
from app.models.student import Student
from app.routers.courses import list_courses, get_average
from app.routers.events import list_events
from app.routers.tasks import list_tasks
from app.schemas.assistant import AssistantIn, AssistantOut

router = APIRouter(prefix="/assistant", tags=["assistant"])

def build_student_context(student: Student, db: Session) -> str:
    lines = []
    courses = list_courses(student, db)
    average_info = get_average(student, db) #מחזיר שלוש שדות average, graded_credits ו‑total_credits 

    lines.append("הקורסים שלי:")
    for course in courses:
        if course.grade is None:
            lines.append(f"{course.name}: אין ציון עדיין, נק״ז {course.credits}")
        
        else:
            lines.append(f"{course.name}: הציון {course.grade}, נק״ז {course.credits}")
    if average_info.average is None:
        lines.append("אין כרגע ממוצע")
    else:
        lines.append(f"ממוצע משוקלל: {average_info.average}")
    
    lines.append("")
    lines.append("מטלות קרובות:")

    all_tasks = list_tasks(student, db)
    future_tasks = [task for task in all_tasks if task.due_date >= date.today()]

    if not future_tasks:
        lines.append("אין משימות עתידיות")
    else:
        for task in future_tasks:
            lines.append(f"{task.name}: של הקורס {task.course_name} להגשה בתאריך {task.due_date:%d.%m.%Y}")

    lines.append("")
    lines.append("אירועים קרובים בלוח:")

    all_events = list_events(student, db)
    future_events = [event for event in all_events if event.start >= datetime.now()]

    if not future_events:
        lines.append("אין אירועים קרובים")
    else:
        for event in future_events:
            lines.append(f"{event.title}: יתרחש בתאריך ובשעה {event.start:%d.%m.%Y %H:%M}")
    
    return "\n".join(lines)


@router.post("", response_model=AssistantOut)
def ask(
    data: AssistantIn,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    if data.messages[-1].role != "user":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ההודעה האחרונה בשיחה צריכה להיות שאלה של הסטודנט"
        )
    
    student_context = build_student_context(current_student, db)
    
    messages = []
    for message in data.messages:
        messages.append({"role": message.role, "content": message.content})
    
    try:
        answer = ask_assistant(current_student.full_name, student_context, messages)
    

    except AnthropicError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="העוזר לא זמין כרגע. נסה שוב בעוד רגע.",
        )
    
    return AssistantOut(content=answer)

