"""
Migration script to add multiple content and image columns to blogs table
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
    """Add multiple content and image columns to blogs table"""
    
    print(f"Using database: {SQLALCHEMY_DATABASE_URL}")
    
    if SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
        # PostgreSQL connection
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        
        with engine.connect() as conn:
            print("\n=== Blogs Table ===")
            inspector = inspect(engine)
            columns = [col['name'] for col in inspector.get_columns('blogs')]
            
            # Add content columns (Paragraphs 2-5)
            for i in range(2, 6):
                col_name = f'content_{i}'
                if col_name not in columns:
                    print(f"Adding {col_name} column to blogs table...")
                    conn.execute(text(f"ALTER TABLE blogs ADD COLUMN {col_name} TEXT NULL"))
                else:
                    print(f"✓ {col_name} column already exists")
            
            # Add image columns (Images 2-5)
            for i in range(2, 6):
                col_name = f'image_url_{i}'
                if col_name not in columns:
                    print(f"Adding {col_name} column to blogs table...")
                    conn.execute(text(f"ALTER TABLE blogs ADD COLUMN {col_name} VARCHAR NULL"))
                else:
                    print(f"✓ {col_name} column already exists")
            
            conn.commit()
            print("\n✓ Migration completed successfully!")
    else:
        print("Note: SQLite detected. Recreating tables in main.py will handle this.")

if __name__ == "__main__":
    migrate()
