"""
Migration script to add missing columns to the blogs table.
Run this once to update your existing DigitalOcean PostgreSQL database schema.
"""
from sqlalchemy import create_engine, text
from pathlib import Path
from dotenv import load_dotenv
import os

# Load environment variables
backend_dir = Path(__file__).parent
load_dotenv(backend_dir / ".env")

# Get database URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./store.db")

print(f"Connecting to database...")

# Create engine
if DATABASE_URL.startswith("postgresql"):
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
else:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# SQL commands to add missing columns
migration_sql = """
-- Add missing paragraph columns
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS content_2 TEXT;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS content_3 TEXT;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS content_4 TEXT;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS content_5 TEXT;

-- Add missing image URL columns
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS image_url_2 VARCHAR;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS image_url_3 VARCHAR;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS image_url_4 VARCHAR;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS image_url_5 VARCHAR;
"""

print("Running migration...")

try:
    with engine.connect() as conn:
        # For PostgreSQL, we need to execute each statement separately
        statements = [stmt.strip() for stmt in migration_sql.split(';') if stmt.strip()]
        
        for stmt in statements:
            if stmt:
                print(f"Executing: {stmt}")
                conn.execute(text(stmt))
        
        conn.commit()
        print("\n✅ Migration completed successfully!")
        print("Added columns:")
        print("  - content_2, content_3, content_4, content_5")
        print("  - image_url_2, image_url_3, image_url_4, image_url_5")
        
except Exception as e:
    print(f"\n❌ Migration failed: {str(e)}")
    print("\nIf columns already exist, this is normal. You can safely ignore this error.")
