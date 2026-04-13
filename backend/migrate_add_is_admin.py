"""
Database Migration Script
Adds is_admin column to admin_users table
Run this once to update your DigitalOcean PostgreSQL database
"""

from sqlalchemy import create_engine, text, inspect
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./store.db")

print(f"Connecting to database...")
print(f"URL: {DATABASE_URL[:50]}...")

# Create engine
if DATABASE_URL.startswith("postgresql"):
    engine = create_engine(DATABASE_URL, pool_size=5, max_overflow=10)
else:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Check if is_admin column exists
inspector = inspect(engine)
columns = [col['name'] for col in inspector.get_columns('admin_users')]

print(f"\nCurrent columns in admin_users: {columns}")

if 'is_admin' in columns:
    print("\n✓ is_admin column already exists. No migration needed.")
else:
    print("\nAdding is_admin column...")
    with engine.connect() as conn:
        if DATABASE_URL.startswith("postgresql"):
            # PostgreSQL
            conn.execute(text("ALTER TABLE admin_users ADD COLUMN is_admin INTEGER DEFAULT 0"))
        else:
            # SQLite
            conn.execute(text("ALTER TABLE admin_users ADD COLUMN is_admin INTEGER DEFAULT 0"))
        conn.commit()
    print("✓ is_admin column added successfully!")

# Verify
columns = [col['name'] for col in inspector.get_columns('admin_users')]
print(f"\nFinal columns in admin_users: {columns}")
print("\nMigration complete!")
