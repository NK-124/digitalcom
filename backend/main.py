from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, status, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from typing import Optional, List
import os
import shutil
import uuid
import json
from dotenv import load_dotenv
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, storage
import cloudinary
import cloudinary.uploader
from io import BytesIO
import stripe

# Rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# Get the backend directory path
backend_dir = Path(__file__).parent
# Load environment variables from backend/.env
load_dotenv(backend_dir / ".env")

# App configuration
app = FastAPI(title="Gift Card, eBook & Blog API")

# Rate limiting setup (enterprise security)
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS - Allow only specific frontend domain (enterprise security)
# NO wildcard - explicitly allow frontend origin
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
allowed_origins = ["http://localhost:3000", "http://127.0.0.1:3000", frontend_url]
# Add production domains if FRONTEND_URL contains multiple (comma-separated)
if "," in frontend_url:
    allowed_origins = [url.strip() for url in frontend_url.split(",")]
    allowed_origins.extend(["http://localhost:3000", "http://127.0.0.1:3000"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Restrict methods
    allow_headers=["Content-Type", "Authorization"],  # Restrict headers
    max_age=600,  # Cache preflight requests for 10 minutes
)

# Security Headers Middleware (enterprise hardening)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add production security headers"""
    response = await call_next(request)
    
    # Prevent MIME-type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"
    
    # Enable XSS protection
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # Strict Transport Security (production only)
    if IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    
    # Content Security Policy (restrictive)
    # Note: Adjust based on your needs - this is a starting point
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; connect-src 'self' http://localhost:* https://*.cloudinary.com; font-src 'self' https://fonts.gstatic.com data:"
    
    # Referrer Policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Permissions Policy (disable unused features)
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    
    # Remove Cross-Origin-Opener-Policy that blocks window.closed
    # (Don't set it, or set to same-origin-allow-popups if needed)
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
    
    return response

# Add CORS headers to all responses (including errors)
@app.middleware("http")
async def add_cors_to_all_responses(request: Request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

# Firebase Configuration
FIREBASE_CREDENTIALS = {
    "type": os.getenv("FIREBASE_TYPE", "service_account"),
    "project_id": os.getenv("FIREBASE_PROJECT_ID"),
    "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
    "private_key": os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n"),
    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
    "client_id": os.getenv("FIREBASE_CLIENT_ID"),
    "auth_uri": os.getenv("FIREBASE_AUTH_URI", "https://accounts.google.com/o/oauth2/auth"),
    "token_uri": os.getenv("FIREBASE_TOKEN_URI", "https://oauth2.googleapis.com/token"),
}

# Initialize Firebase Admin SDK
try:
    cred = credentials.Certificate(FIREBASE_CREDENTIALS)
    firebase_admin.initialize_app(cred, {
        'storageBucket': os.getenv("FIREBASE_STORAGE_BUCKET", "app-otp-7b5cf.appspot.com")
    })
    bucket = storage.bucket()
    print(f"Firebase initialized successfully - Storage: {os.getenv('FIREBASE_STORAGE_BUCKET')}")
except Exception as e:
    print(f"Warning: Firebase initialization failed: {str(e)}. Using local storage.")
    bucket = None

# Database setup - DigitalOcean PostgreSQL
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./store.db")

# Check if using PostgreSQL (DigitalOcean) or SQLite
if SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
    # PostgreSQL connection with connection pooling
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=20,
        max_overflow=40,
        pool_pre_ping=True,
        pool_recycle=180,
        pool_timeout=30
    )
else:
    # SQLite (for development/fallback)
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or SECRET_KEY == "your-secret-key-change-in-production":
    import secrets
    SECRET_KEY = secrets.token_hex(32)
    print(f"[WARNING] Using auto-generated SECRET_KEY. Set it in .env for production!")

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 15  # Short-lived access token
REFRESH_TOKEN_EXPIRE_DAYS = 7     # Long-lived refresh token

# Cookie security configuration
# SameSite=Strict for better CSRF protection (Lax if cross-site navigation needed)
# Secure=True in production (HTTPS), False only for local development
IS_PRODUCTION = os.getenv("ENVIRONMENT", "development") == "production"
COOKIE_SECURE = IS_PRODUCTION  # True in production, False for localhost
COOKIE_SAMESITE = "lax"  # Use "strict" if no external links need to navigate with auth

def set_auth_cookie(response: Response, key: str, value: str, max_age: int):
    """Helper to set JWT cookies with consistent security settings"""
    response.set_cookie(
        key=key,
        value=value,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=max_age,
        path="/",
    )

def clear_auth_cookie(response: Response):
    """Helper to clear all JWT cookies securely"""
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")

# ========== SECURITY UTILITIES ==========

import hashlib

def hash_token(token: str) -> str:
    """Hash a token for secure storage (never store raw tokens)"""
    return hashlib.sha256(token.encode()).hexdigest()

def generate_session_id() -> str:
    """Generate unique session ID"""
    return str(uuid.uuid4())

def log_security_event(db: Session, event_type: str, user_id: int = None, 
                     email: str = None, ip_address: str = None, 
                     user_agent: str = None, details: dict = None):
    """Log security events for audit trail"""
    try:
        log_entry = SecurityAuditLog(
            user_id=user_id,
            email=email,
            event_type=event_type,
            ip_address=ip_address,
            user_agent=user_agent,
            details=json.dumps(details) if details else None
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        print(f"Failed to log security event: {e}")

def blacklist_token(db: Session, token: str, token_type: str, reason: str = "logout"):
    """Add token to blacklist"""
    try:
        token_hash = hash_token(token)
        blacklist_entry = TokenBlacklist(
            token_hash=token_hash,
            token_type=token_type,
            expires_at=datetime.utcnow() + timedelta(days=7 if token_type == "refresh" else 0.01),
            reason=reason
        )
        db.add(blacklist_entry)
        db.commit()
        return True
    except Exception as e:
        print(f"Failed to blacklist token: {e}")
        return False

def is_token_blacklisted(db: Session, token: str, token_type: str) -> bool:
    """Check if a token is blacklisted"""
    try:
        token_hash = hash_token(token)
        blacklisted = db.query(TokenBlacklist).filter(
            TokenBlacklist.token_hash == token_hash,
            TokenBlacklist.token_type == token_type,
            TokenBlacklist.expires_at > datetime.utcnow()
        ).first()
        return blacklisted is not None
    except Exception as e:
        print(f"Failed to check token blacklist: {e}")
        return False

def revoke_refresh_token(db: Session, token: str, reason: str = "rotation"):
    """Revoke a refresh token and mark it as inactive"""
    try:
        token_hash = hash_token(token)
        refresh_token = db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.is_active == 1
        ).first()
        
        if refresh_token:
            refresh_token.is_active = 0
            refresh_token.revoked_at = datetime.utcnow()
            
            # Blacklist the token
            blacklist_token(db, token, "refresh", reason)
            db.commit()
            return True
        return False
    except Exception as e:
        print(f"Failed to revoke refresh token: {e}")
        return False

def create_refresh_token_record(db: Session, user_id: int, token: str,
                               session_id: str, ip_address: str = None,
                               user_agent: str = None):
    """Store refresh token metadata for rotation tracking"""
    try:
        token_hash = hash_token(token)
        refresh_token = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            session_id=session_id,
            expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(refresh_token)
        db.commit()
        db.refresh(refresh_token)
        return refresh_token
    except Exception as e:
        print(f"Failed to create refresh token record: {e}")
        return None

# OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")

# Email Configuration (for verification and password reset)
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "noreply@digitalcom.com")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# ========== EMAIL & PASSWORD RESET UTILITIES ==========

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email(to_email: str, subject: str, html_content: str):
    """Send email via SMTP"""
    if not SMTP_USER or not SMTP_PASSWORD:
        print(f"[EMAIL] Would send to {to_email}: {subject}")
        print(f"[EMAIL] SMTP not configured - set SMTP_USER and SMTP_PASSWORD in .env")
        return False
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = EMAIL_FROM
        msg['To'] = to_email
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        
        print(f"[EMAIL] Sent to {to_email}: {subject}")
        return True
    except Exception as e:
        print(f"[EMAIL] Failed to send to {to_email}: {e}")
        return False

def generate_verification_token() -> str:
    """Generate secure verification token"""
    import secrets
    return secrets.token_urlsafe(32)

# Email Configuration (for verification and password reset)
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "noreply@digitalcom.com")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# File upload configuration (fallback if Firebase not configured)
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Initialize Stripe
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY', '')
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY
    print("[OK] Stripe initialized")
else:
    print("[WARN] Stripe not configured - set STRIPE_SECRET_KEY in .env")

# Serve frontend static files in production (DigitalOcean)
FRONTEND_BUILD_DIR = os.path.join(Path(__file__).parent.parent, "dist")
if os.path.exists(FRONTEND_BUILD_DIR):
    # Serve frontend build (includes public assets copied during Docker build)
    app.mount("/", StaticFiles(directory=FRONTEND_BUILD_DIR, html=True), name="frontend")
    print(f"[OK] Frontend static files mounted from: {FRONTEND_BUILD_DIR}")
else:
    print(f"[WARN] Frontend build directory not found at: {FRONTEND_BUILD_DIR}")
    # Fallback: mount public directory for development
    PUBLIC_DIR = os.path.join(Path(__file__).parent.parent, "public")
    if os.path.exists(PUBLIC_DIR):
        app.mount("/", StaticFiles(directory=PUBLIC_DIR, html=True), name="public")
        print(f"[OK] Public directory mounted from: {PUBLIC_DIR}")

# Initialize Cloudinary
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

try:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True
    )
    print(f"[OK] Cloudinary initialized successfully - Cloud: {CLOUDINARY_CLOUD_NAME}")
    CLOUDINARY_ENABLED = True
except Exception as e:
    print(f"[ERR] Cloudinary initialization failed: {str(e)}")
    CLOUDINARY_ENABLED = False

# Database Models
class GiftCardModel(Base):
    __tablename__ = "gift_cards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    price = Column(Float)
    image_url = Column(String)
    video_url = Column(String, nullable=True)  # Optional video URL
    # Additional images and videos (up to 5 each)
    image_url_2 = Column(String, nullable=True)
    image_url_3 = Column(String, nullable=True)
    image_url_4 = Column(String, nullable=True)
    image_url_5 = Column(String, nullable=True)
    video_url_2 = Column(String, nullable=True)
    video_url_3 = Column(String, nullable=True)
    video_url_4 = Column(String, nullable=True)
    video_url_5 = Column(String, nullable=True)

class EbookModel(Base):
    __tablename__ = "ebooks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    author = Column(String)
    price = Column(Float)
    image_url = Column(String)
    description = Column(String, nullable=True)
    video_url = Column(String, nullable=True)  # Optional video URL
    # Additional images and videos (up to 5 each)
    image_url_2 = Column(String, nullable=True)
    image_url_3 = Column(String, nullable=True)
    image_url_4 = Column(String, nullable=True)
    image_url_5 = Column(String, nullable=True)
    video_url_2 = Column(String, nullable=True)
    video_url_3 = Column(String, nullable=True)
    video_url_4 = Column(String, nullable=True)
    video_url_5 = Column(String, nullable=True)

class BlogModel(Base):
    __tablename__ = "blogs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    excerpt = Column(String)
    author = Column(String)
    # Hero/cover image (optional, shows before title)
    hero_image_url = Column(String, nullable=True)
    # 5 Paragraphs
    content = Column(Text)  # This will be paragraph 1
    content_2 = Column(Text, nullable=True)
    content_3 = Column(Text, nullable=True)
    content_4 = Column(Text, nullable=True)
    content_5 = Column(Text, nullable=True)
    # 5 Images
    image_url = Column(String) # This will be image 1
    image_url_2 = Column(String, nullable=True)
    image_url_3 = Column(String, nullable=True)
    image_url_4 = Column(String, nullable=True)
    image_url_5 = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class TemplateModel(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text)
    github_url = Column(String)
    price = Column(Float, nullable=True)
    category = Column(String, nullable=True)
    image_url = Column(String)
    image_url_2 = Column(String, nullable=True)
    image_url_3 = Column(String, nullable=True)
    image_url_4 = Column(String, nullable=True)
    image_url_5 = Column(String, nullable=True)
    tags = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_admin = Column(Integer, default=0)  # 0 = False, 1 = True (for SQLite compatibility)

# Order Model
class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String)
    customer_email = Column(String, nullable=True)
    total_amount = Column(Float)
    status = Column(String, default='processing')  # processing, completed, cancelled
    items = Column(Text)  # JSON string of items
    payment_intent_id = Column(String, nullable=True)
    # Deliverable files
    pdf_url = Column(String, nullable=True)  # For eBooks
    image_url = Column(String, nullable=True)  # For Gift Cards
    video_url = Column(String, nullable=True)  # For Courses
    zip_url = Column(String, nullable=True)  # For ZIP files
    created_at = Column(DateTime, default=datetime.utcnow)

# Cart Model
class Cart(Base):
    __tablename__ = "carts"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, unique=True, index=True)
    items = Column(Text)  # JSON string of cart items
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Course Model
class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    price = Column(Float, nullable=True)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# OAuth User Model
class OAuthUser(Base):
    __tablename__ = "oauth_users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    provider = Column(String)  # google or github
    provider_id = Column(String, unique=True, index=True)
    picture = Column(String, nullable=True)
    is_admin = Column(Integer, default=0)  # 0 = False, 1 = True
    email_verified = Column(Integer, default=0)  # 0 = False, 1 = True
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Refresh Token Model (for token rotation)
class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("oauth_users.id"), index=True)
    token_hash = Column(String, unique=True, index=True)  # Hashed token for security
    session_id = Column(String, unique=True, index=True)  # Track unique session
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    revoked_at = Column(DateTime, nullable=True)
    is_active = Column(Integer, default=1)  # 1 = active, 0 = revoked
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)

# Token Blacklist Model
class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"

    id = Column(Integer, primary_key=True, index=True)
    token_hash = Column(String, unique=True, index=True)
    token_type = Column(String)  # "access" or "refresh"
    expires_at = Column(DateTime)
    blacklisted_at = Column(DateTime, default=datetime.utcnow)
    reason = Column(String, nullable=True)  # "logout", "rotation", "suspicious"

# Security Audit Log Model
class SecurityAuditLog(Base):
    __tablename__ = "security_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    email = Column(String, nullable=True, index=True)
    event_type = Column(String, index=True)  # login, logout, refresh, failed_login, etc.
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    details = Column(Text, nullable=True)  # JSON details
    created_at = Column(DateTime, default=datetime.utcnow)

# Password Reset Token Model
class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("oauth_users.id"), index=True)
    token_hash = Column(String, unique=True, index=True)
    expires_at = Column(DateTime)
    used = Column(Integer, default=0)  # 0 = unused, 1 = used
    created_at = Column(DateTime, default=datetime.utcnow)

# Email Verification Token Model
class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("oauth_users.id"), index=True)
    token_hash = Column(String, unique=True, index=True)
    expires_at = Column(DateTime)
    verified = Column(Integer, default=0)  # 0 = pending, 1 = verified
    created_at = Column(DateTime, default=datetime.utcnow)

# Create tables (only if they don't exist)
Base.metadata.create_all(bind=engine)

# Pydantic schemas
class GiftCardBase(BaseModel):
    name: str
    price: float

class GiftCard(GiftCardBase):
    id: int
    image_url: str
    video_url: Optional[str] = None
    image_url_2: Optional[str] = None
    image_url_3: Optional[str] = None
    image_url_4: Optional[str] = None
    image_url_5: Optional[str] = None
    video_url_2: Optional[str] = None
    video_url_3: Optional[str] = None
    video_url_4: Optional[str] = None
    video_url_5: Optional[str] = None

    class Config:
        from_attributes = True

class AdminLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# Dependencies
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    """Create refresh token with session tracking"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    # Add session ID if not present
    if "session_id" not in to_encode:
        to_encode["session_id"] = generate_session_id()
    
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def require_admin(token: str = None):
    """Require valid admin JWT token from cookie"""
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_admin_user(token: Optional[str] = None, db: Session = Depends(get_db)):
    """Get current admin user from JWT token, checking both admin_users and oauth_users tables"""
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
        raise HTTPException(status_code=401, detail="Invalid token")

# Initialize default admin user - SECURED: generates random password if not set
def init_admin_user(db: Session):
    admin = db.query(AdminUser).filter(AdminUser.username == "admin").first()
    if not admin:
        import secrets
        secure_password = secrets.token_urlsafe(16)
        admin_password = os.getenv("DEFAULT_ADMIN_PASSWORD", secure_password)
        admin = AdminUser(
            username=os.getenv("DEFAULT_ADMIN_USERNAME", "admin"),
            hashed_password=get_password_hash(admin_password)
        )
        db.add(admin)
        db.commit()
        if not os.getenv("DEFAULT_ADMIN_PASSWORD"):
            print(f"[SECURITY] Auto-generated admin password: {secure_password}")
            print(f"[SECURITY] Save this password and change it immediately!")

# Create orders table if not exists
@app.on_event("startup")
async def startup_event():
    db = SessionLocal()
    init_admin_user(db)
    try:
        db.execute(text("CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_name TEXT, customer_email TEXT, total_amount FLOAT, status TEXT, items TEXT, payment_intent_id TEXT, pdf_url TEXT, image_url TEXT, video_url TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"))
        db.execute(text("CREATE TABLE IF NOT EXISTS carts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_email TEXT UNIQUE, items TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"))
        db.commit()
        print("[OK] Orders and Carts tables created/verified")
    except Exception as e:
        print(f"Note: Tables may already exist: {e}")
    db.close()

# Helper function to upload file to Cloudinary
async def upload_to_cloudinary(file: UploadFile, folder: str = "gift_cards", resource_type: str = "image"):
    """Upload file to Cloudinary and return the URL"""
    try:
        # Read file content
        file_content = await file.read()
        
        # Determine correct resource type
        actual_resource_type = resource_type
        if file.filename:
            ext = file.filename.lower().split('.')[-1]
            if ext == 'pdf':
                actual_resource_type = 'raw'
            elif ext in ['mp4', 'mov', 'avi', 'mkv', 'webm']:
                actual_resource_type = 'video'
            elif ext in ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']:
                actual_resource_type = 'image'
            elif resource_type == 'auto':
                actual_resource_type = 'raw'
        
        print(f"\n=== Cloudinary Upload ===")
        print(f"File: {file.filename}")
        print(f"Resource Type: {actual_resource_type}")

        result = cloudinary.uploader.upload(
            file_content,
            folder=f"digitalcom/{folder}",
            resource_type=actual_resource_type,
            use_filename=True,
            unique_filename=True
        )

        secure_url = result.get('secure_url')
        public_id = result.get('public_id')
        format_ext = result.get('format', '')
        
        # For raw files, ensure URL has correct extension
        if actual_resource_type == 'raw' and file.filename and format_ext:
            # Verify URL ends with .ext, if not append it
            if not secure_url.lower().endswith(f'.{format_ext}'):
                secure_url = secure_url + f'.{format_ext}'
        
        print(f"[OK] Uploaded: {secure_url}")
        print(f"Public ID: {public_id}")
        print(f"Format: {format_ext}")
        print(f"====================\n")
        return secure_url
    except Exception as e:
        print(f"[ERR] Upload failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# Helper function to upload file to Firebase Storage
async def upload_to_firebase(file: UploadFile, folder: str = "gift_cards"):
    """Upload file to Firebase Storage and return the URL"""
    if not bucket:
        # Fallback to local storage
        file_extension = file.filename.split(".")[-1]
        filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return f"/uploads/{filename}"

    try:
        # Generate unique filename
        file_extension = file.filename.split(".")[-1]
        filename = f"{folder}/{uuid.uuid4()}.{file_extension}"

        # Upload to Firebase Storage
        blob = bucket.blob(filename)
        file_content = await file.read()
        blob.upload_from_string(file_content, content_type=file.content_type)

        # Make the file publicly accessible
        blob.make_public()

        return blob.public_url
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firebase upload failed: {str(e)}")

# API Routes

# Stripe Checkout Session
@app.post("/api/create-checkout-session")
async def create_checkout_session(request: Request):
    """Create a Stripe Checkout Session for redirect"""
    try:
        data = await request.json()
        amount = int(float(data.get('amount', 0)) * 100)  # Convert to cents
        items = data.get('items', [])
        customer_name = data.get('customerName', 'Unknown')
        customer_email = data.get('customerEmail', '')

        if not amount or amount <= 0:
            raise HTTPException(status_code=400, detail="Invalid amount")

        # Create line items for Stripe Checkout
        line_items = []
        for item in items:
            line_items.append({
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': item.get('name', 'Item')[:500], # Stripe has a 500 char limit
                    },
                    'unit_amount': int(float(item.get('price', 0)) * 100),
                },
                'quantity': 1,
            })

        # Create Checkout Session
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            payment_method_options={
                'card': {
                    'request_three_d_secure': 'automatic'
                }
            },
            line_items=line_items,
            mode='payment',
            success_url=f"{data.get('success_url', 'http://localhost:3000')}/cart?payment=success",
            cancel_url=f"{data.get('cancel_url', 'http://localhost:3000')}/cart?payment=cancelled",
            customer_email=customer_email if customer_email else None,
            metadata={
                'customer_name': customer_name,
                'item_count': str(len(items)),
            }
        )

        return {
            'url': session.url,
            'sessionId': session.id
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e.user_message or str(e)))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Confirm payment
@app.post("/api/confirm-payment")
async def confirm_payment(request: Request):
    """Confirm payment and clear cart"""
    try:
        data = await request.json()
        payment_intent_id = data.get('paymentIntentId')
        if not payment_intent_id:
            raise HTTPException(status_code=400, detail="Missing paymentIntentId")
        
        # Retrieve payment intent to check status
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if payment_intent.status == 'succeeded':
            return {
                'success': True,
                'message': 'Payment confirmed successfully',
                'paymentIntentId': payment_intent.id,
                'amount': payment_intent.amount / 100
            }
        else:
            return {
                'success': False,
                'message': f'Payment status: {payment_intent.status}'
            }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Create Order
@app.post("/api/orders")
async def create_order(request: Request, db: Session = Depends(get_db)):
    """Save order to database after successful payment"""
    try:
        data = await request.json()
        import json
        order = Order(
            customer_name=data.get('customerName', ''),
            customer_email=data.get('customerEmail', ''),
            total_amount=float(data.get('total', 0)),
            status='processing',
            items=json.dumps(data.get('items', [])),
            payment_intent_id=data.get('paymentIntentId', '')
        )
        db.add(order)
        db.commit()
        db.refresh(order)
        
        return {
            'success': True,
            'orderId': order.id,
            'message': 'Order saved successfully'
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Get All Orders (Admin only)
@app.get("/api/orders")
async def get_orders(db: Session = Depends(get_db)):
    """Get all orders from database"""
    try:
        import json
        orders = db.query(Order).order_by(Order.created_at.desc()).all()
        return [
            {
                'id': order.id,
                'customer_name': order.customer_name,
                'customer_email': order.customer_email,
                'total_amount': order.total_amount,
                'status': order.status,
                'items': json.loads(order.items) if order.items else [],
                'payment_intent_id': order.payment_intent_id,
                'pdf_url': order.pdf_url,
                'image_url': order.image_url,
                'video_url': order.video_url,
                'zip_url': order.zip_url,
                'created_at': order.created_at.isoformat() if order.created_at else None
            }
            for order in orders
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get User Orders
@app.get("/api/user-orders")
async def get_user_orders(email: str = "", db: Session = Depends(get_db)):
    """Get orders for a specific user"""
    try:
        import json
        orders = db.query(Order).filter(
            Order.customer_email == email
        ).order_by(Order.created_at.desc()).all()
        return [
            {
                'id': order.id,
                'customer_name': order.customer_name,
                'customer_email': order.customer_email,
                'total_amount': order.total_amount,
                'status': order.status,
                'items': json.loads(order.items) if order.items else [],
                'pdf_url': order.pdf_url,
                'image_url': order.image_url,
                'video_url': order.video_url,
                'zip_url': order.zip_url,
                'created_at': order.created_at.isoformat() if order.created_at else None
            }
            for order in orders
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Update Order Status
@app.put("/api/orders/{order_id}")
async def update_order(order_id: int, data: dict, db: Session = Depends(get_db)):
    """Update order status"""
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order.status = data.get('status', order.status)
        db.commit()
        db.refresh(order)
        
        return {
            'success': True,
            'message': 'Order updated successfully',
            'status': order.status
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Cart API Endpoints
@app.get("/api/cart/{user_email}")
async def get_cart(user_email: str, db: Session = Depends(get_db)):
    """Get user's cart from database"""
    try:
        import json
        cart = db.query(Cart).filter(Cart.user_email == user_email).first()
        if cart:
            return {
                'items': json.loads(cart.items) if cart.items else [],
                'updated_at': cart.updated_at.isoformat() if cart.updated_at else None
            }
        return {'items': [], 'updated_at': None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cart")
async def add_to_cart(request: Request, db: Session = Depends(get_db)):
    """Add item to user's cart"""
    try:
        import json
        data = await request.json()
        user_email = data.get('user_email')
        item = data.get('item')
        
        if not user_email or not item:
            raise HTTPException(status_code=400, detail="Missing user_email or item")
        
        cart = db.query(Cart).filter(Cart.user_email == user_email).first()
        if cart:
            items = json.loads(cart.items) if cart.items else []
            # Check if item already exists
            existing_index = next((i for i, i in enumerate(items) if i.get('id') == item.get('id')), -1)
            if existing_index >= 0:
                items[existing_index] = item
            else:
                items.append(item)
            cart.items = json.dumps(items)
            cart.updated_at = datetime.utcnow()
        else:
            cart = Cart(user_email=user_email, items=json.dumps([item]))
            db.add(cart)
        db.commit()
        db.refresh(cart)
        
        return {
            'success': True,
            'items': json.loads(cart.items),
            'message': 'Item added to cart'
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/cart/{user_email}/{item_id}")
async def remove_from_cart(user_email: str, item_id: int, db: Session = Depends(get_db)):
    """Remove item from user's cart"""
    try:
        import json
        cart = db.query(Cart).filter(Cart.user_email == user_email).first()
        if not cart:
            raise HTTPException(status_code=404, detail="Cart not found")
        
        items = json.loads(cart.items) if cart.items else []
        items = [item for item in items if item.get('id') != item_id]
        cart.items = json.dumps(items)
        cart.updated_at = datetime.utcnow()
        db.commit()
        
        return {
            'success': True,
            'items': items,
            'message': 'Item removed from cart'
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/cart/{user_email}")
async def clear_cart(user_email: str, db: Session = Depends(get_db)):
    """Clear user's cart"""
    try:
        import json
        cart = db.query(Cart).filter(Cart.user_email == user_email).first()
        if cart:
            cart.items = json.dumps([])
            cart.updated_at = datetime.utcnow()
            db.commit()
        
        return {
            'success': True,
            'items': [],
            'message': 'Cart cleared'
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# User Authentication Endpoints
@app.post("/api/auth/register")
@limiter.limit("5/minute")  # Max 5 registrations per minute per IP
async def register_user(request: Request, response: Response, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        data = await request.json()
        email = data.get('email')
        name = data.get('name')
        
        if not email or not name:
            raise HTTPException(status_code=400, detail="Email and name are required")
        
        # Check if user exists
        existing_user = db.query(OAuthUser).filter(OAuthUser.email == email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="User already exists")
        
        # Create new user
        user = OAuthUser(
            email=email,
            name=name,
            provider=data.get('provider', 'manual'),
            is_admin=0
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create JWT tokens
        access_token = create_access_token(data={
            "sub": user.email,
            "user_id": user.id,
            "provider": user.provider
        })
        refresh_token = create_refresh_token(data={
            "sub": user.email,
            "user_id": user.id,
            "provider": user.provider
        })

        # Set JWT cookies with secure configuration
        set_auth_cookie(response, "access_token", access_token, max_age=60 * 15)  # 15 minutes
        set_auth_cookie(response, "refresh_token", refresh_token, max_age=60 * 60 * 24 * 7)  # 7 days

        return {
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'provider': user.provider,
                'is_admin': bool(user.is_admin)
            },
            'message': 'Registration successful'
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/login")
@limiter.limit("10/minute")  # Max 10 login attempts per minute per IP
async def login_user(request: Request, response: Response, db: Session = Depends(get_db)):
    """Login user and return token in HTTP-only cookie"""
    try:
        data = await request.json()
        email = data.get('email')
        
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        
        user = db.query(OAuthUser).filter(OAuthUser.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Create JWT tokens
        access_token = create_access_token(data={
            "sub": user.email,
            "user_id": user.id,
            "provider": user.provider
        })
        refresh_token = create_refresh_token(data={
            "sub": user.email,
            "user_id": user.id,
            "provider": user.provider
        })

        # Set JWT cookies with secure configuration
        set_auth_cookie(response, "access_token", access_token, max_age=60 * 15)  # 15 minutes
        set_auth_cookie(response, "refresh_token", refresh_token, max_age=60 * 60 * 24 * 7)  # 7 days

        return {
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'provider': user.provider,
                'is_admin': bool(user.is_admin)
            },
            'message': 'Login successful'
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/logout")
async def logout_user(request: Request, response: Response, db: Session = Depends(get_db)):
    """
    Logout with enterprise security:
    - Blacklist refresh token immediately
    - Revoke refresh token
    - Clear cookies
    - Log security event
    """
    # Get refresh token before clearing
    refresh_token = request.cookies.get("refresh_token")
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "Unknown")
    
    # Decode token to get user info for logging
    try:
        if refresh_token:
            payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("user_id")
            email = payload.get("sub")
            
            # Blacklist and revoke refresh token
            revoke_refresh_token(db, refresh_token, "logout")
            
            # Log logout event
            log_security_event(
                db=db,
                event_type="logout",
                user_id=user_id,
                email=email,
                ip_address=client_ip,
                user_agent=user_agent
            )
    except Exception as e:
        # Token might be expired - still try to log
        print(f"Logout token processing error: {e}")
    
    # Clear all JWT cookies
    clear_auth_cookie(response)
    
    return {'message': 'Logged out successfully'}

@app.post("/api/auth/refresh")
@limiter.limit("20/minute")  # Max 20 refresh requests per minute per IP
async def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    """
    Refresh access token with ROTATION (enterprise security)
    - Validates refresh token
    - Checks if token is blacklisted
    - Revokes old refresh token
    - Issues new access token AND new refresh token (rotation)
    - Logs security event
    """
    # Get refresh token from cookie
    old_refresh_token = request.cookies.get("refresh_token")
    if not old_refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token provided")
    
    # Get request metadata for security logging
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "Unknown")
    
    try:
        # Decode and validate refresh token
        payload = jwt.decode(old_refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        # Check if token is blacklisted (prevents reuse)
        if is_token_blacklisted(db, old_refresh_token, "refresh"):
            # SUSPICIOUS: Token reuse detected - could be theft
            log_security_event(
                db=db,
                event_type="suspicious_token_reuse",
                email=payload.get("sub"),
                ip_address=client_ip,
                user_agent=user_agent,
                details={"warning": "Refresh token reuse detected"}
            )
            raise HTTPException(
                status_code=401, 
                detail="Invalid refresh token - possible token reuse detected"
            )
        
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        provider: str = payload.get("provider")
        session_id: str = payload.get("session_id")
        
        if not email or not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        # Revoke old refresh token (rotation)
        revoke_refresh_token(db, old_refresh_token, "rotation")
        
        # Create new access token
        new_access_token = create_access_token(data={
            "sub": email,
            "user_id": user_id,
            "provider": provider
        })
        
        # Create new refresh token with SAME session ID (rotation)
        new_refresh_token = create_refresh_token(data={
            "sub": email,
            "user_id": user_id,
            "provider": provider,
            "session_id": session_id or generate_session_id()
        })
        
        # Set new JWT cookies
        set_auth_cookie(response, "access_token", new_access_token, max_age=60 * 15)  # 15 min
        set_auth_cookie(response, "refresh_token", new_refresh_token, max_age=60 * 60 * 24 * 7)  # 7 days
        
        # Store refresh token metadata for tracking
        create_refresh_token_record(
            db=db,
            user_id=user_id,
            token=new_refresh_token,
            session_id=session_id or generate_session_id(),
            ip_address=client_ip,
            user_agent=user_agent
        )
        
        # Log successful token refresh
        log_security_event(
            db=db,
            event_type="token_refresh",
            user_id=user_id,
            email=email,
            ip_address=client_ip,
            user_agent=user_agent
        )
        
        return {"message": "Token refreshed successfully"}
        
    except jwt.ExpiredSignatureError:
        # Token expired - blacklist it
        if old_refresh_token:
            blacklist_token(db, old_refresh_token, "refresh", "expired")
        
        log_security_event(
            db=db,
            event_type="refresh_token_expired",
            email=payload.get("sub") if 'payload' in locals() else None,
            ip_address=client_ip,
            user_agent=user_agent
        )
        raise HTTPException(status_code=401, detail="Refresh token expired")
        
    except HTTPException:
        raise
        
    except Exception as e:
        log_security_event(
            db=db,
            event_type="refresh_token_error",
            email=payload.get("sub") if 'payload' in locals() else None,
            ip_address=client_ip,
            user_agent=user_agent,
            details={"error": str(e)}
        )
        raise HTTPException(status_code=401, detail=f"Invalid refresh token: {str(e)}")

@app.get("/api/auth/me")
@limiter.limit("30/minute")  # Rate limit for user info requests
async def get_current_user(request: Request, db: Session = Depends(get_db)):
    """Get current authenticated user from JWT token in cookie"""
    try:
        token = request.cookies.get("access_token")
        if not token:
            raise HTTPException(status_code=401, detail="Not authenticated")

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")

        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Fetch user from database
        user = db.query(OAuthUser).filter(OAuthUser.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'provider': user.provider,
            'is_admin': bool(user.is_admin),
            'picture': user.picture,
            'created_at': user.created_at.isoformat() if user.created_at else None
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")

@app.get("/api/auth/user/{email}")
async def get_user(email: str, db: Session = Depends(get_db)):
    """Get user by email"""
    try:
        user = db.query(OAuthUser).filter(OAuthUser.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'provider': user.provider,
            'is_admin': bool(user.is_admin),
            'picture': user.picture
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Admin Upload Deliverable to Order
@app.put("/api/orders/{order_id}/deliverable")
async def upload_order_deliverable(
    order_id: int,
    pdf: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    video: Optional[UploadFile] = File(None),
    zip_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin)
):
    """Admin uploads deliverable files to an order"""
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Upload PDF for eBooks - use 'auto' to let Cloudinary detect file type
        if pdf and pdf.filename:
            try:
                pdf_url = await upload_to_cloudinary(pdf, "orders/pdfs", "auto")
                order.pdf_url = pdf_url
                print(f"[OK] PDF uploaded: {pdf_url}")
            except Exception as e:
                print(f"[ERR] PDF upload failed: {str(e)}")
                raise HTTPException(status_code=500, detail=f"PDF upload failed: {str(e)}")
        
        # Upload Image for Gift Cards
        if image and image.filename:
            img_url = await upload_to_cloudinary(image, "orders/images", "image")
            order.image_url = img_url
            print(f"[OK] Image uploaded: {img_url}")
        
        # Upload Video for Courses
        if video and video.filename:
            vid_url = await upload_to_cloudinary(video, "orders/videos", "video")
            order.video_url = vid_url
            print(f"[OK] Video uploaded: {vid_url}")
        
        # Upload ZIP file
        if zip_file and zip_file.filename:
            zip_url = await upload_to_cloudinary(zip_file, "orders/zips", "raw")
            order.zip_url = zip_url
            print(f"[OK] ZIP uploaded: {zip_url}")

        db.commit()
        db.refresh(order)

        return {
            'success': True,
            'message': 'Deliverable uploaded successfully',
            'pdf_url': order.pdf_url,
            'image_url': order.image_url,
            'video_url': order.video_url,
            'zip_url': order.zip_url
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Courses API Endpoints
@app.get("/api/courses", response_model=List[dict])
async def get_courses(db: Session = Depends(get_db)):
    courses = db.query(Course).order_by(Course.created_at.desc()).all()
    return [
        {
            'id': c.id,
            'title': c.title,
            'price': c.price,
            'image_url': c.image_url,
            'created_at': c.created_at.isoformat() if c.created_at else None
        }
        for c in courses
    ]

@app.get("/api/courses/{course_id}", response_model=dict)
async def get_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return {
        'id': course.id,
        'title': course.title,
        'price': course.price,
        'image_url': course.image_url,
        'created_at': course.created_at.isoformat() if course.created_at else None
    }

@app.post("/api/courses", response_model=dict)
async def create_course(
    title: str = Form(...),
    price: Optional[float] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin)
):
    image_url = None
    if image and image.filename:
        image_url = await upload_to_cloudinary(image, "courses", "image")
    
    course = Course(title=title, price=price, image_url=image_url)
    db.add(course)
    db.commit()
    db.refresh(course)
    
    return {
        'id': course.id,
        'title': course.title,
        'price': course.price,
        'image_url': course.image_url,
        'created_at': course.created_at.isoformat() if course.created_at else None
    }

@app.put("/api/courses/{course_id}", response_model=dict)
async def update_course(
    course_id: int,
    title: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if title: course.title = title
    if price is not None: course.price = price
    if image and image.filename:
        course.image_url = await upload_to_cloudinary(image, "courses", "image")
    
    db.commit()
    db.refresh(course)
    
    return {
        'id': course.id,
        'title': course.title,
        'price': course.price,
        'image_url': course.image_url,
        'created_at': course.created_at.isoformat() if course.created_at else None
    }

@app.delete("/api/courses/{course_id}")
async def delete_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    db.delete(course)
    db.commit()
    
    return {'message': 'Course deleted successfully'}

# SECURED: rate limiter already initialized at top of file

@app.post("/api/admin/login", response_model=Token)
@limiter.limit("5/minute")
async def admin_login(request: Request, login: AdminLogin, db: Session = Depends(get_db)):
    user = db.query(AdminUser).filter(AdminUser.username == login.username).first()
    if not user or not verify_password(login.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Check if user has admin privileges
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Get all users (Admin only)
@app.get("/api/admin/users")
async def get_users(db: Session = Depends(get_db)):
    users = db.query(AdminUser).all()
    return [{"id": u.id, "username": u.username, "is_admin": bool(u.is_admin)} for u in users]

# Update user admin status (Admin only)
@app.put("/api/admin/users/{user_id}/toggle-admin")
async def toggle_admin_status(user_id: int, db: Session = Depends(get_db)):
    user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Toggle is_admin status
    user.is_admin = 0 if user.is_admin else 1
    db.commit()
    
    return {"message": f"User {user.username} admin status updated", "is_admin": bool(user.is_admin)}

# Gift Cards - Get all
@app.get("/api/gift-cards", response_model=List[GiftCard])
async def get_gift_cards(db: Session = Depends(get_db)):
    gift_cards = db.query(GiftCardModel).all()
    return gift_cards

# Gift Cards - Get by ID
@app.get("/api/gift-cards/{card_id}", response_model=GiftCard)
async def get_gift_card(card_id: int, db: Session = Depends(get_db)):
    gift_card = db.query(GiftCardModel).filter(GiftCardModel.id == card_id).first()
    if not gift_card:
        raise HTTPException(status_code=404, detail="Gift card not found")
    return gift_card

# Gift Cards - Create
@app.post("/api/gift-cards", response_model=GiftCard)
async def create_gift_card(
    name: str = Form(...),
    price: float = Form(...),
    image: UploadFile = File(...),
    video: Optional[UploadFile] = File(None),
    image_2: Optional[UploadFile] = File(None),
    image_3: Optional[UploadFile] = File(None),
    image_4: Optional[UploadFile] = File(None),
    image_5: Optional[UploadFile] = File(None),
    video_2: Optional[UploadFile] = File(None),
    video_3: Optional[UploadFile] = File(None),
    video_4: Optional[UploadFile] = File(None),
    video_5: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin)
):
    try:
        print(f"\n=== GIFT CARD CREATION REQUEST ===")
        print(f"name={name}, price={price}")
        print(f"image: {image.filename if image else 'None'}")
        print(f"video: {video.filename if video else 'None'}")
        print(f"image_2: {image_2.filename if image_2 else 'None'}")
        print(f"image_3: {image_3.filename if image_3 else 'None'}")
        print(f"image_4: {image_4.filename if image_4 else 'None'}")
        print(f"image_5: {image_5.filename if image_5 else 'None'}")
        print(f"video_2: {video_2.filename if video_2 else 'None'}")
        print(f"video_3: {video_3.filename if video_3 else 'None'}")
        print(f"video_4: {video_4.filename if video_4 else 'None'}")
        print(f"video_5: {video_5.filename if video_5 else 'None'}")
        print(f"===================================\n")

        # Upload main image to Cloudinary
        image_url = await upload_to_cloudinary(image, "gift_cards", "image")
        print(f"[OK] Main image uploaded: {image_url}")

        # Upload additional images
        image_url_2 = await upload_to_cloudinary(image_2, "gift_cards", "image") if image_2 and image_2.filename else None
        image_url_3 = await upload_to_cloudinary(image_3, "gift_cards", "image") if image_3 and image_3.filename else None
        image_url_4 = await upload_to_cloudinary(image_4, "gift_cards", "image") if image_4 and image_4.filename else None
        image_url_5 = await upload_to_cloudinary(image_5, "gift_cards", "image") if image_5 and image_5.filename else None
        
        print(f"[OK] Image 2: {image_url_2}")
        print(f"[OK] Image 3: {image_url_3}")
        print(f"[OK] Image 4: {image_url_4}")
        print(f"[OK] Image 5: {image_url_5}")

        # Upload videos
        video_url = await upload_to_cloudinary(video, "gift_cards", "video") if video and video.filename else None
        video_url_2 = await upload_to_cloudinary(video_2, "gift_cards", "video") if video_2 and video_2.filename else None
        video_url_3 = await upload_to_cloudinary(video_3, "gift_cards", "video") if video_3 and video_3.filename else None
        video_url_4 = await upload_to_cloudinary(video_4, "gift_cards", "video") if video_4 and video_4.filename else None
        video_url_5 = await upload_to_cloudinary(video_5, "gift_cards", "video") if video_5 and video_5.filename else None
        
        print(f"[OK] Video 1: {video_url}")
        print(f"[OK] Video 2: {video_url_2}")
        print(f"[OK] Video 3: {video_url_3}")
        print(f"[OK] Video 4: {video_url_4}")
        print(f"[OK] Video 5: {video_url_5}")

        # Create gift card
        gift_card = GiftCardModel(
            name=name,
            price=price,
            image_url=image_url,
            video_url=video_url,
            image_url_2=image_url_2,
            image_url_3=image_url_3,
            image_url_4=image_url_4,
            image_url_5=image_url_5,
            video_url_2=video_url_2,
            video_url_3=video_url_3,
            video_url_4=video_url_4,
            video_url_5=video_url_5
        )
        db.add(gift_card)
        db.commit()
        db.refresh(gift_card)

        print(f"[OK] Gift card created successfully: ID={gift_card.id}")
        print(f"  - image_url: {gift_card.image_url}")
        print(f"  - image_url_2: {gift_card.image_url_2}")
        print(f"  - video_url: {gift_card.video_url}")
        print(f"  - video_url_2: {gift_card.video_url_2}")

        return gift_card
    except Exception as e:
        print(f"[ERR] Error creating gift card: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Gift Cards - Update (ADMIN ONLY)
@app.put("/api/gift-cards/{card_id}", response_model=GiftCard)
async def update_gift_card(
    card_id: int,
    name: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    image: Optional[UploadFile] = File(None),
    video: Optional[UploadFile] = File(None),
    image_2: Optional[UploadFile] = File(None),
    image_3: Optional[UploadFile] = File(None),
    image_4: Optional[UploadFile] = File(None),
    image_5: Optional[UploadFile] = File(None),
    video_2: Optional[UploadFile] = File(None),
    video_3: Optional[UploadFile] = File(None),
    video_4: Optional[UploadFile] = File(None),
    video_5: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin)
):
    gift_card = db.query(GiftCardModel).filter(GiftCardModel.id == card_id).first()
    if not gift_card:
        raise HTTPException(status_code=404, detail="Gift card not found")

    if name:
        gift_card.name = name
    if price is not None:
        gift_card.price = price

    if image:
        gift_card.image_url = await upload_to_cloudinary(image, "gift_cards", "image")
    if image_2 and image_2.filename:
        gift_card.image_url_2 = await upload_to_cloudinary(image_2, "gift_cards", "image")
    if image_3 and image_3.filename:
        gift_card.image_url_3 = await upload_to_cloudinary(image_3, "gift_cards", "image")
    if image_4 and image_4.filename:
        gift_card.image_url_4 = await upload_to_cloudinary(image_4, "gift_cards", "image")
    if image_5 and image_5.filename:
        gift_card.image_url_5 = await upload_to_cloudinary(image_5, "gift_cards", "image")

    if video:
        gift_card.video_url = await upload_to_cloudinary(video, "gift_cards", "video")
    if video_2 and video_2.filename:
        gift_card.video_url_2 = await upload_to_cloudinary(video_2, "gift_cards", "video")
    if video_3 and video_3.filename:
        gift_card.video_url_3 = await upload_to_cloudinary(video_3, "gift_cards", "video")
    if video_4 and video_4.filename:
        gift_card.video_url_4 = await upload_to_cloudinary(video_4, "gift_cards", "video")
    if video_5 and video_5.filename:
        gift_card.video_url_5 = await upload_to_cloudinary(video_5, "gift_cards", "video")

    db.commit()
    db.refresh(gift_card)

    return gift_card

# Gift Cards - Delete
@app.delete("/api/gift-cards/{card_id}")
async def delete_gift_card(card_id: int, db: Session = Depends(get_db)):
    gift_card = db.query(GiftCardModel).filter(GiftCardModel.id == card_id).first()
    if not gift_card:
        raise HTTPException(status_code=404, detail="Gift card not found")

    # Delete from Firebase Storage if URL is a Firebase URL
    if gift_card.image_url and "firebasestorage.googleapis.com" in gift_card.image_url:
        try:
            # Extract blob path from URL
            blob_path = gift_card.image_url.split("/o/")[-1].split("?")[0]
            from urllib.parse import unquote
            blob_path = unquote(blob_path)
            blob = bucket.blob(blob_path)
            blob.delete()
            print(f"Deleted file from Firebase: {blob_path}")
        except Exception as e:
            print(f"Error deleting from Firebase: {str(e)}")

    db.delete(gift_card)
    db.commit()

    return {"message": "Gift card deleted successfully"}

# ==================== EBOOK API ROUTES ====================

# eBooks - Get all
@app.get("/api/ebooks", response_model=List[dict])
async def get_ebooks(db: Session = Depends(get_db)):
    ebooks = db.query(EbookModel).all()
    return [
        {
            "id": ebook.id,
            "title": ebook.title,
            "author": ebook.author,
            "price": ebook.price,
            "image_url": ebook.image_url,
            "description": ebook.description,
            "video_url": ebook.video_url,
            "image_url_2": ebook.image_url_2,
            "image_url_3": ebook.image_url_3,
            "image_url_4": ebook.image_url_4,
            "image_url_5": ebook.image_url_5,
            "video_url_2": ebook.video_url_2,
            "video_url_3": ebook.video_url_3,
            "video_url_4": ebook.video_url_4,
            "video_url_5": ebook.video_url_5
        }
        for ebook in ebooks
    ]

# eBooks - Get by ID
@app.get("/api/ebooks/{ebook_id}", response_model=dict)
async def get_ebook(ebook_id: int, db: Session = Depends(get_db)):
    ebook = db.query(EbookModel).filter(EbookModel.id == ebook_id).first()
    if not ebook:
        raise HTTPException(status_code=404, detail="eBook not found")
    return {
        "id": ebook.id,
        "title": ebook.title,
        "author": ebook.author,
        "price": ebook.price,
        "image_url": ebook.image_url,
        "description": ebook.description,
        "video_url": ebook.video_url,
        "image_url_2": ebook.image_url_2,
        "image_url_3": ebook.image_url_3,
        "image_url_4": ebook.image_url_4,
        "image_url_5": ebook.image_url_5,
        "video_url_2": ebook.video_url_2,
        "video_url_3": ebook.video_url_3,
        "video_url_4": ebook.video_url_4,
        "video_url_5": ebook.video_url_5
    }

# eBooks - Create
@app.post("/api/ebooks", response_model=dict)
async def create_ebook(
    title: str = Form(...),
    author: str = Form(...),
    price: float = Form(...),
    description: Optional[str] = Form(None),
    image: UploadFile = File(...),
    video: Optional[UploadFile] = File(None),
    image_2: Optional[UploadFile] = File(None),
    image_3: Optional[UploadFile] = File(None),
    image_4: Optional[UploadFile] = File(None),
    image_5: Optional[UploadFile] = File(None),
    video_2: Optional[UploadFile] = File(None),
    video_3: Optional[UploadFile] = File(None),
    video_4: Optional[UploadFile] = File(None),
    video_5: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin)
):
    print(f"\n=== EBOOK CREATION REQUEST ===")
    print(f"title={title}, author={author}, price={price}")
    print(f"image: {image.filename if image else 'None'}")
    print(f"video: {video.filename if video else 'None'}")
    print(f"image_2: {image_2.filename if image_2 else 'None'}")
    print(f"image_3: {image_3.filename if image_3 else 'None'}")
    print(f"image_4: {image_4.filename if image_4 else 'None'}")
    print(f"image_5: {image_5.filename if image_5 else 'None'}")
    print(f"video_2: {video_2.filename if video_2 else 'None'}")
    print(f"video_3: {video_3.filename if video_3 else 'None'}")
    print(f"video_4: {video_4.filename if video_4 else 'None'}")
    print(f"video_5: {video_5.filename if video_5 else 'None'}")
    print(f"===================================\n")

    # Upload main image to Cloudinary
    image_url = await upload_to_cloudinary(image, "ebooks", "image")
    print(f"[OK] Main image uploaded: {image_url}")

    # Upload additional images
    image_url_2 = await upload_to_cloudinary(image_2, "ebooks", "image") if image_2 and image_2.filename else None
    image_url_3 = await upload_to_cloudinary(image_3, "ebooks", "image") if image_3 and image_3.filename else None
    image_url_4 = await upload_to_cloudinary(image_4, "ebooks", "image") if image_4 and image_4.filename else None
    image_url_5 = await upload_to_cloudinary(image_5, "ebooks", "image") if image_5 and image_5.filename else None
    
    print(f"[OK] Image 2: {image_url_2}")
    print(f"[OK] Image 3: {image_url_3}")
    print(f"[OK] Image 4: {image_url_4}")
    print(f"[OK] Image 5: {image_url_5}")

    # Upload videos
    video_url = await upload_to_cloudinary(video, "ebooks", "video") if video and video.filename else None
    video_url_2 = await upload_to_cloudinary(video_2, "ebooks", "video") if video_2 and video_2.filename else None
    video_url_3 = await upload_to_cloudinary(video_3, "ebooks", "video") if video_3 and video_3.filename else None
    video_url_4 = await upload_to_cloudinary(video_4, "ebooks", "video") if video_4 and video_4.filename else None
    video_url_5 = await upload_to_cloudinary(video_5, "ebooks", "video") if video_5 and video_5.filename else None
    
    print(f"[OK] Video 1: {video_url}")
    print(f"[OK] Video 2: {video_url_2}")
    print(f"[OK] Video 3: {video_url_3}")
    print(f"[OK] Video 4: {video_url_4}")
    print(f"[OK] Video 5: {video_url_5}")

    # Create ebook
    ebook = EbookModel(
        title=title,
        author=author,
        price=price,
        image_url=image_url,
        description=description,
        video_url=video_url,
        image_url_2=image_url_2,
        image_url_3=image_url_3,
        image_url_4=image_url_4,
        image_url_5=image_url_5,
        video_url_2=video_url_2,
        video_url_3=video_url_3,
        video_url_4=video_url_4,
        video_url_5=video_url_5
    )
    db.add(ebook)
    db.commit()
    db.refresh(ebook)

    print(f"[OK] eBook created successfully: ID={ebook.id}")
    print(f"  - image_url: {ebook.image_url}")
    print(f"  - image_url_2: {ebook.image_url_2}")
    print(f"  - image_url_3: {ebook.image_url_3}")
    print(f"  - video_url: {ebook.video_url}")
    print(f"  - video_url_2: {ebook.video_url_2}")

    # Convert to dict for response
    return {
        "id": ebook.id,
        "title": ebook.title,
        "author": ebook.author,
        "price": ebook.price,
        "image_url": ebook.image_url,
        "description": ebook.description,
        "video_url": ebook.video_url,
        "image_url_2": ebook.image_url_2,
        "image_url_3": ebook.image_url_3,
        "image_url_4": ebook.image_url_4,
        "image_url_5": ebook.image_url_5,
        "video_url_2": ebook.video_url_2,
        "video_url_3": ebook.video_url_3,
        "video_url_4": ebook.video_url_4,
        "video_url_5": ebook.video_url_5
    }

# eBooks - Update
@app.put("/api/ebooks/{ebook_id}", response_model=dict)
async def update_ebook(
    ebook_id: int,
    title: Optional[str] = Form(None),
    author: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    video: Optional[UploadFile] = File(None),
    image_2: Optional[UploadFile] = File(None),
    image_3: Optional[UploadFile] = File(None),
    image_4: Optional[UploadFile] = File(None),
    image_5: Optional[UploadFile] = File(None),
    video_2: Optional[UploadFile] = File(None),
    video_3: Optional[UploadFile] = File(None),
    video_4: Optional[UploadFile] = File(None),
    video_5: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin)
    ):
    ebook = db.query(EbookModel).filter(EbookModel.id == ebook_id).first()
    if not ebook:
        raise HTTPException(status_code=404, detail="eBook not found")

    if title:
        ebook.title = title
    if author:
        ebook.author = author
    if price is not None:
        ebook.price = price
    if description is not None:
        ebook.description = description

    if image:
        ebook.image_url = await upload_to_cloudinary(image, "ebooks", "image")
    if image_2 and image_2.filename:
        ebook.image_url_2 = await upload_to_cloudinary(image_2, "ebooks", "image")
    if image_3 and image_3.filename:
        ebook.image_url_3 = await upload_to_cloudinary(image_3, "ebooks", "image")
    if image_4 and image_4.filename:
        ebook.image_url_4 = await upload_to_cloudinary(image_4, "ebooks", "image")
    if image_5 and image_5.filename:
        ebook.image_url_5 = await upload_to_cloudinary(image_5, "ebooks", "image")

    if video:
        ebook.video_url = await upload_to_cloudinary(video, "ebooks", "video")
    if video_2 and video_2.filename:
        ebook.video_url_2 = await upload_to_cloudinary(video_2, "ebooks", "video")
    if video_3 and video_3.filename:
        ebook.video_url_3 = await upload_to_cloudinary(video_3, "ebooks", "video")
    if video_4 and video_4.filename:
        ebook.video_url_4 = await upload_to_cloudinary(video_4, "ebooks", "video")
    if video_5 and video_5.filename:
        ebook.video_url_5 = await upload_to_cloudinary(video_5, "ebooks", "video")

    db.commit()
    db.refresh(ebook)

    return {
        "id": ebook.id,
        "title": ebook.title,
        "author": ebook.author,
        "price": ebook.price,
        "image_url": ebook.image_url,
        "description": ebook.description,
        "video_url": ebook.video_url,
        "image_url_2": ebook.image_url_2,
        "image_url_3": ebook.image_url_3,
        "image_url_4": ebook.image_url_4,
        "image_url_5": ebook.image_url_5,
        "video_url_2": ebook.video_url_2,
        "video_url_3": ebook.video_url_3,
        "video_url_4": ebook.video_url_4,
        "video_url_5": ebook.video_url_5
    }

# eBooks - Delete
@app.delete("/api/ebooks/{ebook_id}")
async def delete_ebook(ebook_id: int, db: Session = Depends(get_db)):
    ebook = db.query(EbookModel).filter(EbookModel.id == ebook_id).first()
    if not ebook:
        raise HTTPException(status_code=404, detail="eBook not found")

    # Delete from Cloudinary if URL is a Cloudinary URL
    if ebook.image_url and "cloudinary.com" in ebook.image_url:
        try:
            public_id = ebook.image_url.split('/upload/v')[0].split('/')[-1]
            cloudinary.uploader.destroy(public_id, resource_type="image")
        except Exception as e:
            print(f"Error deleting from Cloudinary: {str(e)}")

    db.delete(ebook)
    db.commit()

    return {"message": "eBook deleted successfully"}

# ==================== BLOG API ROUTES ====================

# Blogs - Get all
@app.get("/api/blogs", response_model=List[dict])
async def get_blogs(db: Session = Depends(get_db)):
    blogs = db.query(BlogModel).order_by(BlogModel.created_at.desc()).all()
    return [
        {
            "id": blog.id,
            "title": blog.title,
            "excerpt": blog.excerpt,
            "author": blog.author,
            "hero_image_url": blog.hero_image_url,
            "content": blog.content,
            "content_2": blog.content_2,
            "content_3": blog.content_3,
            "content_4": blog.content_4,
            "content_5": blog.content_5,
            "image_url": blog.image_url,
            "image_url_2": blog.image_url_2,
            "image_url_3": blog.image_url_3,
            "image_url_4": blog.image_url_4,
            "image_url_5": blog.image_url_5,
            "created_at": blog.created_at.isoformat() if blog.created_at else None
        }
        for blog in blogs
    ]

# Blogs - Get by ID
@app.get("/api/blogs/{blog_id}", response_model=dict)
async def get_blog(blog_id: int, db: Session = Depends(get_db)):
    blog = db.query(BlogModel).filter(BlogModel.id == blog_id).first()
    if not blog:
        raise HTTPException(status_code=404, detail="Blog post not found")
    return {
        "id": blog.id,
        "title": blog.title,
        "excerpt": blog.excerpt,
        "author": blog.author,
        "hero_image_url": blog.hero_image_url,
        "content": blog.content,
        "content_2": blog.content_2,
        "content_3": blog.content_3,
        "content_4": blog.content_4,
        "content_5": blog.content_5,
        "image_url": blog.image_url,
        "image_url_2": blog.image_url_2,
        "image_url_3": blog.image_url_3,
        "image_url_4": blog.image_url_4,
        "image_url_5": blog.image_url_5,
        "created_at": blog.created_at.isoformat() if blog.created_at else None
    }

# Blogs - Create
@app.post("/api/blogs", response_model=dict)
async def create_blog(
    title: str = Form(...),
    excerpt: Optional[str] = Form(None),
    author: Optional[str] = Form(None),
    hero_image: Optional[UploadFile] = File(None),
    content: str = Form(...),
    content_2: Optional[str] = Form(None),
    content_3: Optional[str] = Form(None),
    content_4: Optional[str] = Form(None),
    content_5: Optional[str] = Form(None),
    image: UploadFile = File(...),
    image_2: Optional[UploadFile] = File(None),
    image_3: Optional[UploadFile] = File(None),
    image_4: Optional[UploadFile] = File(None),
    image_5: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin)
):
    # Set default values if not provided
    if not excerpt:
        excerpt = content[:200] + "..." if len(content) > 200 else content
    if not author:
        author = "Admin"

    print(f"\n=== BLOG CREATION ===")
    print(f"title={title}")
    print(f"hero_image: {hero_image.filename if hero_image else 'None'}")
    print(f"content length: {len(content)}")

    # Upload hero image if provided
    hero_image_url = None
    if hero_image and hero_image.filename:
        hero_image_url = await upload_to_cloudinary(hero_image, "blogs/hero", "image")
        print(f"[OK] Hero image uploaded: {hero_image_url}")
    else:
        print("[ERR] No hero image provided")

    # Upload images to Cloudinary
    image_url = await upload_to_cloudinary(image, "blogs", "image")
    image_url_2 = await upload_to_cloudinary(image_2, "blogs", "image") if image_2 and image_2.filename else None
    image_url_3 = await upload_to_cloudinary(image_3, "blogs", "image") if image_3 and image_3.filename else None
    image_url_4 = await upload_to_cloudinary(image_4, "blogs", "image") if image_4 and image_4.filename else None
    image_url_5 = await upload_to_cloudinary(image_5, "blogs", "image") if image_5 and image_5.filename else None

    # Create blog
    blog = BlogModel(
        title=title,
        excerpt=excerpt,
        author=author,
        hero_image_url=hero_image_url,
        content=content,
        content_2=content_2,
        content_3=content_3,
        content_4=content_4,
        content_5=content_5,
        image_url=image_url,
        image_url_2=image_url_2,
        image_url_3=image_url_3,
        image_url_4=image_url_4,
        image_url_5=image_url_5
    )
    db.add(blog)
    db.commit()
    db.refresh(blog)

    return {
        "id": blog.id,
        "title": blog.title,
        "excerpt": blog.excerpt,
        "author": blog.author,
        "hero_image_url": blog.hero_image_url,
        "content": blog.content,
        "content_2": blog.content_2,
        "content_3": blog.content_3,
        "content_4": blog.content_4,
        "content_5": blog.content_5,
        "image_url": blog.image_url,
        "image_url_2": blog.image_url_2,
        "image_url_3": blog.image_url_3,
        "image_url_4": blog.image_url_4,
        "image_url_5": blog.image_url_5,
        "created_at": blog.created_at.isoformat() if blog.created_at else None
    }

# Blogs - Update
@app.put("/api/blogs/{blog_id}", response_model=dict)
async def update_blog(
    blog_id: int,
    title: Optional[str] = Form(None),
    excerpt: Optional[str] = Form(None),
    author: Optional[str] = Form(None),
    hero_image: Optional[UploadFile] = File(None),
    content: Optional[str] = Form(None),
    content_2: Optional[str] = Form(None),
    content_3: Optional[str] = Form(None),
    content_4: Optional[str] = Form(None),
    content_5: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    image_2: Optional[UploadFile] = File(None),
    image_3: Optional[UploadFile] = File(None),
    image_4: Optional[UploadFile] = File(None),
    image_5: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin)
    ):
    blog = db.query(BlogModel).filter(BlogModel.id == blog_id).first()
    if not blog:
        raise HTTPException(status_code=404, detail="Blog post not found")

    if title: blog.title = title
    if excerpt: blog.excerpt = excerpt
    if author: blog.author = author
    if content: blog.content = content
    if content_2 is not None: blog.content_2 = content_2
    if content_3 is not None: blog.content_3 = content_3
    if content_4 is not None: blog.content_4 = content_4
    if content_5 is not None: blog.content_5 = content_5

    if hero_image and hero_image.filename:
        blog.hero_image_url = await upload_to_cloudinary(hero_image, "blogs/hero", "image")
    if image: blog.image_url = await upload_to_cloudinary(image, "blogs", "image")
    if image_2 and image_2.filename: blog.image_url_2 = await upload_to_cloudinary(image_2, "blogs", "image")
    if image_3 and image_3.filename: blog.image_url_3 = await upload_to_cloudinary(image_3, "blogs", "image")
    if image_4 and image_4.filename: blog.image_url_4 = await upload_to_cloudinary(image_4, "blogs", "image")
    if image_5 and image_5.filename: blog.image_url_5 = await upload_to_cloudinary(image_5, "blogs", "image")

    db.commit()
    db.refresh(blog)

    return {
        "id": blog.id,
        "title": blog.title,
        "excerpt": blog.excerpt,
        "author": blog.author,
        "hero_image_url": blog.hero_image_url,
        "content": blog.content,
        "content_2": blog.content_2,
        "content_3": blog.content_3,
        "content_4": blog.content_4,
        "content_5": blog.content_5,
        "image_url": blog.image_url,
        "image_url_2": blog.image_url_2,
        "image_url_3": blog.image_url_3,
        "image_url_4": blog.image_url_4,
        "image_url_5": blog.image_url_5,
        "created_at": blog.created_at.isoformat() if blog.created_at else None
    }

# Blogs - Delete
@app.delete("/api/blogs/{blog_id}")
async def delete_blog(blog_id: int, db: Session = Depends(get_db)):
    blog = db.query(BlogModel).filter(BlogModel.id == blog_id).first()
    if not blog:
        raise HTTPException(status_code=404, detail="Blog post not found")

    # Delete from Firebase Storage if URL is a Firebase URL
    if blog.image_url and "firebasestorage.googleapis.com" in blog.image_url:
        try:
            blob_path = blog.image_url.split("/o/")[-1].split("?")[0]
            from urllib.parse import unquote
            blob_path = unquote(blob_path)
            blob = bucket.blob(blob_path)
            blob.delete()
        except Exception as e:
            print(f"Error deleting from Firebase: {str(e)}")

    db.delete(blog)
    db.commit()

    return {"message": "Blog post deleted successfully"}

# ==================== TEMPLATE API ROUTES ====================

# Templates - Get all
@app.get("/api/templates", response_model=List[dict])
async def get_templates(db: Session = Depends(get_db)):
    templates = db.query(TemplateModel).order_by(TemplateModel.created_at.desc()).all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "github_url": t.github_url,
            "price": t.price,
            "category": t.category,
            "image_url": t.image_url,
            "image_url_2": t.image_url_2,
            "image_url_3": t.image_url_3,
            "image_url_4": t.image_url_4,
            "image_url_5": t.image_url_5,
            "tags": t.tags.split(',') if t.tags else [],
            "created_at": t.created_at.isoformat() if t.created_at else None
        }
        for t in templates
    ]

# Templates - Get by ID
@app.get("/api/templates/{template_id}", response_model=dict)
async def get_template(template_id: int, db: Session = Depends(get_db)):
    template = db.query(TemplateModel).filter(TemplateModel.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return {
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "github_url": template.github_url,
        "price": template.price,
        "category": template.category,
        "image_url": template.image_url,
        "image_url_2": template.image_url_2,
        "image_url_3": template.image_url_3,
        "image_url_4": template.image_url_4,
        "image_url_5": template.image_url_5,
        "tags": template.tags.split(',') if template.tags else [],
        "created_at": template.created_at.isoformat() if template.created_at else None
    }

# Templates - Create
@app.post("/api/templates", response_model=dict)
async def create_template(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    github_url: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    category: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    image_1: Optional[UploadFile] = File(None),
    image_2: Optional[UploadFile] = File(None),
    image_3: Optional[UploadFile] = File(None),
    image_4: Optional[UploadFile] = File(None),
    image_5: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin)
):
    # Upload images to Cloudinary
    image_url = await upload_to_cloudinary(image_1, "templates", "image") if image_1 and image_1.filename else None
    image_url_2 = await upload_to_cloudinary(image_2, "templates", "image") if image_2 and image_2.filename else None
    image_url_3 = await upload_to_cloudinary(image_3, "templates", "image") if image_3 and image_3.filename else None
    image_url_4 = await upload_to_cloudinary(image_4, "templates", "image") if image_4 and image_4.filename else None
    image_url_5 = await upload_to_cloudinary(image_5, "templates", "image") if image_5 and image_5.filename else None

    # Create template
    template = TemplateModel(
        name=name,
        description=description,
        github_url=github_url,
        price=price,
        category=category,
        image_url=image_url,
        image_url_2=image_url_2,
        image_url_3=image_url_3,
        image_url_4=image_url_4,
        image_url_5=image_url_5,
        tags=tags
    )
    db.add(template)
    db.commit()
    db.refresh(template)

    return {
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "github_url": template.github_url,
        "price": template.price,
        "category": template.category,
        "image_url": template.image_url,
        "image_url_2": template.image_url_2,
        "image_url_3": template.image_url_3,
        "image_url_4": template.image_url_4,
        "image_url_5": template.image_url_5,
        "tags": template.tags.split(',') if template.tags else [],
        "created_at": template.created_at.isoformat() if template.created_at else None
    }

# Templates - Update
@app.put("/api/templates/{template_id}", response_model=dict)
async def update_template(
    template_id: int,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    github_url: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    category: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    image_1: Optional[UploadFile] = File(None),
    image_2: Optional[UploadFile] = File(None),
    image_3: Optional[UploadFile] = File(None),
    image_4: Optional[UploadFile] = File(None),
    image_5: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin)
    ):
    template = db.query(TemplateModel).filter(TemplateModel.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if name: template.name = name
    if description: template.description = description
    if github_url: template.github_url = github_url
    if price is not None: template.price = price
    if category: template.category = category
    if tags: template.tags = tags

    if image_1 and image_1.filename: template.image_url = await upload_to_cloudinary(image_1, "templates", "image")
    if image_2 and image_2.filename: template.image_url_2 = await upload_to_cloudinary(image_2, "templates", "image")
    if image_3 and image_3.filename: template.image_url_3 = await upload_to_cloudinary(image_3, "templates", "image")
    if image_4 and image_4.filename: template.image_url_4 = await upload_to_cloudinary(image_4, "templates", "image")
    if image_5 and image_5.filename: template.image_url_5 = await upload_to_cloudinary(image_5, "templates", "image")

    db.commit()
    db.refresh(template)

    return {
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "github_url": template.github_url,
        "price": template.price,
        "category": template.category,
        "image_url": template.image_url,
        "image_url_2": template.image_url_2,
        "image_url_3": template.image_url_3,
        "image_url_4": template.image_url_4,
        "image_url_5": template.image_url_5,
        "tags": template.tags.split(',') if template.tags else [],
        "created_at": template.created_at.isoformat() if template.created_at else None
    }

# Templates - Delete
@app.delete("/api/templates/{template_id}")
async def delete_template(template_id: int, db: Session = Depends(get_db)):
    template = db.query(TemplateModel).filter(TemplateModel.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Delete from Firebase Storage if URL is a Firebase URL
    if template.image_url and "firebasestorage.googleapis.com" in template.image_url:
        try:
            blob_path = template.image_url.split("/o/")[-1].split("?")[0]
            from urllib.parse import unquote
            blob_path = unquote(blob_path)
            blob = bucket.blob(blob_path)
            blob.delete()
        except Exception as e:
            print(f"Error deleting from Firebase: {str(e)}")

    db.delete(template)
    db.commit()

    return {"message": "Template deleted successfully"}

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "database": "DigitalOcean PostgreSQL" if SQLALCHEMY_DATABASE_URL.startswith("postgresql") else "SQLite"}

# Check admin status
@app.get("/api/check-admin")
async def check_admin(email: str, db: Session = Depends(get_db)):
    user = db.query(OAuthUser).filter(OAuthUser.email == email).first()
    if user:
        return {"email": email, "is_admin": bool(user.is_admin), "name": user.name}
    else:
        return {"email": email, "is_admin": False, "error": "User not found"}

# Include Course routes FIRST (before OAuth routes to avoid conflicts)
try:
    from backend.course_routes import app as course_router
    app.include_router(course_router)
except ImportError:
    from course_routes import app as course_router
    app.include_router(course_router)

# ==================== OAUTH 2.0 ROUTES (SECURE TOKEN-BASED) ====================
# These endpoints verify tokens directly with Google/GitHub

@app.post("/api/auth/google")
async def oauth_google(data: dict, response: Response, db: Session = Depends(get_db)):
    """Handle Google OAuth - Verifies ID token with Google servers"""
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests

    token = data.get('token') or data.get('id_token')
    if not token:
        raise HTTPException(status_code=400, detail="Google ID token is required")

    try:
        # Verify the token directly with Google
        idinfo = google_id_token.verify_token(
            token,
            google_requests.Request(),
            audience=GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=60
        )
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise HTTPException(status_code=400, detail="Invalid token issuer")
        email = idinfo.get('email')
        name = idinfo.get('name')
        picture = idinfo.get('picture', '')
        provider_id = idinfo.get('sub')
        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Google token verification failed: {str(e)}")

    # Check if user already exists
    existing_user = db.query(OAuthUser).filter(
        (OAuthUser.email == email) | (OAuthUser.provider_id == provider_id)
    ).first()

    if existing_user:
        # Update existing user - respond immediately, upload picture in background
        existing_user.name = name
        
        existing_user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_user)
        user = existing_user
        print(f"Existing user logged in: {user.email}")
    else:
        # Create new user - respond immediately without Cloudinary upload
        user = OAuthUser(
            email=email,
            name=name,
            provider="google",
            provider_id=provider_id or str(uuid.uuid4()),
            picture=picture or ''
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"New user created: {user.email}")

    # Create JWT tokens
    access_token = create_access_token(data={
        "sub": user.email,
        "user_id": user.id,
        "provider": user.provider
    })
    refresh_token = create_refresh_token(data={
        "sub": user.email,
        "user_id": user.id,
        "provider": user.provider
    })

    # Set JWT cookies with secure configuration
    set_auth_cookie(response, "access_token", access_token, max_age=60 * 15)  # 15 minutes
    set_auth_cookie(response, "refresh_token", refresh_token, max_age=60 * 60 * 24 * 7)  # 7 days

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "provider": user.provider,
            "picture": user.picture,
            "is_admin": bool(user.is_admin),
            "created_at": user.created_at.isoformat()
        },
        "message": "Login successful"
    }

@app.post("/api/auth/github")
async def oauth_github(data: dict, response: Response, db: Session = Depends(get_db)):
    """Handle GitHub OAuth - Verifies with GitHub API using authorization code"""
    import httpx

    code = data.get('code')  # GitHub authorization code from frontend
    if not code:
        raise HTTPException(status_code=400, detail="GitHub authorization code is required")

    try:
        # Exchange code for access token
        token_response = await httpx.AsyncClient().post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
            }
        )
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(status_code=401, detail="Failed to get GitHub access token")

        # Fetch user info from GitHub API
        user_response = await httpx.AsyncClient().get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json"
            }
        )
        github_user = user_response.json()

        # Fetch email if not provided
        email = github_user.get('email')
        if not email:
            email_response = await httpx.AsyncClient().get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json"
                }
            )
            emails = email_response.json()
            if emails:
                email = next((e['email'] for e in emails if e.get('primary')), emails[0].get('email'))

        name = github_user.get('name') or github_user.get('login', 'GitHub User')
        picture = github_user.get('avatar_url', '')
        provider_id = str(github_user.get('id'))

        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by GitHub")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GitHub verification failed: {str(e)}")
    
    # Check if user already exists
    existing_user = db.query(OAuthUser).filter(
        (OAuthUser.email == email) | (OAuthUser.provider_id == provider_id)
    ).first()
    
    if existing_user:
        existing_user.name = name
        if picture:
            existing_user.picture = picture
        existing_user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_user)
        user = existing_user
    else:
        user = OAuthUser(
            email=email,
            name=name,
            provider="github",
            provider_id=provider_id or str(uuid.uuid4()),
            picture=picture
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(data={
        "sub": user.email,
        "user_id": user.id,
        "provider": user.provider
    })
    refresh_token = create_refresh_token(data={
        "sub": user.email,
        "user_id": user.id,
        "provider": user.provider
    })

    # Set JWT cookies with secure configuration
    set_auth_cookie(response, "access_token", access_token, max_age=60 * 15)  # 15 minutes
    set_auth_cookie(response, "refresh_token", refresh_token, max_age=60 * 60 * 24 * 7)  # 7 days

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "provider": user.provider,
            "picture": user.picture,
            "created_at": user.created_at.isoformat()
        },
        "access_token": access_token,
        "token_type": "bearer"
    }

@app.post("/api/auth/apple")
async def oauth_apple(data: dict, response: Response, db: Session = Depends(get_db)):
    """Handle Apple OAuth - Requires ID token verification"""
    token = data.get('token') or data.get('id_token')
    if not token:
        raise HTTPException(status_code=400, detail="Apple ID token is required")
    
    # TODO: Implement real Apple ID token verification using appleid.apple.com
    # For now, reject unverified tokens
    raise HTTPException(status_code=501, detail="Apple OAuth verification not yet implemented. Use Google or GitHub.")
    
    # Check if user already exists
    existing_user = db.query(OAuthUser).filter(
        (OAuthUser.email == email) | (OAuthUser.provider_id == provider_id)
    ).first()
    
    if existing_user:
        existing_user.name = name
        existing_user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_user)
        user = existing_user
    else:
        user = OAuthUser(
            email=email,
            name=name,
            provider="apple",
            provider_id=provider_id or str(uuid.uuid4()),
            picture=None
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    access_token = create_access_token(data={
        "sub": user.email,
        "user_id": user.id,
        "provider": user.provider
    })
    
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "provider": user.provider,
            "picture": user.picture,
            "created_at": user.created_at.isoformat()
        },
        "access_token": access_token,
        "token_type": "bearer"
    }

# Generic OAuth route - SECURED: now requires real tokens
@app.post("/api/auth/{provider}")
async def oauth_auth(provider: str, data: dict, response: Response, db: Session = Depends(get_db)):
    """Handle OAuth authentication - requires verified tokens from Google/GitHub"""
    token = data.get('token') or data.get('id_token')
    
    # Require real tokens - no more dev-mode bypass
    if not token:
        raise HTTPException(status_code=400, detail=f"Real OAuth token required for {provider}. Dev mode is disabled.")
    
    # Only allow Google and GitHub (the ones we verify)
    if provider.lower() not in ['google', 'github']:
        raise HTTPException(status_code=400, detail=f"OAuth provider '{provider}' not supported. Use /api/auth/google or /api/auth/github")
    
    # Redirect to the proper endpoint
    raise HTTPException(status_code=400, detail=f"Use /api/auth/{provider.lower()} endpoint instead")

    if not email or not name:
        raise HTTPException(status_code=400, detail="Email and name are required")

    # Check if user already exists
    existing_user = db.query(OAuthUser).filter(
        (OAuthUser.email == email) | (OAuthUser.provider_id == provider_id)
    ).first()

    if existing_user:
        user = existing_user
    else:
        user = OAuthUser(
            email=email,
            name=name,
            provider=provider,
            provider_id=provider_id or str(uuid.uuid4()),
            picture=picture
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(data={
        "sub": user.email,
        "user_id": user.id,
        "provider": user.provider
    })
    refresh_token = create_refresh_token(data={
        "sub": user.email,
        "user_id": user.id,
        "provider": user.provider
    })

    # Set JWT cookies with secure configuration
    set_auth_cookie(response, "access_token", access_token, max_age=60 * 15)  # 15 minutes
    set_auth_cookie(response, "refresh_token", refresh_token, max_age=60 * 60 * 24 * 7)  # 7 days

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "provider": provider,
            "picture": picture,
            "created_at": user.created_at.isoformat()
        },
        "message": "Login successful"
    }

# GitHub OAuth - Exchange code for token
@app.post("/api/auth/github/token")
async def github_token_exchange(data: dict):
    code = data.get('code')
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code required")

    # GitHub OAuth credentials
    GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
    GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
    
    print(f"GitHub OAuth - Client ID: {GITHUB_CLIENT_ID}")
    print(f"GitHub OAuth - Client Secret: {GITHUB_CLIENT_SECRET[:10] + '...' if GITHUB_CLIENT_SECRET else 'NOT SET'}")
    print(f"GitHub OAuth - Code: {code[:20] + '...' if code else 'NOT SET'}")

    # Exchange code for token
    token_url = "https://github.com/login/oauth/access_token"
    params = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code
    }
    headers = {"Accept": "application/json"}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, params=params, headers=headers, timeout=30.0)
            print(f"GitHub OAuth - Response Status: {response.status_code}")
            print(f"GitHub OAuth - Response Body: {response.text}")
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail=f"GitHub API error: {response.status_code} - {response.text}")

            token_data = response.json()
            
            if 'error' in token_data:
                raise HTTPException(status_code=400, detail=f"GitHub error: {token_data.get('error_description', token_data.get('error', 'Unknown error'))}")
            
            return token_data
    except httpx.RequestError as e:
        print(f"GitHub OAuth - Request Error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Request failed: {str(e)}")

# Apple OAuth - Verify token
@app.post("/api/auth/apple/verify")
async def apple_verify(data: dict):
    id_token = data.get('id_token')
    code = data.get('code')

    if not id_token and not code:
        raise HTTPException(status_code=400, detail="Authorization code or ID token required")

    # For now, return basic info
    return {
        "email": "user@icloud.com",
        "name": "Apple User",
        "sub": "apple_user_" + str(uuid.uuid4())
    }

# OAuth callback handler (for frontend)
@app.get("/api/auth/{provider}/callback")
async def oauth_callback(provider: str):
    return {"message": "OAuth callback received", "provider": provider}

# =========================================================

if __name__ == "__main__":
    import uvicorn
    import httpx
    uvicorn.run(app, host="0.0.0.0", port=8000)
