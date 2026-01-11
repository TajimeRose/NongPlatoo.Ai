# Environment Security & Compatibility Guide

## Overview
Your project's environment security has been updated to use placeholder credentials in `backend/.env` while maintaining full functionality on both localhost and production.

---

## ✅ Security Status

- **Real credentials**: Replaced with placeholders
- **Gitignore**: Properly configured to ignore all `.env` files
- **Code**: No hardcoded API keys or credentials
- **Safe to commit**: Yes, the repository contains no sensitive data

---

## 🏠 Running on Localhost

### Setup Steps:
1. Clone the repository (includes `backend/.env` with placeholders)
2. Get your real credentials:
   - OpenAI API Key
   - Database connection details
3. Update `backend/.env`:
   ```bash
   OPENAI_API_KEY=sk-your-real-key-here
   DATABASE_URL=postgresql://user:password@localhost:5432/yourdb
   ```
4. Run the application:
   ```bash
   python app.py
   ```

### Important:
- `backend/.env` is in `.gitignore` (won't be committed)
- Each developer has their own credentials locally
- No credential sharing needed
- Never commit real credentials!

---

## 🚀 Running on Production

### Docker Deployment:
The application has built-in support for environment variable injection:

**Using docker-compose:**
```bash
# Real credentials are passed from your .env file
docker-compose up
```

**Using Coolify (or similar PaaS):**
1. Set environment variables in platform:
   - `OPENAI_API_KEY`
   - `DATABASE_URL`
   - Other required variables
2. Platform injects them into container at runtime
3. No credentials baked into Docker image

### How It Works:
1. `Dockerfile` builds without credentials
2. `entrypoint.sh` loads environment variables
3. `app.py` reads from `os.environ`
4. Database and API services connect with real credentials

---

## 📝 Environment Variables Reference

### Required for API:
```
OPENAI_API_KEY=your-openai-api-key-here
```

### Database (One of):
```
# Option 1: Full DATABASE_URL
DATABASE_URL=postgresql://user:password@host:port/db

# Option 2: Individual POSTGRES variables
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=your_database
```

### Optional:
```
OPENAI_MODEL=gpt-4
CHAT_TIMEOUT_SECONDS=60
FLASK_ENV=development
PORT=5000
```

---

## 🔄 How Environment Loading Works

### Priority Order:
1. Load from root `.env` (if exists)
2. Load from `backend/.env` with override (if exists)
3. Use system environment variables
4. Use default values

### Example Flow:
```
app.py runs
  ↓
Load environment variables:
  - Check root/.env
  - Check backend/.env (override)
  - Check os.environ
  ↓
GPTService reads OPENAI_API_KEY
  - If real value: Initialize OpenAI client ✓
  - If placeholder: Log warning, client=None, continue ✓
  ↓
Database reads DATABASE_URL
  - Try DATABASE_URL env var
  - Try building from POSTGRES_* vars
  - Fallback to localhost (dev only)
  ↓
Flask app runs with error handling
  - Routes available
  - Chat endpoints return errors if services unavailable
```

---

## ⚠️ Error Handling

If placeholder values are used:

| Service | Behavior |
|---------|----------|
| **OpenAI API** | Logs warning, continues running, API endpoints return error messages |
| **Database** | Falls back to POSTGRES_* variables, then localhost, logs connection error |
| **Flask** | Starts successfully, all routes available, endpoints gracefully handle missing services |

**Key Point**: The app won't crash with placeholder values - it logs warnings and handles errors gracefully.

---

## 🐳 Docker & Deployment

### Building:
```bash
docker build -t world-journey-ai .
```
No credentials are baked into the image.

### Running with docker-compose:
```bash
# Reads .env file and passes variables to containers
docker-compose up
```

### Running on Coolify/Heroku/etc:
1. Set environment variables in platform dashboard
2. Deploy code (no credentials needed)
3. Platform injects variables at runtime

---

## 🔐 Best Practices

✅ **DO:**
- Store real credentials in `backend/.env` (locally only)
- Use `.env.example` as template
- Update `backend/.env` with your real values
- Keep `backend/.env` in `.gitignore`
- Use different credentials for dev and production

❌ **DON'T:**
- Commit `backend/.env` to Git
- Hardcode credentials in source code
- Share credentials via email or chat
- Use same credentials for development and production
- Commit `.env` files even if empty

---

## 📋 Checklist for Setup

### Local Development:
- [ ] Clone repository
- [ ] Copy `backend/.env.example` to `backend/.env`
- [ ] Fill in real values for localhost
- [ ] Test: `python app.py` runs successfully
- [ ] Test: API endpoints work with real credentials

### Production Deployment:
- [ ] Rotate old credentials (they were exposed)
- [ ] Get new OpenAI API key
- [ ] Set up production database
- [ ] Configure platform environment variables
- [ ] Build Docker image (no credentials included)
- [ ] Deploy to platform (credentials injected at runtime)
- [ ] Test: API endpoints work in production
- [ ] Monitor: Check logs for any credential-related errors

---

## 🆘 Troubleshooting

**Q: App won't start with placeholder values**
A: This is expected. Update `backend/.env` with real credentials.

**Q: Production environment variables not working**
A: Check that platform is configured to pass `OPENAI_API_KEY` and `DATABASE_URL`.

**Q: Database connection fails**
A: Verify `DATABASE_URL` is correct or `POSTGRES_*` variables are set.

**Q: Chat API returns "OpenAI client not initialized"**
A: `OPENAI_API_KEY` is missing or invalid. Check `backend/.env`.

---

## ✨ Summary

✅ **Your security update is complete and functional**

- Credentials secured with placeholders
- localhost development ready
- Production deployment ready
- Error handling in place
- No breaking changes

**You can safely commit to GitHub!**
