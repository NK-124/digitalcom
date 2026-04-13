# ==================== COURSE API ROUTES ====================
# For Courses with Videos, Notes, and PDFs

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Header, Request
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import sessionmaker, Session, relationship, declarative_base
from typing import Optional, List
import os
import shutil
import uuid
import json
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path
from jose import jwt

# Load environment variables from backend/.env
backend_dir = Path(__file__).parent
load_dotenv(backend_dir / ".env")

# Use same database as main.py
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./store.db")

# Check if using PostgreSQL (DigitalOcean) or SQLite
if SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=300,
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
CourseBase = declarative_base()

# JWT configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

# Course Models
class CourseModel(CourseBase):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    instructor = Column(String)
    description = Column(Text)
    thumbnail_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class AdminUser(CourseBase):
    __tablename__ = "admin_users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    hashed_password = Column(String)
    is_admin = Column(Integer, default=0)

class OAuthUser(CourseBase):
    __tablename__ = "oauth_users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    name = Column(String)
    provider = Column(String)
    provider_id = Column(String, unique=True)
    picture = Column(String, nullable=True)
    is_admin = Column(Integer, default=0)

class VideoModel(CourseBase):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    title = Column(String)
    video_url = Column(String)  # YouTube URL or file path
    duration = Column(String, nullable=True)
    order = Column(Integer, default=0)

class NoteModel(CourseBase):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    title = Column(String)
    content = Column(Text)
    order = Column(Integer, default=0)

class PDFModel(CourseBase):
    __tablename__ = "pdfs"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    title = Column(String)
    file_url = Column(String)
    order = Column(Integer, default=0)

# Create tables
CourseBase.metadata.create_all(bind=engine)

# File upload configuration
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_course_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_admin_user(request: Request, db: Session = Depends(get_course_db)):
    """Get current admin user from JWT token (from cookie)"""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Check admin_users table first (traditional admin)
        admin_user = db.query(AdminUser).filter(AdminUser.username == username).first()
        if admin_user and admin_user.is_admin:
            return {"username": username, "is_admin": True, "type": "admin_user"}
        
        # Check oauth_users table (OAuth users with admin flag)
        if user_id:
            oauth_user = db.query(OAuthUser).filter(OAuthUser.id == user_id).first()
            if oauth_user and oauth_user.is_admin:
                return {"username": oauth_user.email, "is_admin": True, "type": "oauth_user", "user_id": user_id}
        
        # User is not an admin
        raise HTTPException(status_code=403, detail="User does not have admin privileges")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

# Create router
app = APIRouter()

# Courses - Get all
@app.get("/api/courses", response_model=List[dict])
async def get_courses(db: Session = Depends(get_course_db)):
    courses = db.query(CourseModel).order_by(CourseModel.created_at.desc()).all()
    result = []
    for course in courses:
        videos = db.query(VideoModel).filter(VideoModel.course_id == course.id).all()
        notes = db.query(NoteModel).filter(NoteModel.course_id == course.id).all()
        pdfs = db.query(PDFModel).filter(PDFModel.course_id == course.id).all()

        course_dict = {
            "id": course.id,
            "title": course.title,
            "instructor": course.instructor,
            "description": course.description,
            "thumbnail": course.thumbnail_url,
            "videos": len(videos),
            "notes": len(notes),
            "pdfs": len(pdfs),
            "videos_list": [{"title": v.title, "url": v.video_url, "duration": v.duration} for v in videos],
            "notes_list": [{"title": n.title, "content": n.content} for n in notes],
            "pdfs_list": [{"title": p.title, "url": p.file_url} for p in pdfs]
        }
        result.append(course_dict)
    return result

# Courses - Get by ID
@app.get("/api/courses/{course_id}", response_model=dict)
async def get_course(course_id: int, db: Session = Depends(get_course_db)):
    course = db.query(CourseModel).filter(CourseModel.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    videos = db.query(VideoModel).filter(VideoModel.course_id == course.id).all()
    notes = db.query(NoteModel).filter(NoteModel.course_id == course.id).all()
    pdfs = db.query(PDFModel).filter(PDFModel.course_id == course.id).all()

    return {
        "id": course.id,
        "title": course.title,
        "instructor": course.instructor,
        "description": course.description,
        "thumbnail": course.thumbnail_url,
        "videos": len(videos),
        "notes": len(notes),
        "pdfs": len(pdfs),
        "videos_list": [{"title": v.title, "url": v.video_url, "duration": v.duration} for v in videos],
        "notes_list": [{"title": n.title, "content": n.content} for n in notes],
        "pdfs_list": [{"title": p.title, "url": p.file_url} for p in pdfs]
    }

# Courses - Create
@app.post("/api/courses", response_model=dict)
async def create_course(
    title: str = Form(...),
    instructor: str = Form(...),
    description: str = Form(...),
    thumbnail: UploadFile = File(...),
    db: Session = Depends(get_course_db)
):
    # Save thumbnail
    file_extension = thumbnail.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(thumbnail.file, buffer)

    # Create course
    course = CourseModel(
        title=title,
        instructor=instructor,
        description=description,
        thumbnail_url=f"/uploads/{filename}"
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    return {"id": course.id, "message": "Course created successfully"}

# Courses - Update
@app.put("/api/courses/{course_id}", response_model=dict)
async def update_course(
    course_id: int,
    title: Optional[str] = Form(None),
    instructor: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    thumbnail: Optional[UploadFile] = File(None),
    db: Session = Depends(get_course_db)
):
    course = db.query(CourseModel).filter(CourseModel.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if title:
        course.title = title
    if instructor:
        course.instructor = instructor
    if description:
        course.description = description

    if thumbnail:
        if course.thumbnail_url:
            old_path = course.thumbnail_url.replace("/uploads/", UPLOAD_DIR + "/")
            if os.path.exists(old_path):
                os.remove(old_path)

        file_extension = thumbnail.filename.split(".")[-1]
        filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(thumbnail.file, buffer)

        course.thumbnail_url = f"/uploads/{filename}"

    db.commit()
    db.refresh(course)
    return {"message": "Course updated successfully"}

# Courses - Delete
@app.delete("/api/courses/{course_id}")
async def delete_course(course_id: int, db: Session = Depends(get_course_db)):
    course = db.query(CourseModel).filter(CourseModel.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Delete thumbnail
    if course.thumbnail_url:
        image_path = course.thumbnail_url.replace("/uploads/", UPLOAD_DIR + "/")
        if os.path.exists(image_path):
            os.remove(image_path)

    # Delete related videos, notes, pdfs
    db.query(VideoModel).filter(VideoModel.course_id == course_id).delete()
    db.query(NoteModel).filter(NoteModel.course_id == course_id).delete()
    db.query(PDFModel).filter(PDFModel.course_id == course_id).delete()

    db.delete(course)
    db.commit()

    return {"message": "Course deleted successfully"}

# Video - Add to course
@app.post("/api/courses/{course_id}/videos", response_model=dict)
async def add_video(
    course_id: int,
    title: str = Form(...),
    video_url: str = Form(...),  # YouTube URL or file path
    duration: Optional[str] = Form(None),
    db: Session = Depends(get_course_db)
):
    course = db.query(CourseModel).filter(CourseModel.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    video = VideoModel(
        course_id=course_id,
        title=title,
        video_url=video_url,
        duration=duration
    )
    db.add(video)
    db.commit()

    return {"message": "Video added successfully"}

# Video - Delete
@app.delete("/api/courses/videos/{video_id}")
async def delete_video(video_id: int, db: Session = Depends(get_course_db)):
    video = db.query(VideoModel).filter(VideoModel.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    db.delete(video)
    db.commit()
    return {"message": "Video deleted successfully"}

# Note - Add to course
@app.post("/api/courses/{course_id}/notes", response_model=dict)
async def add_note(
    course_id: int,
    title: str = Form(...),
    content: str = Form(...),
    db: Session = Depends(get_course_db)
):
    course = db.query(CourseModel).filter(CourseModel.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    note = NoteModel(
        course_id=course_id,
        title=title,
        content=content
    )
    db.add(note)
    db.commit()

    return {"message": "Note added successfully"}

# Note - Delete
@app.delete("/api/courses/notes/{note_id}")
async def delete_note(note_id: int, db: Session = Depends(get_course_db)):
    note = db.query(NoteModel).filter(NoteModel.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    db.delete(note)
    db.commit()
    return {"message": "Note deleted successfully"}

# PDF - Add to course
@app.post("/api/courses/{course_id}/pdfs", response_model=dict)
async def add_pdf(
    course_id: int,
    title: str = Form(...),
    pdf_file: UploadFile = File(...),
    db: Session = Depends(get_course_db)
):
    course = db.query(CourseModel).filter(CourseModel.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Save PDF
    file_extension = pdf_file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(pdf_file.file, buffer)

    pdf = PDFModel(
        course_id=course_id,
        title=title,
        file_url=f"/uploads/{filename}"
    )
    db.add(pdf)
    db.commit()

    return {"message": "PDF added successfully"}

# PDF - Delete
@app.delete("/api/courses/pdfs/{pdf_id}")
async def delete_pdf(pdf_id: int, db: Session = Depends(get_course_db)):
    pdf = db.query(PDFModel).filter(PDFModel.id == pdf_id).first()
    if not pdf:
        raise HTTPException(status_code=404, detail="PDF not found")

    # Delete file
    if pdf.file_url:
        file_path = pdf.file_url.replace("/uploads/", UPLOAD_DIR + "/")
        if os.path.exists(file_path):
            os.remove(file_path)

    db.delete(pdf)
    db.commit()
    return {"message": "PDF deleted successfully"}
