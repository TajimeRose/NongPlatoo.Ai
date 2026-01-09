# Stage 1: Build Frontend (เหมือนเดิม)
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

# --- Stage 2: Build Backend ---
FROM python:3.11-slim

WORKDIR /app

<<<<<<< HEAD
=======
# Install runtime tools required for healthchecks
# Coolify's container healthcheck uses curl/wget inside the container.
# python:3.11-slim does not include them by default, so we add curl.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl wget ca-certificates \
    && rm -rf /var/lib/apt/lists/*

>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
# 1. จัดการ Dependencies
# สังเกต: requirements.txt อยู่ในโฟลเดอร์ backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 2. Copy ไฟล์หลัก
# app.py อยู่ข้างนอกสุด (Root)
COPY app.py ./

# 3. Copy โฟลเดอร์ Backend ทั้งหมด (Chat logic, Configs, etc.)
# เอาไปวางไว้ในชื่อโฟลเดอร์เดิม เพื่อให้ import backend.xxx ทำงานได้
COPY backend/ ./backend/

# 4. Copy Frontend ที่ Build เสร็จแล้ว
# Build จาก Stage 1 ถูกส่งไปที่ /app/backend/static (ดู vite.config.ts)
COPY --from=frontend-builder /app/backend/static ./backend/static

# 5. Entrypoint & Environment
COPY entrypoint.sh ./
# แก้ปัญหา Line Ending ของ Windows (\r\n) ให้เป็น Linux (\n)
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

ENV PORT=8000
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
