# pgvector Integration Guide

## ✅ What Was Added

pgvector has been successfully integrated into your World.Journey.Ai project to enable semantic search for tourist places using vector embeddings.

---

## 📦 Changes Made

### 1. **Docker Configuration** ([docker-compose.yml](../docker-compose.yml))
- Changed database image from `postgres:15-alpine` to `pgvector/pgvector:pg15`
- This enables PostgreSQL with vector extension support

### 2. **Python Dependencies** ([backend/requirements.txt](../backend/requirements.txt))
- Added `pgvector>=0.2.4` for SQLAlchemy vector support

### 3. **Database Model** ([backend/db.py](../backend/db.py))
- Added `description_embedding` column to `Place` model (384 dimensions)
- Added vector search functions:
  - `search_places_semantic()` - Pure semantic search
  - `search_places_hybrid()` - Combines semantic + keyword search
  - `find_similar_places()` - Find places similar to a given place

### 4. **API Endpoints** ([app.py](../app.py))
- `GET /api/places/search/semantic?q=<query>` - Semantic search
- `GET /api/places/search/hybrid?q=<query>` - Hybrid search
- `GET /api/places/<place_id>/similar` - Similar places

### 5. **Embedding Generation Script** ([backend/generate_embeddings.py](../backend/generate_embeddings.py))
- One-time script to generate embeddings for all existing places
- Uses the same `paraphrase-multilingual-MiniLM-L12-v2` model as your existing semantic search

---

## 🚀 Setup Instructions

### Step 1: Install Dependencies

```powershell
# Navigate to backend directory
cd backend

# Activate your virtual environment (if using one)
.venv\Scripts\activate

# Install pgvector
pip install pgvector>=0.2.4
```

### Step 2: Restart Database with pgvector

```powershell
# Stop existing containers
docker-compose down

# Start with new pgvector image
docker-compose up -d

# Verify pgvector is running
docker-compose ps
```

### Step 3: Generate Embeddings

Run the embedding generation script to add vector embeddings to all places:

```powershell
# From project root
python -m backend.generate_embeddings
```

**Expected output:**
```
============================================================
  pgvector Embedding Generation for Places
============================================================

✓ pgvector extension enabled
✓ Added description_embedding column
✓ Model loaded

Found 128 places to process

[1/128] ✓ Generated embedding for 'Amphawa Floating Market'
[2/128] ✓ Generated embedding for 'Wat Bang Kung'
...
[128/128] ✓ Generated embedding for 'Last Place'

✅ Embedding generation complete!
   Total places: 128
   Updated: 128
   Skipped: 0

✓ Vector index created

🎉 All done! Your places now have vector embeddings.
```

**This takes about 20-30 seconds** for 128 places.

---

## 🧪 Testing the Integration

### Test 1: Semantic Search API

```powershell
# Test semantic search (server must be running)
curl "http://localhost:8000/api/places/search/semantic?q=romantic%20sunset%20spots&limit=5"
```

### Test 2: Hybrid Search

```powershell
curl "http://localhost:8000/api/places/search/hybrid?q=floating%20market&limit=10"
```

### Test 3: Similar Places

```powershell
# Find places similar to Amphawa (replace with actual place_id)
curl "http://localhost:8000/api/places/AMP001/similar?limit=5"
```

### Test 4: Python Console Test

```python
# Start Python in backend directory
from backend.db import search_places_semantic, find_similar_places

# Test semantic search
results = search_places_semantic("romantic sunset dinner", limit=5)
for place in results:
    print(f"{place['name']} - Score: {place['similarity_score']:.3f}")

# Test similar places
similar = find_similar_places("AMP001", limit=3)
print(f"Found {len(similar)} similar places")
```

---

## 🎯 Usage Examples

### Frontend Integration

Update your Places page to use semantic search:

```typescript
// In frontend/src/pages/Places.tsx

const searchPlacesSemantic = async (query: string) => {
  const response = await fetch(
    `http://localhost:8000/api/places/search/semantic?q=${encodeURIComponent(query)}&limit=20`
  );
  const data = await response.json();
  
  if (data.success) {
    setAllPlaces(data.places);
  }
};

// Call when user types in search
useEffect(() => {
  if (search.length > 2) {
    searchPlacesSemantic(search);
  }
}, [search]);
```

### Backend Integration

Use in your chatbot to find relevant places:

```python
from backend.db import search_places_semantic

# When user asks about a place
user_query = "I want to see a temple with unique architecture"
places = search_places_semantic(user_query, limit=3)

# Places are already sorted by relevance
for place in places:
    print(f"{place['name']}: {place['description']}")
```

---

## 📊 API Reference

### Semantic Search
```
GET /api/places/search/semantic
```

**Query Parameters:**
- `q` (required): Search query in Thai or English
- `limit` (optional): Max results (default: 20)
- `district` (optional): Filter by district
- `category` (optional): Filter by category

**Response:**
```json
{
  "success": true,
  "places": [
    {
      "place_id": "AMP001",
      "name": "Amphawa Floating Market",
      "description": "...",
      "similarity_score": 0.89,
      "search_type": "semantic"
    }
  ],
  "count": 5,
  "query": "floating market"
}
```

### Hybrid Search
```
GET /api/places/search/hybrid
```

Same parameters as semantic search, plus:
- `semantic_weight` (optional): Weight for semantic vs keyword (0.0-1.0, default: 0.7)

### Similar Places
```
GET /api/places/{place_id}/similar
```

**Query Parameters:**
- `limit` (optional): Max results (default: 5)

**Response:**
```json
{
  "success": true,
  "places": [...],
  "count": 5,
  "reference_place_id": "AMP001"
}
```

---

## 🔧 Maintenance

### Adding New Places

When adding new places, generate embeddings:

```python
from backend.db import get_session_factory, Place
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
session = get_session_factory()()

# Add new place
new_place = Place(
    place_id="NEW001",
    name="New Attraction",
    description="Amazing new place..."
)

# Generate embedding
text = f"{new_place.name} {new_place.description}"
new_place.description_embedding = model.encode(text).tolist()

session.add(new_place)
session.commit()
```

### Regenerating All Embeddings

If you update place descriptions:

```powershell
# This will skip places that already have embeddings
python -m backend.generate_embeddings

# To force regenerate all (if needed)
# 1. Drop the embedding column
# 2. Run the script again
```

---

## ⚡ Performance Tips

### Indexing

The script automatically creates an IVFFlat index for faster searches. For more than 1000 places, adjust the lists parameter:

```sql
-- For 1000-10000 places
CREATE INDEX ON places USING ivfflat (description_embedding vector_cosine_ops)
WITH (lists = 100);

-- For 10000+ places
WITH (lists = 1000);
```

### Caching

The SentenceTransformer model is loaded once and cached. First query may be slower (~2-3 seconds), subsequent queries are fast (~50ms).

---

## 🐛 Troubleshooting

### Error: "relation does not have vector column"
**Solution:** Run the embedding generation script - it creates the column automatically.

### Error: "extension 'vector' does not exist"
**Solution:** 
1. Verify pgvector image: `docker-compose ps`
2. Manually enable: `docker-compose exec db psql -U postgres -d postgres -c "CREATE EXTENSION vector;"`

### Slow searches
**Solution:** Create the vector index (script does this automatically, but verify):
```sql
SELECT indexname FROM pg_indexes WHERE tablename='places';
```

### Import error: "No module named 'pgvector'"
**Solution:** Install in your environment: `pip install pgvector>=0.2.4`

---

## 📈 Next Steps

### 1. Update Frontend Search
Replace keyword search with semantic search in Places page

### 2. Integrate with Chatbot
Use semantic search in GPT responses to find relevant places

### 3. Add "Similar Places" Feature
Show similar attractions on place detail pages

### 4. A/B Testing
Compare semantic vs keyword search performance

### 5. User Analytics
Track which search type users prefer

---

## 🎉 Success Metrics

After integration, you should see:

- ✅ **Better search results** - "romantic dinner" finds restaurants with ambiance
- ✅ **Multilingual support** - Thai query finds English descriptions
- ✅ **Typo tolerance** - "ampawa" finds "Amphawa"
- ✅ **Intent matching** - "family activities" finds appropriate places
- ✅ **Similar places** - Recommends related attractions

---

## 📚 Resources

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Sentence Transformers](https://www.sbert.net/)
- [Vector Search Guide](https://www.postgresql.org/docs/current/indexes-types.html)

---

**Need help?** Check [backend/generate_embeddings.py](../backend/generate_embeddings.py) for implementation details.
