import psycopg2
from dotenv import load_dotenv
import os

load_dotenv('.env')

DATABASE_URL = os.getenv('DATABASE_URL')

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

try:
    cursor.execute('ALTER TABLE orders ADD COLUMN IF NOT EXISTS zip_url VARCHAR;')
    conn.commit()
    print('✓ Added column: zip_url')
except Exception as e:
    print(f'✗ Error adding zip_url: {e}')
    conn.rollback()

cursor.close()
conn.close()
print('\n✓ ZIP migration complete!')
