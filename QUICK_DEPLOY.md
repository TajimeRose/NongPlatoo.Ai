# 🚀 Quick Start Deployment Guide

## Step 1: Verify All Optimizations
```bash
# Run pre-deployment verification
bash pre-deployment-check.sh
```
Expected output: "✓ Ready for deployment!"

## Step 2: Set Production Environment Variables

### For Docker Deployment:
Create a `.env` file with these **CRITICAL** variables:
```bash
FLASK_ENV=production
FLASK_DEBUG=False
OPENAI_API_KEY=sk-xxxxxxxxxxxxx              # Your OpenAI API key
DATABASE_URL=postgresql://user:pass@host/db  # Your database URL
SECRET_KEY=your-strong-random-key-here       # Generate: openssl rand -hex 32
```

### For Direct Server Deployment:
Export environment variables:
```bash
export FLASK_ENV=production
export FLASK_DEBUG=False
export OPENAI_API_KEY=sk-xxxxxxxxxxxxx
export DATABASE_URL=postgresql://...
export SECRET_KEY=...
```

## Step 3: Choose Your Deployment Method

### Option A: Docker Compose (Easiest)
```bash
# Build and run
docker-compose up -d

# Verify it's running
curl http://localhost:8000/health
# Expected: {"status": "healthy", "service": "NongPlatoo.Ai"}

# View logs
docker-compose logs -f web
```

### Option B: Direct Python/Gunicorn
```bash
# Install dependencies
pip install -r backend/requirements.txt

# Run with Gunicorn
gunicorn -b 0.0.0.0:8000 -w 4 -t 300 app:app
```

### Option C: Coolify Platform
1. Connect your GitHub repository
2. Create a new service from the Dockerfile
3. Set environment variables in Coolify dashboard
4. Deploy!

## Step 4: Verify Deployment

### Health Check
```bash
curl https://your-domain.com/health
# Should return: {"status": "healthy", "service": "NongPlatoo.Ai"}
```

### Check Database Connection
```bash
curl https://your-domain.com/api/places
# Should return JSON array of places
```

### Test Streaming API
```bash
curl -X POST https://your-domain.com/api/messages/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "หาวัด",
    "user_id": "test"
  }'
# Should stream AI responses
```

## Step 5: Monitor & Maintain

### View Logs (Docker)
```bash
docker-compose logs -f web
```

### View Logs (Gunicorn)
Check systemd journal:
```bash
journalctl -u nongplatoo -f
```

### Health Monitoring
Set up uptime monitoring to hit `/health` endpoint every 5 minutes.

### Performance Monitoring
- Response times should be < 2 seconds
- First request may take 30s (model loading)
- Subsequent requests < 500ms

## Common Issues & Solutions

### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000

# Kill it
kill -9 <PID>
```

### Database Connection Failed
1. Verify PostgreSQL is running
2. Check DATABASE_URL is correct
3. Verify network connectivity
4. Check database user credentials

### "Module not found" errors
```bash
# Reinstall dependencies
pip install --force-reinstall -r backend/requirements.txt
```

### Semantic model takes too long to load
- It's normal for first request to take ~30 seconds
- Model is cached after first load
- Pre-loads on startup (see logs)

### CORS errors in frontend
1. Check ALLOWED_ORIGINS environment variable
2. Verify frontend domain is in the list
3. Check browser console for exact error

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migrated and populated
- [ ] HTTPS/SSL certificate installed
- [ ] Firewall rules allow port 8000 (or reverse proxy)
- [ ] Database backups configured
- [ ] Health check endpoint verified
- [ ] Logs are being stored
- [ ] Monitoring/alerting set up
- [ ] API rate limiting considered
- [ ] Security headers verified

## Scaling Tips

For high traffic:
1. **Increase workers**: `gunicorn -w 8 app:app`
2. **Add Redis cache**: For result caching
3. **Database optimization**: Connection pooling, indexes
4. **Load balancer**: Nginx reverse proxy with multiple app servers
5. **CDN**: For static assets (frontend files)

## Support Resources

- **Main Documentation**: See `DEPLOYMENT_OPTIMIZATION_REPORT.md`
- **Environment Template**: See `.env.production.example`
- **Docker Setup**: See `Dockerfile` and `docker-compose.yml`
- **Pre-flight Check**: Run `bash pre-deployment-check.sh`

---

**You're all set! Your application is ready for production deployment.** 🎉
