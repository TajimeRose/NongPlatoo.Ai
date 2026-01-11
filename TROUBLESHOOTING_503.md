# 🚨 Troubleshooting 503 Error - nongplatoo.online

## Problem: "no available server" (HTTP 503)

Your reverse proxy (Traefik/Caddy) is responding but **cannot reach your Flask container**.

---

## ✅ Step-by-Step Fix

### Step 1: Check Deployment Logs

1. **In Coolify**: Go to your application
2. **Click**: "Deployments" tab (top menu)
3. **Check latest deployment**:
   - Look for: `✅ Starting Gunicorn on 0.0.0.0:8000`
   - Look for errors like:
     - `ModuleNotFoundError`
     - `Connection refused`
     - `Port already in use`
     - Database connection errors

**If deployment failed**, fix the error shown in logs first.

**If deployment succeeded**, continue to Step 2.

---

### Step 2: Configure Healthcheck (CRITICAL)

The "Running (unknown)" status means healthcheck isn't configured.

1. **Go to**: Configuration → **Healthcheck** (left menu)
2. **Fill in**:
   ```
   Path: /health
   Method: GET
   Port: 8000
   Scheme: http
   Interval: 10
   Timeout: 5
   Healthy Threshold: 1
   Unhealthy Threshold: 3
   ```
3. **Click**: "Save"

---

### Step 3: Fix Domain Configuration

1. **Go to**: Configuration → **General**
2. **Find**: "Domains" field
3. **Change from**: `https://nongplatoo.online`
4. **Change to**: `nongplatoo.online` (remove https://)
5. **Click**: "Save"

**Why?** Coolify adds HTTPS automatically. The `https://` prefix confuses routing.

---

### Step 4: Fix Port Configuration

1. **Scroll down** to "Network" section (in General tab)
2. **Check**:
   - **Ports Exposes**: `8000` ✅ (keep this)
   - **Ports Mappings**: Should be **EMPTY** ❌ (clear this field)
3. **Click**: "Save"

**Why?** Port mappings (9000:8000) are for direct access. For domain routing via reverse proxy, you only need "Ports Exposes".

---

### Step 5: Check Environment Variables

1. **Go to**: Configuration → **Environment Variables**
2. **Verify these exist**:
   ```env
   PORT=8000
   FLASK_ENV=production
   FLASK_HOST=0.0.0.0
   OPENAI_API_KEY=sk-... (your actual key)
   DATABASE_URL=postgresql://... (your database connection)
   ```

**If missing**, add them and save.

---

### Step 6: Redeploy

1. **Click**: "Redeploy" button (top right)
2. **Wait** for deployment to complete (~5-10 minutes)
3. **Watch** the deployment logs

**Look for**:
```
✅ Starting Gunicorn on 0.0.0.0:8000
✅ SSL certificate generated for nongplatoo.online
```

---

### Step 7: Test Inside Container (Optional but Recommended)

1. **In Coolify**: Go to "Terminal" tab
2. **Run**:
   ```bash
   curl http://localhost:8000/health
   ```

**Expected output**:
```json
{"status":"healthy"}
```

**If this works**, your app is running! Problem is routing.

**If this fails**, your app isn't starting properly. Check logs for Python errors.

---

### Step 8: Verify DNS (If Still Not Working)

1. **Open PowerShell** on your computer
2. **Run**:
   ```powershell
   nslookup nongplatoo.online
   ```

**Expected**: Should show your server's IP address.

**If wrong IP**: Update DNS records at your domain registrar:
```
Type: A
Name: @
Value: YOUR_SERVER_IP
TTL: 3600
```

Wait 15 minutes for DNS propagation.

---

## 🔍 Common Issues & Solutions

### Issue 1: Container Not Starting

**Symptoms**: Deployment logs show errors

**Solutions**:
- Missing `OPENAI_API_KEY` → Add in Environment Variables
- Missing `DATABASE_URL` → Add database connection string
- Python import errors → Check if all dependencies installed in Dockerfile

### Issue 2: Healthcheck Failing

**Symptoms**: Status shows "Unhealthy" or keeps restarting

**Solutions**:
- Healthcheck port must be `8000` (same as PORT env var)
- Healthcheck path must be `/health` (lowercase)
- Check if `/health` endpoint returns HTTP 200

### Issue 3: SSL Not Working

**Symptoms**: Browser shows "Not secure"

**Solutions**:
- Wait 10-15 minutes for Let's Encrypt to issue certificate
- Domain must point to correct IP (check DNS)
- Domain field must be `nongplatoo.online` (no https://)

### Issue 4: 502 Bad Gateway

**Symptoms**: Different from 503, means routing works but app crashed

**Solutions**:
- Check application logs for Python exceptions
- Verify Gunicorn started successfully
- Check if database is accessible

---

## 📊 Expected Status After Fix

**In Coolify**:
- Status: 🟢 **Running** (no "unknown")
- SSL: ✅ Certificate issued
- Healthcheck: ✅ Passing

**In Browser**:
- `https://nongplatoo.online` → React app loads
- `https://nongplatoo.online/health` → `{"status":"healthy"}`
- 🔒 Padlock icon (HTTPS secure)

---

## 🆘 If Still Not Working

### Check These Logs (in order):

1. **Deployment Logs**: Click "Deployments" → Latest deployment
   - Look for build errors
   - Verify "Starting Gunicorn" message appears

2. **Application Logs**: Click "Logs" tab
   - Look for Python exceptions
   - Check for database connection errors
   - Verify no port binding errors

3. **Terminal Test**: Click "Terminal" tab
   ```bash
   # Check if process is running
   ps aux | grep gunicorn
   
   # Test health endpoint internally
   curl http://localhost:8000/health
   
   # Check what port is listening
   netstat -tlnp | grep 8000
   ```

4. **Container Labels**: In "Advanced" settings
   - Verify Traefik/Caddy labels are present
   - Should include routing rules for `nongplatoo.online`

---

## 💡 Quick Checklist

Before asking for help, verify:

- [ ] Domain is `nongplatoo.online` (no https://)
- [ ] Ports Exposes = `8000`
- [ ] Ports Mappings = empty
- [ ] Healthcheck configured (`/health`, port 8000)
- [ ] Environment variables set (PORT, OPENAI_API_KEY, DATABASE_URL)
- [ ] Deployment completed successfully (check logs)
- [ ] Container is running (status shows "Running")
- [ ] DNS points to correct server IP

---

**Last Updated**: December 25, 2025  
**Domain**: nongplatoo.online  
**Expected Working URL**: https://nongplatoo.online
