# NongPlatoo.Ai – ผู้ช่วยท่องเที่ยวสมุทรสงคราม

NongPlatoo.Ai คือผู้ช่วยท่องเที่ยวสำหรับจังหวัดสมุทรสงคราม ประเทศไทย ใช้ GPT-4o เพื่อให้คำแนะนำการท่องเที่ยวและข้อมูลสถานที่ท่องเที่ยวอย่างละเอียด

[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-green.svg)](https://flask.palletsprojects.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-orange.svg)](https://openai.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)

---

## ✨ ฟีเจอร์

- 🤖 **GPT-4o Powered Chat** - แนะนำการท่องเที่ยวอัจฉริยะ
- 🗺️ **Interactive Place Cards** - ข้อมูลสถานที่ท่องเที่ยวแบบละเอียด
- 🌐 **Bilingual Support** - รองรับภาษาไทยและอังกฤษ
- 🎨 **Modern UI** - ดีไซน์ทันสมัยด้วย React + shadcn/ui
- 📱 **Responsive Design** - รองรับการใช้งานบนทุกอุปกรณ์
- 🔥 **Real-time Chat** - ตอบโต้รวดเร็วทันใจ

---

## 📋 สิ่งที่ต้องเตรียม (Prerequisites)

ก่อนเริ่มต้น ตรวจสอบให้แน่ใจว่าคุณได้ติดตั้งสิ่งเหล่านี้แล้ว:

- **Node.js** (v18 หรือสูงกว่า) - [ดาวน์โหลด](https://nodejs.org/)
- **Python** (v3.11 หรือสูงกว่า) - [ดาวน์โหลด](https://www.python.org/)
- **Git** - [ดาวน์โหลด](https://git-scm.com/)
- **OpenAI API Key** - [รับคีย์ได้ที่นี่](https://platform.openai.com/api-keys)

---

## 🚀 การติดตั้ง (Installation)

### 1. โคลนโปรเจค (Clone the Repository)

```bash
git clone https://github.com/TajimeRose/NongPlatoo.Ai.git
cd NongPlatoo.Ai
```

### 2. การตั้งค่า Backend

#### ติดตั้ง Python Dependencies

```bash
# เข้าไปที่โฟลเดอร์ backend
cd backend

# สร้าง virtual environment (แนะนำ)
python -m venv .venv

# เปิดใช้งาน virtual environment
# สำหรับ Windows:
.venv\Scripts\activate
# สำหรับ macOS/Linux:
source .venv/bin/activate

# ติดตั้ง dependencies
pip install -r requirements.txt
```

#### ตั้งค่า Environment Variables

```bash
# คัดลอกไฟล์ตัวอย่าง .env
cp .env.example .env

# แก้ไขไฟล์ .env และใส่ API Key ของคุณ
# จำเป็นต้องใส่:
OPENAI_API_KEY=sk-your-openai-api-key-here

# ทางเลือก (Optional):
FLASK_ENV=development
PORT=5000
```

### 3. การตั้งค่า Frontend

```bash
# เข้าไปที่โฟลเดอร์ frontend
cd ../frontend

# ติดตั้ง dependencies
npm install

# คำสั่งนี้จะติดตั้งแพ็คเกจที่จำเป็นทั้งหมด รวมถึง:
# - React & React Router
# - TypeScript
# - Vite (build tool)
# - shadcn/ui components
# - TailwindCSS
# - และอื่นๆ...
```

---

## 🎮 การใช้งาน (Usage)

### โหมดพัฒนา (Development Mode)

รันทั้ง frontend และ backend พร้อมกัน:

#### Terminal 1 - Backend Server

```bash
# จาก root ของโปรเจค
python app.py

# Server จะเริ่มทำงานที่ http://localhost:5000
```

#### Terminal 2 - Frontend Dev Server

```bash
# จาก root ของโปรเจค
cd frontend
npm run dev

# Frontend จะเริ่มทำงานที่ http://localhost:8080
```

เปิดเบราว์เซอร์แล้วไปที่: **http://localhost:8080**

### การ Build สำหรับ Production

```bash
# Build frontend
cd frontend
npm run build

# ไฟล์ที่ Build เสร็จแล้วจะอยู่ที่ frontend/dist/
# ไฟล์เหล่านี้จะถูกเรียกใช้โดย Flask backend ใน production
```

---

## 🐳 การ Deploy ด้วย Docker

### ใช้ Docker Compose (แนะนำ)

```bash
# Build และ Run
docker-compose up --build

# เข้าใช้งานได้ที่ http://localhost:9000
```

### ใช้ Dockerfile อย่างเดียว

```bash
# Build image
docker build -t nongplatoo-ai .

# Run container
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=your-key-here \
  -e FLASK_ENV=production \
  nongplatoo-ai

# เข้าใช้งานได้ที่ http://localhost:3000
```

---

## 📁 โครงสร้างโปรเจค (Project Structure)

```
NongPlatoo.Ai/
├── frontend/                  # React + TypeScript frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── ui/          # shadcn/ui components
│   │   │   ├── Navbar.tsx
│   │   │   ├── CategoryCard.tsx
│   │   │   └── ...
│   │   ├── pages/           # Page components
│   │   │   ├── Index.tsx    # Home page
│   │   │   ├── Chat.tsx     # Chat interface
│   │   │   └── Places.tsx   # Places listing
│   │   ├── assets/          # Images and static files
│   │   └── lib/             # Utilities
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                   # Flask backend
│   ├── app.py               # Main Flask application
│   ├── chat.py              # Chat logic
│   ├── gpt_service.py       # OpenAI integration
│   ├── db.py                # Database (optional)
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment template
│
├── app.py                    # Root launcher
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.yml       # Docker Compose config
└── README.md               # ไฟล์นี้
```

---

## 🌐 API Endpoints

### ตรวจสอบสถานะ (Health Check)
```bash
GET /health
```

### สนทนากับ AI (Chat with AI)
```bash
POST /api/chat
Content-Type: application/json

{
  "message": "แนะนำที่เที่ยวสมุทรสงคราม",
  "user_id": "user123"
}
```

### ดึงข้อความ (Get Messages)
```bash
POST /api/messages
Content-Type: application/json

{
  "text": "ร้านอาหารอัมพวา"
}
```

**ตัวอย่าง Response:**
```json
{
  "success": true,
  "assistant": {
    "role": "assistant",
    "text": "สมุทรสงครามมีร้านอาหารที่น่าสนใจมากมาย...",
    "structured_data": [
      {
        "place_name": "ตลาดน้ำอัมพวา",
        "category": "market",
        "description": "..."
      }
    ]
  }
}
```

---

## 🔧 การตั้งค่า (Configuration)

### Environment Variables

| ตัวแปร | จำเป็น | ค่าเริ่มต้น | คำอธิบาย |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | ✅ ใช่ | - | OpenAI API key สำหรับ GPT-4o |
| `FLASK_ENV` | ❌ ไม่ | `development` | สภาพแวดล้อม Flask |
| `PORT` | ❌ ไม่ | `5000` | พอร์ตของ Backend server |
| `DATABASE_URL` | ❌ ไม่ | - | การเชื่อมต่อ PostgreSQL (ทางเลือก) |

### การตั้งค่า Frontend

แก้ไข `frontend/vite.config.ts` เพื่อเปลี่ยน:
- Server port (default: 8080)
- API proxy settings
- Build options

---

## 🛠️ เทคโนโลยีที่ใช้ (Technologies)

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **shadcn/ui** - Component library
- **React Router** - Navigation
- **Lucide Icons** - Icons

### Backend
- **Flask** - Web framework
- **Python 3.11** - Programming language
- **OpenAI API** - GPT-4o integration
- **Gunicorn** - Production server
- **SQLAlchemy** - Database ORM (optional)

---

## 🐛 การแก้ไขปัญหาเบื้องต้น (Troubleshooting)

### ปัญหา Frontend

**ปัญหา**: `Cannot find module '@/components/...'`
```bash
# วิธีแก้: ตรวจสอบ path alias ใน tsconfig.json
cd frontend
# ตรวจสอบว่า tsconfig.json มี:
# "paths": { "@/*": ["./src/*"] }
```

**ปัญหา**: `npm install` ล้มเหลว
```bash
# วิธีแก้: ล้าง cache และติดตั้งใหม่
rm -rf node_modules package-lock.json
npm install
```

### ปัญหา Backend

**ปัญหา**: `OPENAI_API_KEY not found`
```bash
# วิธีแก้: ตรวจสอบว่ามีไฟล์ .env และใส่ key แล้ว
cd backend
cat .env  # ควรแสดง OPENAI_API_KEY=sk-...
```

**ปัญหา**: `ModuleNotFoundError`
```bash
# วิธีแก้: ติดตั้ง dependencies ใหม่
pip install -r requirements.txt
```

---

## 📜 สคริปต์ที่มีให้ใช้ (Available Scripts)

### Frontend

```bash

# เมื่อเช็คแก้ไขใน Frontend เรียบร้อย สามารถรันรันสคลิปนี้เเพื่ออัพเดทเข้า Flaaskได้เลย
npm run deploy-flask

npm run dev          # เริ่ม development server
npm run build        # Build สำหรับ production
npm run deploy-flask # เมื่อ npm run build เสร็จรันต่อเมื่ออัพเข้า Flask

npm run build:dev    # Build สำหรับ development
npm run lint         # รัน ESLint
npm run preview      # ดูตัวอย่าง production build
```

### Backend

```bash
python app.py        # เริ่ม Flask server
```

---

## 🚢 การ Deploy

### Deploy ไปยัง Coolify

1. **ตั้งค่า Environment Variables** ใน Coolify Dashboard:
   ```
   OPENAI_API_KEY=sk-xxxxx
   FLASK_ENV=production
   ```

2. **ตั้งค่า Build Settings**:
   - Build Pack: `Dockerfile`
   - Port: Auto-detect (หรือ 3000)

3. **Deploy**: Push ขึ้น Git แล้ว Coolify จะ auto-deploy

### Deploy ไปยัง Railway

```bash
# ติดตั้ง Railway CLI
npm install -g @railway/cli

# Login และ deploy
railway login
railway init
railway up
```

---

## 🤝 การมีส่วนร่วม (Contributing)

1. Fork repository
2. สร้าง feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit การเปลี่ยนแปลง (`git commit -m 'Add some AmazingFeature'`)
4. Push ไปยัง branch (`git push origin feature/AmazingFeature`)
5. เปิด Pull Request

---

## 📄 ลิขสิทธิ์ (License)

โปรเจคนี้อยู่ภายใต้ลิขสิทธิ์ MIT License - ดูรายละเอียดในไฟล์ LICENSE

---

## 👥 ผู้จัดทำ (Authors)

- **TajimeRose** - *ผู้เริ่มโปรเจค* - [GitHub](https://github.com/TajimeRose)

---

## 🙏 กิตติกรรมประกาศ (Acknowledgments)

- OpenAI สำหรับ GPT-4o API
- shadcn สำหรับ UI components สวยๆ
- การท่องเที่ยวจังหวัดสมุทรสงคราม สำหรับข้อมูลท้องถิ่น

---

## 📞 ช่องทางติดต่อ (Support)

- **แจ้งปัญหา**: [GitHub Issues](https://github.com/TajimeRose/NongPlatoo.Ai/issues)
- **ช่วยเหลือเกี่ยวกับ OpenAI**: [OpenAI Help Center](https://help.openai.com/)

---

สร้างด้วย ❤️ เพื่อการท่องเที่ยวจังหวัดสมุทรสงคราม

**น้องปลาทู** (Nong Pla Tu) - เพื่อนเที่ยว AI แสนรู้ของคุณ! 🐟✨
