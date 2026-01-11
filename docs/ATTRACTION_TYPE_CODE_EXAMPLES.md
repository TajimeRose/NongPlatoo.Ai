# Code Examples: Testing Attraction Type Filtering

## Test Scenarios

### Scenario 1: User Asks for Main Tourist Attractions (Thai)

**Input**: `"สถานที่ท่องเที่ยวในสมุทรสงครามมีอะไรบ้าง"`

**Expected Flow**:
```python
# In chat.py - _match_travel_data()
query = "สถานที่ท่องเที่ยวในสมุทรสงครามมีอะไรบ้าง"

# Step 1: Detect main attractions intent
is_main = self._is_main_attractions_query(query)
# Result: True (contains "สถานที่ท่องเที่ยว")

# Step 2: Use main attractions search
if is_main:
    results = search_main_attractions("สมุทรสงคราม", limit=5)
else:
    results = search_places("สมุทรสงคราม", limit=5)

# SQL Executed:
# SELECT * FROM places 
# WHERE attraction_type = 'main_attraction' 
#   AND (name ILIKE '%สมุทรสงคราม%' OR ...)
# ORDER BY name ASC LIMIT 5

# Step 3: Add classification context
context = self._add_classification_context(results)
# Output:
# 📋 DATABASE CLASSIFICATION CONTEXT:
# These search results are already classified by the database system:
# 
# 🏛️ Main Tourist Attractions (5): วัดบางกุ้ง, อุทยานพระราม 2, คลองโคน, ...

# Step 4: Results passed to AI with context
# AI will NOT reclassify - system prompt forbids it
```

**Expected AI Response**:
```
สมุทรสงครามมีสถานที่ท่องเที่ยวหลักหลายแห่งค่ะ:

🏛️ วัดบางกุ้ง - วัดสุดมหัศจรรย์ที่ถูกรากไทรยักษ์โอบล้อม
🌲 อุทยานพระราม 2 - แหล่งมิรดกทางวัฒนธรรม
🛶 คลองโคน - พื้นที่อนุรักษ์ป่าชายเลนที่สวยงาม

เหล่านี้คือสถานที่ท่องเที่ยวหลักของจังหวัดค่ะ ลองมาเที่ยวดูนะ!
```

✅ **What's Correct**:
- Only main attractions returned
- No restaurants, cafes, or markets
- AI properly lists them as main attractions
- Clear and organized response

---

### Scenario 2: User Asks for Restaurants

**Input**: `"มีร้านอาหารอร่อยๆ บ้างไหม"`

**Expected Flow**:
```python
query = "มีร้านอาหารอร่อยๆ บ้างไหม"

# Step 1: Detect intent
is_main = self._is_main_attractions_query(query)
# Result: False (no "สถานที่ท่องเที่ยว" indicators)

# Step 2: Use regular search (all types)
results = search_places("อาหาร", limit=5)

# SQL Executed:
# SELECT * FROM places 
# WHERE (name ILIKE '%อาหาร%' OR category ILIKE '%อาหาร%' OR ...)
# ORDER BY name ASC LIMIT 5
# (NO attraction_type filter)

# Results now include:
# - {'name': 'ร้านอาหาร A', 'attraction_type': 'restaurant'}
# - {'name': 'ร้านอาหาร B', 'attraction_type': 'restaurant'}
# - {'name': 'ร้านอาหาร C', 'attraction_type': 'restaurant'}
```

**Expected AI Response**:
```
มีร้านอาหารอร่อยๆ หลายแห่งค่ะ:

🍽️ ร้านอาหาร A - บรรยากาศสวยๆ ริมน้ำ อาหารสดใหม่
🍽️ ร้านอาหาร B - เฉพาะอาหารท้องถิ่นสมุทรสงคราม
🍽️ ร้านอาหาร C - ปลาน้อยลูกชิ้น และ ก๋วยเตี้ยวเรือ

ที่ไหนนั้นอร่อยมากค่ะ ลองไปชิมสิ!
```

✅ **What's Correct**:
- Restaurants properly returned
- No need for main attraction filtering
- AI can recommend dining places

---

### Scenario 3: Empty Main Attractions Result

**Input**: `"มีวัดใหญ่ที่ชื่อว่า XYZ บ้างไหม"`

**Expected Flow**:
```python
query = "มีวัดใหญ่ที่ชื่อว่า XYZ"

# Step 1: Detect intent
is_main = self._is_main_attractions_query(query)
# Result: True (searching for significant attractions - "วัด" implies main)

# Step 2: Search main attractions
results = search_main_attractions("XYZ", limit=5)

# SQL Executed:
# SELECT * FROM places 
# WHERE attraction_type = 'main_attraction' 
#   AND (name ILIKE '%XYZ%' OR ...)
# ORDER BY name ASC LIMIT 5

# Result: [] (empty list - no main attractions named XYZ)

context = self._add_classification_context([])
# Output: "" (empty, no results)
```

**Expected AI Response**:
```
ขอโทษค่ะ ไม่พบสถานที่ท่องเที่ยวหลักที่ชื่อว่า XYZ ในสมุทรสงคราม

แต่สมุทรสงครามมีวัดสำคัญหลายแห่งน่ะค่ะ เช่น:
- วัดบางกุ้ง (โบสถ์รากไทร)
- วัดอื่นๆ ที่สวยและมีชื่อเสียง

อยากรู้เรื่องวัดไหนเหล่านี้ไหมค่ะ?
```

✅ **What's Correct**:
- Explicitly states no main attractions found
- Doesn't fall back to restaurants/cafes
- Proactively offers suggestions
- Maintains user experience

❌ **What Would Be Wrong**:
- Returning restaurants instead of stating "not found"
- Returning non-main attractions silently
- "Sorry, I don't know" without trying alternatives

---

### Scenario 4: Direct Service Layer Usage

```python
# Using database service directly
from backend.services.database import get_db_service

db_service = get_db_service()

# Get all main attractions
main_attractions = db_service.get_all_main_attractions(limit=10)
for place in main_attractions:
    print(f"🏛️ {place['name']} - {place['attraction_type']}")
# Output:
# 🏛️ วัดบางกุ้ง - main_attraction
# 🏛️ อุทยานพระราม 2 - main_attraction
# ...

# Search main attractions with keyword
search_results = db_service.search_main_attractions("วัด", limit=5)
# Only temples with attraction_type='main_attraction'

# Get attractions by specific type
restaurants = db_service.search_destinations("ร้านอาหาร", limit=10)
# All restaurants (non-specific to attraction_type)
```

---

### Scenario 5: Intent Detection Examples

```python
from backend.chat import TravelChatbot

bot = TravelChatbot()

# Test cases for _is_main_attractions_query()

# TRUE cases (should use search_main_attractions):
assert bot._is_main_attractions_query("สถานที่ท่องเที่ยวมีอะไร") == True
assert bot._is_main_attractions_query("ที่เที่ยวหลักในสมุทรสงคราม") == True
assert bot._is_main_attractions_query("main attractions") == True
assert bot._is_main_attractions_query("famous places") == True
assert bot._is_main_attractions_query("ที่เที่ยวสำคัญ") == True
assert bot._is_main_attractions_query("แหล่งท่องเที่ยว") == True

# FALSE cases (should use search_places with no filter):
assert bot._is_main_attractions_query("ร้านอาหารอร่อยๆ") == False
assert bot._is_main_attractions_query("มีคาเฟ่ไหม") == False
assert bot._is_main_attractions_query("ตลาดน้ำอัมพวา") == False
assert bot._is_main_attractions_query("activity tours") == False
assert bot._is_main_attractions_query("restaurants") == False
```

---

### Scenario 6: Context Builder Output

```python
from backend.chat import TravelChatbot

bot = TravelChatbot()

# Sample results with mixed types
results = [
    {'name': 'วัดบางกุ้ง', 'attraction_type': 'main_attraction'},
    {'name': 'ร้านอาหารไทย', 'attraction_type': 'restaurant'},
    {'name': 'ตลาดน้ำ', 'attraction_type': 'market'},
    {'name': 'อุทยานพระราม 2', 'attraction_type': 'main_attraction'},
    {'name': 'คาเฟ่กลางตลาด', 'attraction_type': 'cafe'},
]

context = bot._add_classification_context(results)
print(context)

# Output:
# 📋 DATABASE CLASSIFICATION CONTEXT:
# These search results are already classified by the database system:
# 
# 🏛️ Main Tourist Attractions (2): วัดบางกุ้ง, อุทยานพระราม 2
# 🍽️ Restaurants (1): ร้านอาหารไทย
# 🛍️ Markets (1): ตลาดน้ำ
# ☕ Cafes (1): คาเฟ่กลางตลาด
# 
# ⚠️ IMPORTANT: Use these database-provided classifications. Do NOT reclassify places yourself.
# The classifications are final and accurate.
```

---

### Scenario 7: Error Handling

```python
from backend.db import search_main_attractions, search_places

# Test 1: Database connection error
try:
    # If DB is down, functions return empty list
    results = search_main_attractions("keyword")
    if not results:
        # Tell user gracefully
        print("Unable to search attractions right now")
except Exception as e:
    print(f"Database error: {e}")

# Test 2: No results found
results = search_places("nonexistent_place_xyz_abc")
if not results:
    # Tell user explicitly
    print("No places found matching your search")

# Test 3: Empty query
results = search_places("", limit=5)
# May return empty or some results depending on SQL behavior
# Should handle gracefully in AI
```

---

### Scenario 8: Performance Testing

```python
import time
from backend.db import search_places, search_main_attractions

# Test main attraction search performance
start = time.time()
results = search_main_attractions("สมุทรสงคราม", limit=10)
elapsed = time.time() - start
print(f"search_main_attractions: {elapsed*1000:.2f}ms")
# Expected: < 100ms

# Test regular search performance
start = time.time()
results = search_places("สมุทรสงคราม", limit=10)
elapsed = time.time() - start
print(f"search_places: {elapsed*1000:.2f}ms")
# Expected: < 100ms

# Test get all main attractions
start = time.time()
results = get_attractions_by_type("main_attraction", limit=100)
elapsed = time.time() - start
print(f"get_attractions_by_type: {elapsed*1000:.2f}ms")
# Expected: < 200ms for 100 records
```

---

## Integration Checklist

- [ ] Verify database has `attraction_type` column populated
- [ ] Test `search_main_attractions()` returns only main attractions
- [ ] Test `search_places()` returns all types when no filter
- [ ] Test `_is_main_attractions_query()` with various queries
- [ ] Verify system prompt is loaded correctly
- [ ] Test AI responses for classification accuracy
- [ ] Monitor logs for any database errors
- [ ] Test with real user queries in development
- [ ] Verify no regressions in existing features

---

## Debugging Commands

```python
# Quick debug in Python shell
python
>>> from backend.db import search_main_attractions, search_places, get_attractions_by_type

# Check main attractions
>>> results = search_main_attractions("สมุทรสงคราม")
>>> [r.get('attraction_type') for r in results]
['main_attraction', 'main_attraction', 'main_attraction']  # ✅ All main

# Check mixed results
>>> results = search_places("สมุทรสงคราม", limit=10)
>>> set([r.get('attraction_type') for r in results])
{'main_attraction', 'restaurant', 'cafe', 'market'}  # ✅ All types

# Check specific type
>>> results = get_attractions_by_type("restaurant", limit=5)
>>> [r.get('name') for r in results]
['ร้านอาหาร A', 'ร้านอาหาร B', ...]

# Check intent detection
>>> from backend.chat import TravelChatbot
>>> bot = TravelChatbot()
>>> bot._is_main_attractions_query("สถานที่ท่องเที่ยว")
True
>>> bot._is_main_attractions_query("ร้านอาหาร")
False
```

---

## Expected Behavior Summary

| Query Type | Function Used | Filter Applied | Result Type | Example Output |
|-----------|---------------|-----------------|------------|-----------------|
| Main attractions (Thai) | `search_main_attractions` | `attraction_type='main_attraction'` | Temples, parks, monuments | วัดบางกุ้ง, อุทยานพระราม 2 |
| Main attractions (English) | `search_main_attractions` | `attraction_type='main_attraction'` | Temples, parks, monuments | Bang Kung Temple, King Rama II Park |
| Restaurants | `search_places` | None | Restaurants, cafes, all types | ร้านอาหารไทย, คาเฟ่ |
| Markets | `search_places` | None | Markets, all types | ตลาดน้ำ, ตลาดสด |
| Activities | `search_places` | None | Activities, all types | ทัวร์ชมหิ่งห้อย, ดำน้ำ |
| Browse restaurants | `get_attractions_by_type` | `attraction_type='restaurant'` | Only restaurants | ร้านอาหารทั้งหมด |
| Browse markets | `get_attractions_by_type` | `attraction_type='market'` | Only markets | ตลาดทั้งหมด |

All filtering is **SQL-level** (WHERE clause), not Python-level post-filtering.
