"""
Cloudinary utility functions for image and video uploads
"""
import os
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv
from pathlib import Path

# Get the backend directory path
backend_dir = Path(__file__).parent
# Load environment variables from backend/.env
load_dotenv(backend_dir / ".env")

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

# Initialize Cloudinary
def init_cloudinary():
    """Initialize Cloudinary configuration"""
    if not all([CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET]):
        print("Warning: Cloudinary credentials not fully configured. Uploads will fail.")
        return False
    
    try:
        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
            secure=True
        )
        print(f"Cloudinary initialized successfully - Cloud: {CLOUDINARY_CLOUD_NAME}")
        return True
    except Exception as e:
        print(f"Error initializing Cloudinary: {str(e)}")
        return False

# Initialize on module load
CLOUDINARY_ENABLED = init_cloudinary()

async def upload_to_cloudinary(file, folder="gift_cards", resource_type="image"):
    """
    Upload file to Cloudinary
    
    Args:
        file: File-like object or bytes to upload
        folder: Folder path in Cloudinary
        resource_type: Type of resource ('image', 'video', 'raw', 'auto')
    
    Returns:
        dict: Cloudinary upload result with 'url', 'public_id', etc.
    """
    if not CLOUDINARY_ENABLED:
        raise Exception("Cloudinary is not configured")
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            file_content,
            folder=f"digitalcom/{folder}",
            resource_type=resource_type,
            use_filename=True,
            unique_filename=True
        )
        
        return {
            'url': result.get('secure_url'),
            'public_id': result.get('public_id'),
            'format': result.get('format'),
            'resource_type': resource_type
        }
    except Exception as e:
        raise Exception(f"Cloudinary upload failed: {str(e)}")

def delete_from_cloudinary(public_id, resource_type="image"):
    """
    Delete file from Cloudinary
    
    Args:
        public_id: Cloudinary public ID of the file to delete
        resource_type: Type of resource ('image', 'video', 'raw')
    
    Returns:
        dict: Deletion result
    """
    if not CLOUDINARY_ENABLED:
        return {'result': 'skipped', 'reason': 'Cloudinary not configured'}
    
    try:
        result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
        return result
    except Exception as e:
        raise Exception(f"Cloudinary deletion failed: {str(e)}")
