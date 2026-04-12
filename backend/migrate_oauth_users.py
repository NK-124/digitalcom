"""
Migration script to create oauth_users table
Run this once to add OAuth user support to your database
"""

from sqlalchemy import create_engine, text
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

# Create oauth_users table
with engine.connect() as conn:
    try:
        # Check if table already exists
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'oauth_users'
            )
        """))
        exists = result.scalar()
        
        if exists:
            print("\n✓ oauth_users table already exists!")
        else:
            print("\nCreating oauth_users table...")
            
            if DATABASE_URL.startswith("postgresql"):
                # PostgreSQL
                conn.execute(text("""
                    CREATE TABLE oauth_users (
                        id SERIAL PRIMARY KEY,
                        email VARCHAR UNIQUE NOT NULL,
                        name VARCHAR NOT NULL,
                        provider VARCHAR NOT NULL,
                        provider_id VARCHAR UNIQUE NOT NULL,
                        picture VARCHAR,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
            else:
                # SQLite
                conn.execute(text("""
                    CREATE TABLE oauth_users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        email VARCHAR UNIQUE NOT NULL,
                        name VARCHAR NOT NULL,
                        provider VARCHAR NOT NULL,
                        provider_id VARCHAR UNIQUE NOT NULL,
                        picture VARCHAR,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
            
            conn.commit()
            print("✓ oauth_users table created successfully!")
        
        # Show table structure
        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'oauth_users'
            ORDER BY ordinal_position
        """))
        
        print("\nTable structure:")
        print("-" * 50)
        for row in result:
            nullable = "NULL" if row[2] == "YES" else "NOT NULL"
            print(f"  {row[0]:20} {row[1]:20} {nullable}")
        print("-" * 50)
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        raise

print("\nMigration complete!")
