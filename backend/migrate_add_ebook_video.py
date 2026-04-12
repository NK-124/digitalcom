"""
Migration script to add video_url column to ebooks table
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, inspect

# Get the backend directory path
backend_dir = Path(__file__).parent
load_dotenv(backend_dir / ".env")

# Database setup
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./store.db")

def migrate():
    """Add video_url column to ebooks table if it doesn't exist"""
    
    print(f"Using database: {SQLALCHEMY_DATABASE_URL}")
    
    if SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
        # PostgreSQL connection
        from sqlalchemy import create_engine
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        
        with engine.connect() as conn:
            # Check if column exists
            inspector = inspect(engine)
            columns = [col['name'] for col in inspector.get_columns('ebooks')]
            
            if 'video_url' not in columns:
                print("Adding video_url column to ebooks table...")
                conn.execute(text(
                    "ALTER TABLE ebooks ADD COLUMN video_url VARCHAR NULL"
                ))
                conn.commit()
                print("✓ video_url column added successfully!")
            else:
                print("✓ video_url column already exists")
    else:
        # SQLite connection
        from sqlalchemy import create_engine
        engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
        
        with engine.connect() as conn:
            # Check if column exists
            inspector = inspect(engine)
            columns = [col['name'] for col in inspector.get_columns('ebooks')]
            
            if 'video_url' not in columns:
                print("Adding video_url column to ebooks table...")
                conn.execute(text(
                    "ALTER TABLE ebooks ADD COLUMN video_url VARCHAR NULL"
                ))
                conn.commit()
                print("✓ video_url column added successfully!")
            else:
                print("✓ video_url column already exists")

if __name__ == "__main__":
    migrate()
