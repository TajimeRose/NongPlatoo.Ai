# Quick Reference: Using Attraction Type Filtering

## For Chatbot Developers

### Import Statements
```python
from backend.db import search_places, search_main_attractions, get_attractions_by_type
from backend.services.database import get_db_service

db_service = get_db_service()
```

### Common Usage Patterns

#### 1. Search with Type Filter (Main Attractions Only)
```python
# When user asks for "สถานที่ท่องเที่ยว" or "ที่เที่ยวหลัก"
results = search_main_attractions("keyword", limit=5)
# Returns: List[Dict] where ALL items have attraction_type='main_attraction'
```

#### 2. Search All Types (No Filter)
```python
# When user asks for restaurants, activities, or general places
results = search_places("keyword", limit=10)
# Returns: List[Dict] with mixed attraction_type values
```

#### 3. Get All Places of Specific Type
```python
# To browse all restaurants, markets, or cafes
results = get_attractions_by_type("restaurant", limit=20)
# or
results = db_service.get_all_main_attractions(limit=10)
```

#### 4. Check if Query is for Main Attractions
```python
# In chat.py
is_main = self._is_main_attractions_query(user_query)
if is_main:
    results = search_main_attractions(user_query)
else:
    results = search_places(user_query)
```

### Intent Detection Keywords

**Main Attractions Queries** (detected by `_is_main_attractions_query()`):
- Thai: สถานที่ท่องเที่ยว, ที่เที่ยวหลัก, ที่เที่ยวสำคัญ, แหล่งท่องเที่ยว, จุดท่องเที่ยว, มีชื่อเสียง
- English: main attractions, primary attractions, major attractions, top attractions, famous places, landmark

**Other Type Queries** (use regular search):
- "ร้านอาหาร" (restaurants)
- "คาเฟ่" (cafes)
- "ตลาด" (markets)
- "กิจกรรม" (activities)

## Database Schema

```sql
CREATE TABLE places (
    id SERIAL PRIMARY KEY,
    place_id VARCHAR,
    name VARCHAR,
    category VARCHAR,
    description TEXT,
    address TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    opening_hours TEXT,
    price_range TEXT,
    image_urls TEXT,
    attraction_type VARCHAR  -- <-- THE CLASSIFICATION COLUMN
);
```

### Valid `attraction_type` Values
- `main_attraction` - Primary tourist spots
- `secondary_attraction` - Secondary spots
- `market` - Shopping markets
- `restaurant` - Dining places
- `cafe` - Coffee shops
- `activity` - Activities & tours
- (or other custom classifications)

## System Prompt Rules

The AI is instructed to:
1. **Never reclassify** places from their database type
2. **Only use** database-provided classifications
3. **Filter to main attractions** when user asks for "สถานที่ท่องเที่ยว"
4. **Exclude** restaurants/cafes from main attractions unless explicitly requested
5. **Explicitly state** "No main attractions found" if search returns no results

## Error Handling

```python
# All functions return empty list [] if:
# - Database connection fails
# - No matches found
# - SQL error occurs

results = search_main_attractions("keyword")
if not results:
    # Tell user: "ไม่พบสถานที่ท่องเที่ยวหลักที่ตรงกับการค้นหาของคุณ"
    pass
```

## Performance Notes

- ✅ Filtering happens at SQL WHERE clause (efficient)
- ✅ Index on `attraction_type` recommended
- ✅ Typical query time: < 100ms
- ⚠️ Avoid very large `limit` values (default 5-10)

## Testing

```bash
# Test in Python shell
python
>>> from backend.db import search_main_attractions, search_places
>>> search_main_attractions("สมุทรสงคราม")
[{'id': '1', 'name': '...', 'attraction_type': 'main_attraction'}, ...]
>>> search_places("ร้านอาหาร")
[{'attraction_type': 'restaurant'}, {'attraction_type': 'cafe'}, ...]
```

## Key Principles

| Principle | Implementation |
|-----------|-----------------|
| 🏛️ **SQL-Level Filtering** | `WHERE attraction_type = 'main_attraction'` in query |
| 🚫 **No AI Reclassification** | System prompt explicitly forbids it |
| 📊 **Database Authority** | Classification values are immutable from AI perspective |
| 🔍 **Intent Detection** | `_is_main_attractions_query()` determines filter type |
| 📝 **Clear Communication** | AI explicitly states which attractions were returned |
| ⚡ **Performance First** | Filtering at database level for efficiency |

