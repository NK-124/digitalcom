import os
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy import create_engine, text

db_url = os.getenv('DATABASE_URL')
print(f'DB URL: {db_url[:60]}...')

try:
    engine = create_engine(db_url)
    with engine.begin() as conn:
        conn.execute(text('ALTER TABLE oauth_users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE'))
        print('Added email_verified')
        conn.execute(text('ALTER TABLE oauth_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()'))
        print('Added created_at')
        conn.execute(text('ALTER TABLE oauth_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()'))
        print('Added updated_at')
        
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'oauth_users' ORDER BY ordinal_position"))
        cols = [r[0] for r in result.fetchall()]
        print(f'Final columns: {", ".join(cols)}')
except Exception as e:
    print(f'ERROR: {e}')
