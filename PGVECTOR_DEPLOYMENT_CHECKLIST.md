# pgvector Deployment Checklist - CoolifyV4

## Pre-Deployment Tasks

- [ ] **Backup your database** - Always backup before making changes
- [ ] **Review pgvector documentation** - https://github.com/pgvector/pgvector
- [ ] **Notify team** - Let them know about semantic search feature

---

## Step 1: Database Setup (PostgreSQL Server)

### Option A: Using CoolifyV4 Database Console
- [ ] Open CoolifyV4 dashboard
- [ ] Navigate to PostgreSQL service
- [ ] Open Database console/terminal
- [ ] Run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
- [ ] Verify: `SELECT * FROM pg_available_extensions WHERE name = 'vector';`

### Option B: SSH to Database Server
```bash
ssh your-coolify-server
psql -U postgres -h localhost
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

---

## Step 2: Local Development (Your Machine)

### Install & Test Locally First
- [ ] Navigate to backend directory: `cd backend`
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Test generate_embeddings script locally:
  ```powershell
  python -m backend.generate_embeddings
  ```
- [ ] Watch for progress output - should show all steps completing
- [ ] Verify no errors in output

### Verify Local Database Changes
```sql
-- Connect to your local database
SELECT COUNT(*) FROM places WHERE description_embedding IS NOT NULL;
-- Should return a number > 0
```

---

## Step 3: Deploy to CoolifyV4

### Update Application Code
- [ ] Commit all changes to git:
  ```bash
  git add backend/db.py backend/requirements.txt
  git commit -m "Add pgvector semantic search support"
  git push origin main
  ```

### CoolifyV4 Deployment
- [ ] Navigate to your app in CoolifyV4
- [ ] Go to "Deployments" tab
- [ ] Click "Redeploy" or trigger deployment
- [ ] Wait for deployment to complete
- [ ] Check logs for any errors
- [ ] Verify no startup errors related to pgvector

### Generate Embeddings on Production (if not done locally)
- [ ] SSH into CoolifyV4 app container or use their terminal:
  ```bash
  cd /app
  python -m backend.generate_embeddings
  ```
- [ ] Or configure as a one-time job in CoolifyV4

---

## Step 4: Verification

### Health Check
- [ ] Visit: `https://your-domain.com/health`
- [ ] Should return: `{"status": "healthy", "database": {"status": "connected"}}`

### API Testing

#### Test Semantic Search
```bash
curl "https://your-domain.com/api/places/search/semantic?q=floating%20market"
```
Expected: JSON array with places and `similarity_score` field

#### Test Hybrid Search
```bash
curl "https://your-domain.com/api/places/search/hybrid?q=restaurant"
```
Expected: JSON array with `combined_score` field

#### Test Similar Places
```bash
curl "https://your-domain.com/api/places/1/similar?limit=5"
```
Expected: 5 places with similarity scores

### Database Verification
```sql
-- Verify embeddings exist
SELECT COUNT(*) FROM places WHERE description_embedding IS NOT NULL;

-- Verify index exists
SELECT indexname FROM pg_indexes 
WHERE tablename='places' AND indexname='places_embedding_idx';

-- Sample semantic search query
SELECT name, description <-> '[...]'::vector as distance 
FROM places 
ORDER BY description_embedding <=> '[...]'::vector 
LIMIT 5;
```

---

## Step 5: Monitoring

### Post-Deployment Checks (24 hours)
- [ ] Monitor application logs for errors
- [ ] Check database query performance
- [ ] Verify no unexpected memory usage spike
- [ ] Test semantic search with real user queries
- [ ] Collect feedback from team

### Performance Metrics
- [ ] **Semantic search latency**: Should be <100ms per query (after warmup)
- [ ] **Database connections**: Should not increase significantly
- [ ] **Memory usage**: Model loads once, stays in memory
- [ ] **CPU usage**: Minimal during search (mostly disk I/O)

---

## Rollback Plan (If Something Goes Wrong)

### Disable Semantic Search (Keep pgvector)
```python
# In backend/db.py, comment out semantic search endpoints
# Keep keyword search working as fallback
```

### Remove pgvector (Full Rollback)
```sql
-- Drop pgvector extension (deletes vector column!)
DROP EXTENSION IF EXISTS vector CASCADE;

-- Or just drop the column:
ALTER TABLE places DROP COLUMN description_embedding;
```

### Revert Code
```bash
git revert <commit-hash>
```

---

## Configuration Checklist

### Environment Variables (Verify in CoolifyV4)
- [ ] `DATABASE_URL` - Set correctly
- [ ] `POSTGRES_HOST` - Points to your database
- [ ] `POSTGRES_PORT` - Usually 5432
- [ ] `POSTGRES_DB` - Your database name
- [ ] `POSTGRES_USER` - Your user
- [ ] `POSTGRES_PASSWORD` - Your password

### No New Variables Needed!
pgvector works with existing database configuration.

---

## Documentation Checklist

- [ ] Team informed about semantic search feature
- [ ] Documentation updated with new endpoints
- [ ] API documentation includes example queries
- [ ] Frontend developers briefed on new capabilities
- [ ] Known limitations documented (e.g., embeddings only for English/Thai)

---

## Post-Deployment Support

### If users report issues:
1. Check logs: `docker logs <app-container-id>`
2. Verify pgvector: `SELECT extname FROM pg_extension;`
3. Check embeddings: `SELECT COUNT(*) FROM places WHERE description_embedding IS NOT NULL;`
4. Test manually: `python -m backend.generate_embeddings --verify`

### Performance Troubleshooting
- Slow queries? Check if index is still being built
- High memory? Reduce model batch size in generate_embeddings.py
- Connection issues? Check network/firewall settings

---

## Timeline

- **Setup on DB**: 5 minutes
- **Generate embeddings**: 2-5 minutes
- **Deploy to CoolifyV4**: 5-10 minutes
- **Total**: ~15-20 minutes

---

## Success Criteria

- ✅ Semantic search endpoint returns results
- ✅ Results are ranked by semantic similarity
- ✅ Performance is acceptable (<100ms per query)
- ✅ No errors in application logs
- ✅ Database backup completed before changes

---

**Need help?** Check the detailed guide: [PGVECTOR_COOLIFYV4_SETUP.md](PGVECTOR_COOLIFYV4_SETUP.md)
