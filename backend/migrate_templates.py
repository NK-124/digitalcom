import psycopg2
from dotenv import load_dotenv
import os

load_dotenv('.env')

DATABASE_URL = os.getenv('DATABASE_URL')

# Connect to DigitalOcean PostgreSQL
conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

# Add new columns if they don't exist
columns_to_add = [
    ('price', 'FLOAT'),
    ('category', 'VARCHAR'),
    ('image_url_2', 'VARCHAR'),
    ('image_url_3', 'VARCHAR'),
    ('image_url_4', 'VARCHAR'),
    ('image_url_5', 'VARCHAR'),
]

for col_name, col_type in columns_to_add:
    try:
        cursor.execute(f'ALTER TABLE templates ADD COLUMN IF NOT EXISTS {col_name} {col_type};')
        print(f'✓ Added column: {col_name}')
    except Exception as e:
        print(f'✗ Error adding {col_name}: {e}')

conn.commit()
print('\n✓ Migration complete!')
cursor.close()
conn.close()
