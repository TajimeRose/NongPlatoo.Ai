# NongPlatoo.Ai – Samut Songkhram Travel Assistant

NongPlatoo.Ai is a travel assistant for Samut Songkhram Province, Thailand. It uses GPT-4o to provide intelligent travel recommendations and detailed information about attractions.    

[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-green.svg)](https://flask.palletsprojects.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-orange.svg)](https://openai.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)

---

## ✨ Features

- 🤖 **GPT-4o Powered Chat** - Intelligent travel recommendations
- 🗺️ **Interactive Place Cards** - Detailed information about attractions
- 🌐 **Bilingual Support** - Thai and English
- 🎨 **Modern UI** - Built with React + shadcn/ui
- 📱 **Responsive Design** - Works on all devices
- 🔥 **Real-time Chat** - Instant AI responses

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Python** (v3.11 or higher) - [Download](https://www.python.org/)
- **Git** - [Download](https://git-scm.com/)
- **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/TajimeRose/NongPlatoo.Ai.git
cd NongPlatoo.Ai
```

### 2. Backend Setup

#### Install Python Dependencies

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env file and add your API keys
# Required:
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional:
FLASK_ENV=development
PORT=5000
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# This will install all required packages including:
# - React & React Router
# - TypeScript
# - Vite (build tool)
# - shadcn/ui components
# - TailwindCSS
# - and more...
```

---

## 🎮 Usage

### Development Mode

Run both frontend and backend simultaneously:

#### Terminal 1 - Backend Server

```bash
# From project root
python app.py

# Server will start at http://localhost:5000
```

#### Terminal 2 - Frontend Dev Server

```bash
# From project root
cd frontend
npm run dev

# Frontend will start at http://localhost:8080
```

Now open your browser and visit: **http://localhost:8080**

### Production Build

```bash
# Build frontend
cd frontend
npm run build

# The built files will be in frontend/dist/
# These will be served by the Flask backend in production
```

---

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and run
docker-compose up --build

# Access at http://localhost:9000
```

### Using Dockerfile Only

```bash
# Build image
docker build -t nongplatoo-ai .

# Run container
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=your-key-here \
  -e FLASK_ENV=production \
  nongplatoo-ai

# Access at http://localhost:3000
```

---

## 📁 Project Structure

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
└── README.md               # This file
```

---

## 🌐 API Endpoints

### Health Check
```bash
GET /health
```

### Chat with AI
```bash
POST /api/chat
Content-Type: application/json

{
  "message": "แนะนำที่เที่ยวสมุทรสงคราม",
  "user_id": "user123"
}
```

### Get Messages
```bash
POST /api/messages
Content-Type: application/json

{
  "text": "ร้านอาหารอัมพวา"
}
```

**Example Response:**
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

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | ✅ Yes | - | OpenAI API key for GPT-4o |
| `FLASK_ENV` | ❌ No | `development` | Flask environment |
| `PORT` | ❌ No | `5000` | Backend server port |
| `DATABASE_URL` | ❌ No | - | PostgreSQL connection (optional) |

### Frontend Configuration

Edit `frontend/vite.config.ts` to change:
- Server port (default: 8080)
- API proxy settings
- Build options

---

## 🛠️ Technologies

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

## 🐛 Troubleshooting

### Frontend Issues

**Problem**: `Cannot find module '@/components/...'`
```bash
# Solution: Check tsconfig.json path alias
cd frontend
# Ensure tsconfig.json has:
# "paths": { "@/*": ["./src/*"] }
```

**Problem**: `npm install` fails
```bash
# Solution: Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Backend Issues

**Problem**: `OPENAI_API_KEY not found`
```bash
# Solution: Check .env file exists and has the key
cd backend
cat .env  # Should show OPENAI_API_KEY=sk-...
```

**Problem**: `ModuleNotFoundError`
```bash
# Solution: Reinstall dependencies
pip install -r requirements.txt
```

---

## � Available Scripts

### Frontend

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run build:dev    # Build for development
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Backend

```bash
python app.py        # Start Flask server
```

---

## 🚢 Deployment

### Deploy to Coolify

1. **Set Environment Variables** in Coolify Dashboard:
   ```
   OPENAI_API_KEY=sk-xxxxx
   FLASK_ENV=production
   ```

2. **Configure Build Settings**:
   - Build Pack: `Dockerfile`
   - Port: Auto-detect (or 3000)

3. **Deploy**: Push to Git and Coolify will auto-deploy

### Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## � License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👥 Authors

- **TajimeRose** - *Initial work* - [GitHub](https://github.com/TajimeRose)

---

## 🙏 Acknowledgments

- OpenAI for GPT-4o API
- shadcn for the amazing UI components
- Samut Songkhram Tourism Authority for local knowledge

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/TajimeRose/NongPlatoo.Ai/issues)
- **OpenAI Help**: [OpenAI Help Center](https://help.openai.com/)

---

Built with ❤️ for Samut Songkhram Province Tourism

**น้องปลาทู** (Nong Pla Tu) - Your friendly AI travel guide! 🐟✨
