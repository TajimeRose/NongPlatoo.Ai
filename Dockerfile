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
# เนื่องจาก app.py อยู่ที่ Root, Flask จะมองหา static folder ที่ Root เหมือนกัน
# เราจึงวาง Dist จาก Frontend ไว้ที่ ./static
COPY --from=frontend-builder /app/frontend/dist ./static

# 5. Entrypoint & Environment
COPY entrypoint.sh ./
# แก้ปัญหา Line Ending ของ Windows (\r\n) ให้เป็น Linux (\n)
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

ENV PORT=8000
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]