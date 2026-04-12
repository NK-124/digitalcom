"""
Quick script to set admin status for a user
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Get the backend directory path
backend_dir = Path(__file__).parent
load_dotenv(backend_dir / ".env")

# Database setup
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./store.db")

def set_admin():
    """Set admin status for OAuth users"""
    
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as conn:
        # First, show all users
        result = conn.execute(text("SELECT id, email, name, is_admin FROM oauth_users"))
        users = result.fetchall()
        
        print("\n=== Current OAuth Users ===")
        for user in users:
            print(f"ID: {user[0]}, Email: {user[1]}, Name: {user[2]}, Is Admin: {user[3]}")
        
        # Ask which user to make admin
        print("\nEnter the email of the user to make admin (or press enter to cancel):")
        email = input("> ").strip()
        
        if email:
            # Update is_admin to 1
            conn.execute(text(
                "UPDATE oauth_users SET is_admin = 1 WHERE email = :email"
            ), {"email": email})
            conn.commit()
            print(f"\n✓ User {email} is now an admin!")
        else:
            print("Cancelled.")

if __name__ == "__main__":
    set_admin()
