# pgvector Integration Guide - CoolifyV4 PostgreSQL Setup

## ✅ What's Been Done

Your World.Journey.Ai project now has **full pgvector support** for semantic search! Here's what was added:

### Files Modified/Created:
1. **[backend/db.py](backend/db.py)** - Added pgvector Vector column to Place model
2. **[backend/requirements.txt](backend/requirements.txt)** - Added pgvector>=0.2.4
3. **[backend/generate_embeddings.py](backend/generate_embeddings.py)** - Embedding generation script (already existed)
4. **[docker-compose.yml](docker-compose.yml)** - No changes needed (using standard Postgres)

---

## 🚀 Quick Setup Instructions

### For CoolifyV4 Deployment:

#### **Step 1: Install pgvector PostgreSQL Extension**

You need to enable pgvector on your CoolifyV4 PostgreSQL database. SSH into your database server or use CoolifyV4's database console:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Or let the setup script do it automatically (Step 3).

#### **Step 2: Install Python Dependencies**

```powershell
cd backend
pip install -r requirements.txt
```

This installs pgvector>=0.2.4 and sentence-transformers.

#### **Step 3: Generate Embeddings**

After your database has the pgvector extension and the embedding column exists, generate embeddings for all your places:

```powershell
python -m backend.generate_embeddings
```

This script will:
- ✓ Create the pgvector extension if needed
- ✓ Add the `description_embedding` column (if needed)
- ✓ Generate embeddings for all 1536 places using sentence-transformers
- ✓ Create a vector index for faster searches
- ✓ Print progress as it runs

**Expected Time**: ~2-5 minutes depending on your database size

#### **Step 4: Restart Flask Application**

In CoolifyV4:
1. Go to your app configuration
2. Click "Redeploy" or restart the container
3. The app will use the new pgvector embeddings

---

## 🎯 New Features Available

### 1. **Semantic Search** - Concept-based searching
```python
from backend.db import search_places_semantic

# Find "romantic dinner spots" even if database has "candlelit restaurant"
results = search_places_semantic("romantic dinner", limit=5)
```

API endpoint:
```
GET /api/places/search/semantic?q=floating%20market
```

Response:
```json
{
  "places": [
    {
      "id": "123",
      "name": "Amphawa Floating Market",
      "similarity_score": 0.87,
      "description": "...",
      ...
    }
  ]
}
```

### 2. **Hybrid Search** - Best of both worlds
```python
from backend.db import search_places_hybrid

# Combines semantic + keyword search with smart weighting
results = search_places_hybrid("waterfront cafe", limit=10)
```

API endpoint:
```
GET /api/places/search/hybrid?q=waterfront%20cafe
```

### 3. **Similar Places** - Recommendations
```python
from backend.db import get_similar_places

# Get places similar to place #123
similar = get_similar_places(place_id=123, limit=5)
```

API endpoint:
```
GET /api/places/{place_id}/similar?limit=5
```

---

## 🔍 How It Works

### Vector Embeddings
- Uses **sentence-transformers** with `paraphrase-multilingual-MiniLM-L12-v2` model
- Generates **384-dimensional vectors** for each place description
- Vectors capture semantic meaning ("floating market" ≈ "boat market")

### Database Storage
- Stores vectors in PostgreSQL using **pgvector** extension
- Creates **IVFFlat index** for O(log n) lookup speed
- Supports **cosine similarity** distance metric

### Query Process
1. User searches: "romantic waterfront restaurant"
2. Query is converted to a 384-dimensional vector
3. PostgreSQL finds most similar vectors using cosine distance
4. Results are ranked by similarity score (0-1)

---

## ⚙️ Integration with Your API

### Add API Endpoints

In your [app.py](app.py) or route handlers, add these endpoints:

```python
from flask import request, jsonify
from backend.db import search_places_semantic, search_places_hybrid, get_similar_places

@app.route('/api/places/search/semantic', methods=['GET'])
def semantic_search():
    """Semantic search endpoint"""
    query = request.args.get('q', '')
    limit = request.args.get('limit', 10, type=int)
    
    places = search_places_semantic(query, limit=limit)
    return jsonify({'places': places})

@app.route('/api/places/search/hybrid', methods=['GET'])
def hybrid_search():
    """Hybrid search (semantic + keyword)"""
    query = request.args.get('q', '')
    limit = request.args.get('limit', 10, type=int)
    
    places = search_places_hybrid(query, limit=limit)
    return jsonify({'places': places})

@app.route('/api/places/<int:place_id>/similar', methods=['GET'])
def similar_places(place_id):
    """Get similar places"""
    limit = request.args.get('limit', 5, type=int)
    
    places = get_similar_places(place_id, limit=limit)
    return jsonify({'places': places})
```

---

## 📊 Performance Optimization

### Vector Index Details
```sql
-- Created automatically by generate_embeddings.py
CREATE INDEX places_embedding_idx 
ON places 
USING ivfflat (description_embedding vector_cosine_ops)
WITH (lists = 100);
```

### Expected Performance
- **First query**: ~200-500ms (model loading)
- **Subsequent queries**: ~10-50ms (index lookup + similarity calculation)

### To Improve Performance:
1. Increase IVFFlat `lists` parameter (more memory, faster searches)
2. Add more replicas for read-heavy workloads
3. Use connection pooling (PgBouncer)

---

## 🐛 Troubleshooting

### Issue: "pgvector not installed"
**Solution**: 
```sql
-- Run on PostgreSQL server as superuser
CREATE EXTENSION IF NOT EXISTS vector;
```

### Issue: "sentence-transformers module not found"
**Solution**:
```powershell
pip install sentence-transformers>=2.2.2
```

### Issue: Embedding generation is very slow
**Reason**: Model is downloading + processing 1536 places
**Solution**: This is normal. First run takes ~5 minutes. Subsequent runs are incremental.

### Issue: Semantic search returns 0 results
**Reason**: Embeddings not generated for your places yet
**Solution**:
```powershell
python -m backend.generate_embeddings
```

### Issue: Cosine similarity returns very small numbers
**Reason**: Raw distance metric needs normalization
**Solution**: Already handled! `similarity_score` is normalized to 0-1 range

---

## 📝 Environment Variables (CoolifyV4)

No additional environment variables needed! pgvector works with your existing:

```
DATABASE_URL=postgresql://user:pass@host:port/dbname
POSTGRES_HOST=...
POSTGRES_PORT=...
POSTGRES_USER=...
POSTGRES_PASSWORD=...
POSTGRES_DB=...
```

---

## 🔒 Security Notes

- Vectors don't contain sensitive information (they're mathematical representations)
- All queries go through standard PostgreSQL authentication
- IVFFlat indexes are stored in the same database as your data
- Vector search doesn't expose embeddings to the user

---

## 📚 Example Usage

### Frontend Integration (TypeScript)
```typescript
// Semantic search
const response = await fetch(
  `/api/places/search/semantic?q=${encodeURIComponent("floating market")}`
);
const data = await response.json();
console.log(data.places); // Ranked by semantic similarity

// Similar places
const similarResponse = await fetch(`/api/places/123/similar?limit=5`);
const similarData = await similarResponse.json();
console.log(similarData.places); // 5 similar places
```

### Python Usage
```python
from backend.db import (
    search_places_semantic,
    search_places_hybrid,
    get_similar_places
)

# Find "places with good street food"
results = search_places_semantic("street food", limit=10)
for place in results:
    print(f"{place['name']} (similarity: {place['similarity_score']:.2f})")

# Get places similar to a specific place
similar = get_similar_places(place_id=42, limit=5)
```

---

## 📞 Next Steps

1. ✅ Install pgvector extension on CoolifyV4 PostgreSQL
2. ✅ Run embedding generation: `python -m backend.generate_embeddings`
3. ✅ Add semantic search endpoints to your Flask app
4. ✅ Test with frontend: `/api/places/search/semantic?q=test`
5. ✅ Deploy to CoolifyV4

---

## 📖 Additional Resources

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Sentence-Transformers Models](https://www.sbert.net/docs/pretrained_models.html)
- [CoolifyV4 Database Guide](backend/COOLIFY_DATABASE_GUIDE.md)

---

**Questions?** Check your CoolifyV4 logs or database console to verify pgvector is installed:
```sql
SELECT * FROM pg_available_extensions WHERE name = 'vector';
```

Should show: `| vector | 0.5.0 |` (or newer version)
