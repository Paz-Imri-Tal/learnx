from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models
from app.database import Base, engine
from app.routers import auth, courses, tasks, events, google_auth, folders, contacts

Base.metadata.create_all(bind=engine)

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(tasks.router)
app.include_router(events.router)
app.include_router(google_auth.router)
app.include_router(folders.router)
app.include_router(contacts.router)

@app.get("/health")
def health():
    return {"status": "ok"}