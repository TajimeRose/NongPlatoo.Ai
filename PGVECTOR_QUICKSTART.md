# pgvector Quick Reference - CoolifyV4

## 3-Step Setup

### Step 1: Enable pgvector on PostgreSQL
Connect to your CoolifyV4 PostgreSQL database and run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Step 2: Install Dependencies & Generate Embeddings
```powershell
cd backend
pip install -r requirements.txt
python -m backend.generate_embeddings
```

### Step 3: Restart Your App in CoolifyV4
Redeploy your application to use the new embeddings.

---

## API Endpoints Available

### Semantic Search (Concept-based)
```
GET /api/places/search/semantic?q=romantic%20sunset%20spots
```
**Returns**: Places sorted by semantic similarity

### Hybrid Search (Semantic + Keyword)
```
GET /api/places/search/hybrid?q=floating%20market
```
**Returns**: Ranked by combined semantic + keyword relevance

### Similar Places (Recommendations)
```
GET /api/places/{place_id}/similar?limit=5
```
**Returns**: 5 places most similar to the given place

---

## Python Function Usage

```python
from backend.db import search_places_semantic, search_places_hybrid, get_similar_places

# Semantic search
results = search_places_semantic("waterfront cafe", limit=10)

# Hybrid search
results = search_places_hybrid("floating market", limit=10)

# Similar places
results = get_similar_places(place_id=123, limit=5)

# All results include:
# - similarity_score: 0-1 (1 = identical, 0 = different)
# - All standard place fields (name, description, etc.)
```

---

## Database Setup

### Column Added
- **Table**: `places`
- **Column**: `description_embedding` (vector type, 384 dimensions)
- **Index**: `places_embedding_idx` (IVFFlat for fast search)

### Vector Dimensions
- Model: `paraphrase-multilingual-MiniLM-L12-v2`
- Dimensions: **384** (multilingual semantic understanding)

---

## Verify Setup

### Check pgvector is installed:
```sql
SELECT * FROM pg_available_extensions WHERE name = 'vector';
```

### Check embedding column exists:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name='places' AND column_name='description_embedding';
```

### Check index exists:
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename='places' AND indexname='places_embedding_idx';
```

### Check embeddings were generated:
```sql
SELECT COUNT(*) FROM places WHERE description_embedding IS NOT NULL;
```
Should return: ~1536 (number of places with embeddings)

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "pgvector extension not found" | Run: `CREATE EXTENSION IF NOT EXISTS vector;` on PostgreSQL |
| "sentence-transformers not found" | Run: `pip install sentence-transformers>=2.2.2` |
| No embeddings generated | Run: `python -m backend.generate_embeddings` |
| Semantic search returns 0 results | Check: `SELECT COUNT(*) FROM places WHERE description_embedding IS NOT NULL;` |
| Slow semantic search | Index creation might still be in progress; queries will be faster after completion |

---

## Environment (No Changes Needed!)

Your existing CoolifyV4 environment variables work as-is:
```
DATABASE_URL
POSTGRES_HOST
POSTGRES_PORT
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DB
```

No new variables required!

---

## Performance

- **First query**: ~200-500ms (model loading)
- **Subsequent queries**: ~10-50ms (index-based lookup)
- **Embedding generation**: ~2-5 min for 1536 places

---

## Files Modified

- ✅ `backend/db.py` - Added semantic search functions
- ✅ `backend/requirements.txt` - Added pgvector dependency
- ✅ `backend/generate_embeddings.py` - Already had embedding generation

---

**For detailed setup guide**: See [PGVECTOR_COOLIFYV4_SETUP.md](PGVECTOR_COOLIFYV4_SETUP.md)
