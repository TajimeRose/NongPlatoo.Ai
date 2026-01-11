# 🚀 Deployment Guide: nongplatoo.online

Complete step-by-step guide to deploy World.Journey.Ai to `https://nongplatoo.online` using Coolify.

---

## 📋 Prerequisites Checklist

Before starting, make sure you have:

- ✅ Domain: `nongplatoo.online` (registered and owned)
- ✅ Server with Coolify installed
- ✅ Access to domain DNS management (e.g., Cloudflare, Namecheap, GoDaddy)
- ✅ OpenAI API Key
- ✅ GitHub repository pushed (or Git repo accessible by Coolify)

---

## 🌐 Step 1: Configure DNS Records

### Go to your domain registrar's DNS settings and add:

```
Type: A
Name: @
Value: YOUR_SERVER_IP
TTL: Auto or 3600

Type: A
Name: www
Value: YOUR_SERVER_IP
TTL: Auto or 3600
```

**Example**:
```
A Record: nongplatoo.online → 123.45.67.89
A Record: www.nongplatoo.online → 123.45.67.89
```

⏱️ **Wait 5-15 minutes** for DNS propagation (can take up to 24 hours)

**Verify DNS**: Open terminal and run:
```bash
ping nongplatoo.online
```

---

## 🐳 Step 2: Create Database in Coolify

1. **Login to Coolify dashboard**
2. **Go to**: Resources → Databases
3. **Click**: "+ New Database"
4. **Select**: PostgreSQL
5. **Configure**:
   - Name: `nongplatoo-db`
   - Username: `nongplatoo_user`
   - Password: (Generate strong password)
   - Database: `nongplatoo`
6. **Deploy** and wait for database to start
7. **Copy the connection string** (you'll need this)

Example connection string:
```
postgresql://nongplatoo_user:PASSWORD@postgres-host:5432/nongplatoo
```

---

## 📦 Step 3: Create Application in Coolify

### 3.1 Create New Application

1. **Go to**: Resources → Applications
2. **Click**: "+ New Application"
3. **Select**: "Public Repository" or "Private Repository"
4. **Enter your repository URL**:
   ```
   https://github.com/YourUsername/World.Journey.Ai
   ```
5. **Branch**: `main` (or your production branch)

### 3.2 Configure Build Settings

- **Build Pack**: Dockerfile
- **Dockerfile Location**: `./Dockerfile` (default)
- **Port**: `8000`
- **Health Check Path**: `/health`

### 3.3 Configure Domain

1. **Domains Section** in Coolify
2. **Add domain**: `nongplatoo.online`
3. **Enable**: "Generate SSL Certificate" (Let's Encrypt)
4. **Enable**: "Force HTTPS" (redirect HTTP to HTTPS)

---

## 🔐 Step 4: Configure Environment Variables

In Coolify application settings → **Environment Variables**, add:

### Required Variables:

```env
# Flask Configuration
FLASK_ENV=production
FLASK_DEBUG=False
FLASK_HOST=0.0.0.0
PORT=8000
SECRET_KEY=GENERATE_RANDOM_SECRET_KEY_HERE

# OpenAI API Key (CRITICAL)
OPENAI_API_KEY=sk-your-actual-openai-api-key

# Database (from Step 2)
DATABASE_URL=postgresql://nongplatoo_user:YOUR_PASSWORD@postgres-host:5432/nongplatoo
POSTGRES_HOST=postgres-host
POSTGRES_PORT=5432
POSTGRES_DB=nongplatoo
POSTGRES_USER=nongplatoo_user
POSTGRES_PASSWORD=YOUR_PASSWORD

# CORS Configuration
CORS_ORIGINS=https://nongplatoo.online

# Chat Configuration
CHAT_TIMEOUT_SECONDS=60

# Frontend API URL (for build process)
VITE_API_BASE=https://nongplatoo.online
```

### Generate Secret Key:

Run this in PowerShell:
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

---

## 🚀 Step 5: Deploy Application

1. **In Coolify**: Click "Deploy" button
2. **Watch build logs** for any errors
3. **Wait for**:
   - ✅ Docker build complete
   - ✅ SSL certificate generated
   - ✅ Application health check passed

**Build time**: ~5-10 minutes

---

## 🗄️ Step 6: Initialize Database

### Option A: Using Coolify Terminal

1. **Go to** application in Coolify
2. **Click** "Terminal" or "Console"
3. **Run**:
```bash
python -c "from backend.db import init_db; init_db()"
```

### Option B: Using SSH

SSH into your server and run:
```bash
docker exec -it YOUR_CONTAINER_NAME python -c "from backend.db import init_db; init_db()"
```

### Seed Sample Data (Optional):

```bash
python backend/seed_places.py
```

---

## ✅ Step 7: Verify Deployment

### Test these URLs:

1. **Health Check**:
   ```
   https://nongplatoo.online/health
   ```
   Should return: `{"status": "healthy"}`

2. **Homepage**:
   ```
   https://nongplatoo.online/
   ```
   Should load the React app

3. **API Test**:
   ```
   https://nongplatoo.online/api/places
   ```
   Should return places data

4. **Chat Test**:
   - Open website
   - Try sending a message in chat
   - Should get AI response

---

## 🔧 Step 8: Post-Deployment Configuration

### Update Frontend Build (if needed)

If frontend shows wrong API URL:

1. **Update environment in Coolify**:
   ```
   VITE_API_BASE=https://nongplatoo.online
   ```

2. **Rebuild application** in Coolify

### Configure CORS (if getting CORS errors)

Add to environment variables:
```env
CORS_ORIGINS=https://nongplatoo.online,https://www.nongplatoo.online
```

---

## 🐛 Troubleshooting

### Issue: SSL Certificate Not Generated

**Solution**:
- Verify DNS is pointing to correct IP
- Wait 15-30 minutes for DNS propagation
- In Coolify: Force regenerate SSL certificate

### Issue: 502 Bad Gateway

**Check**:
1. Container is running: `docker ps`
2. Port 8000 is correct
3. Health check endpoint works: `/health`
4. Check application logs in Coolify

### Issue: Database Connection Failed

**Check**:
1. `DATABASE_URL` is correct in environment variables
2. Database container is running
3. Test connection from app container

### Issue: OpenAI API Not Working

**Check**:
1. `OPENAI_API_KEY` is set correctly (starts with `sk-`)
2. API key has credits
3. Check logs for API errors

### Issue: Frontend Shows "Failed to Fetch"

**Check**:
1. `VITE_API_BASE` is set to `https://nongplatoo.online`
2. Rebuild frontend after changing environment
3. Check browser console for CORS errors

---

## 📊 Monitoring

### View Logs in Coolify:

1. **Application Logs**: Check for Python errors
2. **Build Logs**: Check for build failures
3. **Database Logs**: Check for connection issues

### Set Up Monitoring:

- **Health Check**: Coolify automatically monitors `/health`
- **Uptime Monitoring**: Use UptimeRobot or similar
- **Error Tracking**: Consider Sentry integration

---

## 🔄 Updating the Application

### To deploy updates:

1. **Push changes** to your Git repository
2. **In Coolify**: Click "Redeploy" or enable auto-deploy
3. **Coolify will**:
   - Pull latest code
   - Rebuild Docker image
   - Deploy with zero downtime

---

## 🔒 Security Checklist

- ✅ HTTPS enabled and forced
- ✅ Strong SECRET_KEY generated
- ✅ Database password is strong
- ✅ OPENAI_API_KEY not exposed in frontend
- ✅ CORS configured for specific domain only
- ✅ `FLASK_DEBUG=False` in production
- ✅ Regular backups of database

---

## 📞 Support

If you encounter issues:

1. **Check Coolify logs** first
2. **Check application logs** in container
3. **Verify all environment variables** are set
4. **Test database connection** manually
5. **Verify DNS records** are correct

---

## 🎉 Success!

Your application should now be live at:

**🌐 https://nongplatoo.online**

Share this URL with your users and enjoy your AI-powered tourism assistant!

---

## 📝 Maintenance Notes

### Regular Tasks:

- **Daily**: Check application logs for errors
- **Weekly**: Monitor database size and performance
- **Monthly**: Review API usage and costs (OpenAI)
- **Quarterly**: Update dependencies and security patches

### Database Backup:

Set up automatic backups in Coolify:
1. Go to Database settings
2. Enable automated backups
3. Configure backup schedule (daily recommended)

---

**Last Updated**: December 25, 2025
**Domain**: nongplatoo.online
**Server**: Coolify + Docker
