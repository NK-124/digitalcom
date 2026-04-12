"""
Migration script to add multiple image and video columns to gift_cards and ebooks tables
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
    """Add multiple image and video columns to gift_cards and ebooks tables"""
    
    print(f"Using database: {SQLALCHEMY_DATABASE_URL}")
    
    if SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
        # PostgreSQL connection
        from sqlalchemy import create_engine
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        
        with engine.connect() as conn:
            # Gift Cards table
            print("\n=== Gift Cards Table ===")
            inspector = inspect(engine)
            columns = [col['name'] for col in inspector.get_columns('gift_cards')]
            
            # Add image columns
            for i in range(2, 6):
                col_name = f'image_url_{i}'
                if col_name not in columns:
                    print(f"Adding {col_name} column to gift_cards table...")
                    conn.execute(text(f"ALTER TABLE gift_cards ADD COLUMN {col_name} VARCHAR NULL"))
                else:
                    print(f"✓ {col_name} column already exists")
            
            # Add video columns
            for i in range(2, 6):
                col_name = f'video_url_{i}'
                if col_name not in columns:
                    print(f"Adding {col_name} column to gift_cards table...")
                    conn.execute(text(f"ALTER TABLE gift_cards ADD COLUMN {col_name} VARCHAR NULL"))
                else:
                    print(f"✓ {col_name} column already exists")
            
            conn.commit()
            
            # Ebooks table
            print("\n=== Ebooks Table ===")
            inspector = inspect(engine)
            columns = [col['name'] for col in inspector.get_columns('ebooks')]
            
            # Add image columns
            for i in range(2, 6):
                col_name = f'image_url_{i}'
                if col_name not in columns:
                    print(f"Adding {col_name} column to ebooks table...")
                    conn.execute(text(f"ALTER TABLE ebooks ADD COLUMN {col_name} VARCHAR NULL"))
                else:
                    print(f"✓ {col_name} column already exists")
            
            # Add video columns
            for i in range(2, 6):
                col_name = f'video_url_{i}'
                if col_name not in columns:
                    print(f"Adding {col_name} column to ebooks table...")
                    conn.execute(text(f"ALTER TABLE ebooks ADD COLUMN {col_name} VARCHAR NULL"))
                else:
                    print(f"✓ {col_name} column already exists")
            
            conn.commit()
            print("\n✓ Migration completed successfully!")
    else:
        # SQLite connection
        from sqlalchemy import create_engine
        engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
        
        with engine.connect() as conn:
            # SQLite doesn't support ALTER TABLE ADD COLUMN easily
            # For SQLite, we'll need to recreate the table
            print("Note: SQLite detected. Additional columns will be created when table is recreated.")
            print("For full support, consider using PostgreSQL.")

if __name__ == "__main__":
    migrate()
