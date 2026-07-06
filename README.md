# NongPlatoo.Ai – ผู้ช่วยท่องเที่ยวสมุทรสงคราม

NongPlatoo.Ai คือผู้ช่วยท่องเที่ยวอัจฉริยะสำหรับจังหวัดสมุทรสงคราม ใช้ GPT-4o แนะนำสถานที่ ร้านอาหาร กิจกรรม พร้อมระบบสนทนาแบบ streaming, แผนที่, เสียงพูด และอื่นๆ

[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-green.svg)](https://flask.palletsprojects.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-orange.svg)](https://openai.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)

---

## ฟีเจอร์หลัก

- **GPT-4o Streaming Chat** – สนทนาแบบ real-time พร้อมบุคลิก "น้องปลาทู"
- **ค้นหาสถานที่อัจฉริยะ** – Hybrid search ผสม semantic matching (sentence-transformers) + PostgreSQL + pgvector
- **แผนที่** – แสดงตำแหน่งสถานที่ด้วย Leaflet
- **เสียงพูด (TTS/STT)** – Text-to-Speech (Edge TTS / gTTS / OpenAI) และ Speech-to-Text (Whisper)
- **รองรับ 2 ภาษา** – ไทย และ อังกฤษ
- **Responsive UI** – React + shadcn/ui + TailwindCSS ใช้งานได้ทุกอุปกรณ์
- **Firebase Auth** – ระบบยืนยันตัวตนผู้ใช้
- **Google Maps Fallback** – ดึงข้อมูลเพิ่มจาก Google Maps Places API เมื่อไม่พบในฐานข้อมูล

---

## สิ่งที่ต้องเตรียม

- **Node.js** v18+ – [ดาวน์โหลด](https://nodejs.org/)
- **Python** v3.11+ – [ดาวน์โหลด](https://www.python.org/)
- **Git** – [ดาวน์โหลด](https://git-scm.com/)
- **OpenAI API Key** – [รับคีย์](https://platform.openai.com/api-keys)
- **PostgreSQL** (production) หรือ SQLite (development)

---

## การติดตั้ง

### 1. โคลนโปรเจค

```bash
git clone https://github.com/TajimeRose/NongPlatoo.Ai.git
cd NongPlatoo.Ai
```

### 2. ตั้งค่า Backend

```bash
cd backend

python -m venv .venv

# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

ตั้งค่า environment variables:

```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env`:

```env
OPENAI_API_KEY=sk-your-key-here
FLASK_ENV=development
PORT=5000
DATABASE_URL=sqlite:///app.db
```

### 3. ตั้งค่า Frontend

```bash
cd ../frontend
npm install
```

---

## การใช้งาน

### Development Mode

ต้องเปิด 2 terminal พร้อมกัน:

**Terminal 1 – Backend** (จาก root ของโปรเจค)

```bash
python app.py
# Server ทำงานที่ http://localhost:8000
```

**Terminal 2 – Frontend**

```bash
cd frontend
npm run dev
# Frontend ทำงานที่ http://localhost:8080
# API requests จะ proxy ไปยัง http://localhost:8000
```

เปิดเบราว์เซอร์ไปที่ **http://localhost:8080**

### Build สำหรับ Production

```bash
cd frontend
npm run build
# ไฟล์ output จะถูกสร้างที่ backend/static/ เพื่อให้ Flask serve โดยตรง
```

หรือใช้คำสั่งรวม:

```bash
npm run deploy-flask
```

---

## Deploy ด้วย Docker

### Docker Compose (แนะนำ)

จะสร้างทั้ง web app + PostgreSQL:

```bash
docker-compose up --build
# เข้าใช้งานที่ http://localhost:8000
```

### Dockerfile อย่างเดียว

```bash
docker build -t nongplatoo-ai .

docker run -p 9000:8000 \
  -e OPENAI_API_KEY=your-key-here \
  -e FLASK_ENV=production \
  -e PORT=8000 \
  nongplatoo-ai

# เข้าใช้งานที่ http://localhost:9000
```

---

## โครงสร้างโปรเจค

```
NongPlatoo.Ai/
├── app.py                        # Flask application หลัก (entry point)
├── Dockerfile                    # Multi-stage build
├── docker-compose.yml            # Web + PostgreSQL
├── entrypoint.sh                 # Gunicorn startup script
│
├── frontend/                     # React + TypeScript
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Index.tsx         # หน้าแรก
│   │   │   ├── Chat.tsx          # หน้าแชท AI
│   │   │   ├── Places.tsx        # รายการสถานที่
│   │   │   ├── PlaceDetail.tsx   # รายละเอียดสถานที่
│   │   │   ├── News.tsx          # ข่าวสาร
│   │   │   └── Auth.tsx          # เข้าสู่ระบบ
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui components
│   │   │   ├── VoiceAIInterface.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── PlaceCard.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── ...
│   │   └── lib/
│   ├── package.json
│   └── vite.config.ts
│
└── backend/
    ├── chat.py                   # TravelChatbot – logic หลัก
    ├── gpt_service.py            # GPTService – OpenAI integration
    ├── db.py                     # SQLAlchemy models (Place, ChatLog, Feedback)
    ├── simple_matcher.py         # Semantic matching (sentence-transformers)
    ├── semantic_search.py        # Semantic search + embeddings
    ├── conversation_memory.py    # จัดการประวัติสนทนา
    ├── text_utils.py             # ตรวจจับภาษา, normalize text
    ├── extensions.py             # Flask extensions init
    ├── services/                 # Business logic services
    │   ├── tts_service.py        # Text-to-Speech
    │   ├── vad_service.py        # Voice Activity Detection
    │   └── ...
    ├── api/                      # API blueprints
    ├── routes/                   # Route blueprints
    ├── models/                   # ORM models
    ├── configs/                  # Prompt configs (YAML)
    ├── Data/                     # ข้อมูลสถานที่
    ├── requirements.txt
    └── .env.example
```

---

## API Endpoints หลัก

### ทั่วไป

| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/health` | ตรวจสอบสถานะ server |
| GET/POST | `/api/visits` | นับจำนวนผู้เข้าชม |

### แชท

| Method | Path | คำอธิบาย |
|--------|------|----------|
| POST | `/api/messages/stream` | **สนทนาแบบ streaming (SSE)** – endpoint หลัก |
| POST | `/api/chat` | สนทนาแบบ streaming |
| POST | `/api/chat/sync` | สนทนาแบบไม่ streaming |
| POST | `/api/messages` | ส่งข้อความ (ไม่ streaming) |
| GET | `/api/messages` | ดึงประวัติสนทนา |
| POST | `/api/messages/clear` | ล้างประวัติสนทนา |
| GET | `/api/memory/stats` | สถิติ conversation memory |

### สถานที่

| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/places` | ดึงสถานที่ทั้งหมด |
| GET | `/api/places/<id>` | ดึงสถานที่ตาม ID |
| GET | `/api/filters/districts` | รายชื่ออำเภอ |
| GET | `/api/filters/categories` | รายชื่อหมวดหมู่ |

### เสียง

| Method | Path | คำอธิบาย |
|--------|------|----------|
| POST | `/api/tts` | Text-to-Speech (Edge TTS) |
| POST | `/api/text-to-speech` | TTS (gTTS / Google Cloud / OpenAI) |
| POST | `/api/speech-to-text` | Speech-to-Text (Whisper) |
| POST | `/api/vad/detect` | Voice Activity Detection |

### อื่นๆ

| Method | Path | คำอธิบาย |
|--------|------|----------|
| POST | `/api/feedback` | ส่ง feedback |
| GET | `/api/feedback/stats` | สถิติ feedback |
| GET | `/api/image-proxy` | Proxy รูปจาก Google Maps |

---

## Environment Variables

| ตัวแปร | จำเป็น | ค่าเริ่มต้น | คำอธิบาย |
|--------|--------|------------|----------|
| `OPENAI_API_KEY` | [x] ใช่ | - | OpenAI API key |
| `FLASK_ENV` | [ ] ไม่ | `development` | `development` หรือ `production` |
| `PORT` | [ ] ไม่ | `5000` (dev) / `8000` (prod) | พอร์ต server |
| `DATABASE_URL` | [ ] ไม่ | `sqlite:///app.db` | Connection string (PostgreSQL ใน production) |
| `GOOGLE_MAPS_API_KEY` | [ ] ไม่ | - | สำหรับ Google Maps Places API fallback |
| `SECRET_KEY` | [ ] ไม่ | - | Flask secret key (JWT) |

ดูตัวอย่างเต็มที่ `backend/.env.example` (dev) และ `.env.production.example` (prod)

---

## เทคโนโลยีที่ใช้

### Frontend

| เทคโนโลยี | หน้าที่ |
|-----------|--------|
| React 18 + TypeScript | UI framework |
| Vite + SWC | Build tool |
| TailwindCSS + shadcn/ui | Styling + Components |
| React Router 6 | Navigation |
| TanStack React Query | Data fetching + caching |
| Leaflet + React-Leaflet | แผนที่ |
| Firebase | Authentication |
| Recharts | กราฟ/แผนภูมิ |
| Lucide Icons | ไอคอน |

### Backend

| เทคโนโลยี | หน้าที่ |
|-----------|--------|
| Flask + Gunicorn | Web framework + Production server |
| OpenAI API (GPT-4o) | AI chat |
| SQLAlchemy + PostgreSQL | ฐานข้อมูล |
| pgvector | Vector search |
| sentence-transformers | Semantic matching |
| Edge TTS / gTTS / OpenAI TTS | Text-to-Speech |
| OpenAI Whisper | Speech-to-Text |
| Google Maps API | ค้นหาสถานที่เพิ่มเติม |

---

## Scripts

### Frontend

```bash
npm run dev            # เริ่ม dev server (localhost:8080)
npm run build          # Build production -> backend/static/
npm run deploy-flask   # Build + deploy เข้า Flask
npm run build:dev      # Build แบบ development
npm run lint           # ESLint
npm run preview        # Preview production build
```

### Backend

```bash
python app.py          # เริ่ม Flask server (localhost:8000)
```

---

## แก้ไขปัญหาเบื้องต้น

**`Cannot find module '@/components/...'`**
ตรวจสอบว่า `frontend/tsconfig.json` มี `"paths": { "@/*": ["./src/*"] }`

**`npm install` ล้มเหลว**
```bash
rm -rf node_modules package-lock.json && npm install
```

**`OPENAI_API_KEY not found`**
ตรวจสอบว่า `backend/.env` มี `OPENAI_API_KEY=sk-...`

**`ModuleNotFoundError`**
```bash
pip install -r requirements.txt
```

---

## Deploy

### Coolify

1. ตั้งค่า Environment Variables ใน Dashboard:
   ```
   OPENAI_API_KEY=sk-xxxxx
   FLASK_ENV=production
   PORT=8000
   DATABASE_URL=postgresql+psycopg2://<user>:<password>@<host>:5432/<db>
   ```

2. ตั้งค่า Build:
   - Build Pack: `Dockerfile`
   - Service Port: `8000`
   - Health Check Path: `/health`

3. Push ขึ้น Git แล้ว Coolify จะ auto-deploy

### Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

---

## การมีส่วนร่วม

1. Fork repository
2. สร้าง feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add some AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. เปิด Pull Request

---

## ลิขสิทธิ์

MIT License – ดูรายละเอียดในไฟล์ LICENSE

---

## ผู้จัดทำ

- **TajimeRose** – [GitHub](https://github.com/TajimeRose)
- **Blackoctopus1112** – [GitHub](https://github.com/Blackoctopus1112)

---

## กิตติกรรมประกาศ

- OpenAI สำหรับ GPT-4o API
- shadcn สำหรับ UI components
- การท่องเที่ยวจังหวัดสมุทรสงคราม สำหรับข้อมูลท้องถิ่น

---

## ช่องทางติดต่อ

- **แจ้งปัญหา**: [GitHub Issues](https://github.com/TajimeRose/NongPlatoo.Ai/issues)
- **ช่วยเหลือเกี่ยวกับ OpenAI**: [OpenAI Help Center](https://help.openai.com/)
