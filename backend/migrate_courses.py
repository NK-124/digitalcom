import psycopg2
from dotenv import load_dotenv
import os

load_dotenv('.env')

DATABASE_URL = os.getenv('DATABASE_URL')

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

columns_to_add = [
    ('title', 'VARCHAR'),
    ('price', 'FLOAT'),
    ('image_url', 'VARCHAR'),
]

for col_name, col_type in columns_to_add:
    try:
        cursor.execute(f'ALTER TABLE courses ADD COLUMN IF NOT EXISTS {col_name} {col_type};')
        conn.commit()
        print(f'✓ Added column: {col_name}')
    except Exception as e:
        print(f'✗ Error adding {col_name}: {e}')
        conn.rollback()

cursor.close()
conn.close()
print('\n✓ Courses migration complete!')
