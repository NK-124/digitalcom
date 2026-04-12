# Cloudinary Setup Guide for Gift Card Admin

This guide explains how to configure Cloudinary for image and video uploads in the gift card admin section.

## Overview

The application now supports uploading both images and videos to Cloudinary when creating or editing gift cards. Cloudinary provides:
- Fast, CDN-backed delivery
- Automatic image optimization
- Video transcoding and streaming
- Transformations on-the-fly

## Step 1: Create a Cloudinary Account

1. Go to [https://cloudinary.com](https://cloudinary.com)
2. Click "Sign Up Free"
3. Complete the registration process
4. Verify your email address

## Step 2: Get Your Cloudinary Credentials

1. Log in to your Cloudinary dashboard
2. You'll see your credentials on the main page:
   - **Cloud Name** (e.g., `dxxxxx`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnop`) - Click "Reveal" to see it

## Step 3: Configure Your Environment

1. Navigate to the `backend` folder in your project
2. Open the `.env` file (or create it if it doesn't exist)
3. Add your Cloudinary credentials:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Replace the placeholder values with your actual credentials from Cloudinary.

## Step 4: Run the Migration (if needed)

If you're adding video support to an existing database, run the migration:

```bash
cd backend
python migrate_add_video_url.py
```

This adds the `video_url` column to the `gift_cards` table.

## Step 5: Start the Backend Server

```bash
cd backend
python main.py
```

You should see a message like:
```
Cloudinary initialized successfully - Cloud: your-cloud-name
```

## Using Cloudinary Uploads

### In the Admin Interface

1. Log in as an admin
2. Navigate to the Gift Cards page
3. Click "+ Add Gift Card"
4. Fill in the name and price
5. Click "Choose from Gallery" under **Upload Image** to select an image
6. (Optional) Click "Choose from Gallery" under **Upload Video** to select a video
7. Click "Create" to save

### Supported File Types

**Images:**
- JPG/JPEG
- PNG
- GIF
- WebP
- SVG

**Videos:**
- MP4
- MOV
- AVI
- WebM
- FLV

### File Size Limits

- Free tier: 10MB per image, 100MB per video
- Paid tiers: Higher limits available

## How It Works

### Backend Flow

1. Admin uploads image/video through the admin form
2. Frontend sends the files as `FormData` to the backend
3. Backend uploads files to Cloudinary using the Cloudinary API
4. Cloudinary returns URLs for the uploaded files
5. Backend stores these URLs in the database
6. Frontend displays the images/videos using Cloudinary URLs

### Cloudinary URL Structure

Images: `https://res.cloudinary.com/{cloud-name}/image/upload/v1234567890/digitalcom/gift_cards/{filename}.jpg`

Videos: `https://res.cloudinary.com/{cloud-name}/video/upload/v1234567890/digitalcom/gift_cards/{filename}.mp4`

## Advanced Features (Optional)

### Image Transformations

You can transform images on-the-fly by modifying the URL:

- **Resize**: Add `/w_300/h_200/` to resize to 300x200
- **Crop**: Add `/c_fill/` for center crop
- **Quality**: Add `/q_auto/` for automatic quality optimization

Example: 
```
https://res.cloudinary.com/demo/image/upload/w_300,h_200,c_fill,q_auto/digitalcom/gift_cards/image.jpg
```

### Video Transformations

- **Change quality**: Add `/q_auto/` 
- **Change format**: Change `.mp4` to `.webm`
- **Thumbnail**: Add `/so_0/thumbnail.jpg` to get a thumbnail at 0 seconds

### Responsive Images

Use Cloudinary's responsive breakpoints for automatic srcset generation:
[https://cloudinary.com/documentation/responsive_images](https://cloudinary.com/documentation/responsive_images)

## Troubleshooting

### "Cloudinary is not configured" Error

**Cause**: Missing or incorrect credentials in `.env`

**Solution**: 
1. Check that all three credentials are set in `.env`
2. Ensure there are no extra spaces or quotes
3. Restart the backend server

### Upload Fails with 401 Error

**Cause**: Invalid API key or secret

**Solution**:
1. Verify credentials in Cloudinary dashboard
2. Check for typos in `.env`
3. Regenerate API keys if needed

### Large File Upload Timeout

**Cause**: File size exceeds limits or slow connection

**Solution**:
1. Compress images before upload
2. Use shorter videos
3. Consider upgrading Cloudinary plan

### Video Not Playing

**Cause**: Browser doesn't support video format

**Solution**:
1. Use MP4 format for best compatibility
2. Cloudinary automatically transcodes, but check browser support
3. Add fallback formats (WebM)

## Security Best Practices

1. **Never commit `.env` to version control** - Add it to `.gitignore`
2. **Use environment variables in production** - Don't hardcode credentials
3. **Rotate API keys periodically** - Use Cloudinary dashboard
4. **Set up upload presets** - For client-side uploads (advanced)

## Pricing

Cloudinary offers a generous free tier:
- 25GB storage
- 25GB bandwidth/month
- Unlimited transformations

Paid plans start at $89/month for higher usage.

## Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Cloudinary API Reference](https://cloudinary.com/documentation/image_upload_api_reference)
- [Cloudinary SDK for Python](https://cloudinary.com/documentation/python_integration)
- [Upload Widget](https://cloudinary.com/documentation/upload_widget) (for advanced UI)

## Support

For issues or questions:
1. Check Cloudinary's documentation first
2. Review error logs in the backend console
3. Contact Cloudinary support for platform-specific issues
