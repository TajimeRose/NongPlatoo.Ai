# Multi-stage Dockerfile for NongPlatoo.Ai
# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source
COPY frontend/ ./

# Build frontend for production
RUN npm run build

# Stage 2: Build Backend with Frontend Static Files
FROM python:3.11-slim

WORKDIR /app

# Copy backend requirements
COPY backend/requirements.txt ./requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/
COPY app.py ./

# Copy built frontend from stage 1 to backend static directory
COPY --from=frontend-builder /app/frontend/dist ./backend/static

# Set environment variables
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Run with gunicorn (production server)
# -w 4: 4 worker processes
# -t 120: 120 seconds timeout
# --access-logfile -: log to stdout
CMD ["gunicorn", "-b", "0.0.0.0:8000", "-w", "4", "-t", "120", "--access-logfile", "-", "app:app"]
