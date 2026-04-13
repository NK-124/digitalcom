# Multi-stage build: Build frontend, then serve full-stack with FastAPI
FROM node:22-alpine AS frontend-builder

WORKDIR /app

# Install frontend dependencies
COPY package*.json ./
COPY index.js ./
RUN npm install

# Copy frontend code
COPY src/ ./src/
COPY public/ ./public/
COPY webpack.config.js ./

# Build frontend for production
RUN npm run build

# Production stage: Python + built frontend
FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/dist ./dist/

# Copy ALL public assets into dist (logo, favicon, oauth-callback, etc.)
COPY --from=frontend-builder /app/public/ ./dist/

# Create uploads directory
RUN mkdir -p /app/backend/uploads

# Expose port (DigitalOcean will set PORT env var)
EXPOSE 8000

# Run the backend (which serves both API and frontend)
CMD ["python", "-u", "backend/main.py"]
