# 🔒 Security Checklist Before Pushing to GitHub

## ✅ Files Already Protected

The following files are configured to protect your secrets:

### `.gitignore` includes:
- ✅ `.env` and all `.env.*` files
- ✅ `*.log` files (contains credentials in logs)
- ✅ `serviceAccountKey.json` (Google Cloud credentials)
- ✅ `secrets.json`
- ✅ Private keys (`*.pem`, `*.key`, etc.)

## ⚠️ FILES TO DELETE BEFORE PUSHING

These files contain sensitive data and MUST be removed from git:

```bash
# Delete log files with credentials
git rm flask.log
git rm backend/db_check.log

# If already committed, remove from git history:
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch flask.log backend/db_check.log" \
  --prune-empty --tag-name-filter cat -- --all
```

## 🔑 Environment Variables Setup

### 1. Create `.env` file (NOT tracked by git)

```bash
# Copy example file
cp .env.example .env

# Edit with your actual credentials
notepad .env  # or your preferred editor
```

### 2. Required Environment Variables

Add these to your `.env` file:

```bash
# REQUIRED
OPENAI_API_KEY=sk-your-actual-key-here
DATABASE_URL=postgresql://user:password@host:port/database

# For production (Coolify/Docker)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_HOST=your-database-host
POSTGRES_PORT=5432
POSTGRES_DB=postgres
```

## 🛡️ Security Best Practices

### ✅ DO:
- ✅ Use `.env` files for all secrets (already in `.gitignore`)
- ✅ Use environment variables in `docker-compose.yml` (already fixed)
- ✅ Commit `.env.example` with placeholder values
- ✅ Keep log files out of git
- ✅ Use strong, unique passwords for databases

### ❌ DON'T:
- ❌ Hardcode passwords in any file
- ❌ Commit `.env` files
- ❌ Commit log files
- ❌ Share API keys publicly
- ❌ Use simple passwords like "password" or "123456"

## 🔍 Before Each Push - Quick Check

Run this command to check for accidentally committed secrets:

```bash
# Search for common secret patterns
git grep -E "(sk-[a-zA-Z0-9]{20,}|AIza[a-zA-Z0-9_-]{35}|password.*=.*[^{])" -- "*.py" "*.yml" "*.json" "*.md"

# If it returns anything, DO NOT PUSH!
```

## 🚨 If You Accidentally Pushed Secrets

### Immediate Actions:

1. **Rotate ALL exposed credentials immediately**
   - Generate new OpenAI API key
   - Change database password
   - Regenerate Google Cloud credentials

2. **Remove from Git history**
   ```bash
   # Use BFG Repo Cleaner or git filter-branch
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/sensitive/file" \
     --prune-empty --tag-name-filter cat -- --all
   
   # Force push (WARNING: This rewrites history)
   git push origin --force --all
   ```

3. **Notify your team** if others have cloned the repo

## 📋 Pre-Push Checklist

Before running `git push`:

- [ ] No `.env` files in staging area
- [ ] No `*.log` files in staging area
- [ ] No hardcoded passwords in code
- [ ] No API keys in code
- [ ] No database credentials in code
- [ ] All secrets use environment variables
- [ ] `.env.example` has only placeholders
- [ ] `docker-compose.yml` uses `${VARIABLE}` syntax

## ✅ Current Status

Your repository is now configured correctly:

- ✅ `docker-compose.yml` - Uses environment variables
- ✅ `.gitignore` - Protects sensitive files
- ✅ `.env.example` - Safe template for others
- ✅ Code uses `os.getenv()` for secrets

## 🔐 Additional Security

### For Google Cloud TTS:
```bash
# Add to .gitignore (already there)
serviceAccountKey.json
*-service-account*.json
```

### For Production:
- Use a secrets manager (AWS Secrets Manager, Azure Key Vault, etc.)
- Enable 2FA on all services
- Rotate credentials regularly
- Monitor for unauthorized access

---

## 📚 Resources

- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [BFG Repo Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
