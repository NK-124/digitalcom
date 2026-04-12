import psycopg2
from dotenv import load_dotenv
import os

load_dotenv('.env')

DATABASE_URL = os.getenv('DATABASE_URL')

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

try:
    cursor.execute('ALTER TABLE blogs ADD COLUMN IF NOT EXISTS hero_image_url VARCHAR;')
    conn.commit()
    print('✓ Added hero_image_url column to blogs table')
except Exception as e:
    print(f'Error: {e}')
finally:
    cursor.close()
    conn.close()
