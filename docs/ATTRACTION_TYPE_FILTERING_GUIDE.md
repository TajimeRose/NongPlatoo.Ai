# Attraction Type Filtering Implementation Guide

## Overview

This document describes the improved AI system that uses the `attraction_type` column in PostgreSQL to classify and filter tourist places correctly. The system now respects database-level classifications and prevents the AI from reclassifying places.

## Rules & Classification

### Attraction Types

The database defines the following classification categories:

- **`main_attraction`**: Primary tourist attractions / landmarks (temples, parks, nature reserves, museums, monuments, etc.)
- **`secondary_attraction`**: Secondary tourist places with lower prominence
- **`market`**: Shopping markets (floating markets, morning markets, traditional markets)
- **`activity`**: Activities and experiences (tours, water sports, guided activities)
- **`restaurant`**: Dining establishments
- **`cafe`**: Coffee shops and cafes
- **Custom types**: Other specialized classifications as needed

### Key Requirements

1. **SQL-Level Filtering**: All place type filtering is done at the database level, NOT in Python/AI logic
2. **No AI Reclassification**: The AI WILL NOT attempt to change, modify, or reclassify places
3. **Database Authority**: The `attraction_type` value in the database is the FINAL classification
4. **Explicit Results**: If no matches exist for a requested type, explicitly state "No [type] attractions found"
5. **Language Support**: Thai queries like "สถานที่ท่องเที่ยว" or "ที่เที่ยวหลัก" should filter for `main_attraction` only

## Implementation Details

### Database Layer (`backend/db.py`)

#### New Functions

**`search_places(keyword: str, limit: int = 10, attraction_type: str | None = None)`**
- Enhanced version of the original search function
- Now accepts optional `attraction_type` parameter for SQL-level filtering
- If `attraction_type` is provided, ONLY returns places matching that exact type
- Filtering happens in SQL WHERE clause: `WHERE attraction_type = 'main_attraction'`

**`search_main_attractions(keyword: str, limit: int = 10)`**
- Convenience function specifically for primary attractions
- Calls `search_places(keyword, limit=limit, attraction_type="main_attraction")`
- Used when user asks for "สถานที่ท่องเที่ยว" or "ที่เที่ยวหลัก"
- Returns ONLY places where `attraction_type = 'main_attraction'`

**`get_attractions_by_type(attraction_type: str, limit: int = 100)`**
- Retrieve ALL places of a specific attraction_type
- Useful for browsing (e.g., "show all markets" or "list all restaurants")
- Database-level filtering only

### Chat Layer (`backend/chat.py`)

#### Intent Detection

**`_is_main_attractions_query(query: str) -> bool`**
- Detects if user is asking for PRIMARY/MAIN attractions
- Checks for Thai indicators: "สถานที่ท่องเที่ยว", "ที่เที่ยวหลัก", "แหล่งท่องเที่ยว", etc.
- Checks for English indicators: "main attractions", "primary attractions", "major attractions", etc.
- Returns `True` if query should filter by `main_attraction` type

**Impact on `_match_travel_data()`**
- When `_is_main_attractions_query()` returns `True`:
  - Primary search: `search_main_attractions(query, limit=limit_value)`
  - Secondary keyword searches: `search_main_attractions(kw, limit=2)`
- When `False`:
  - Uses regular `search_places(query, limit=limit_value)` (all types)

#### Classification Context Builder

**`_add_classification_context(results: List[Dict[str, Any]]) -> str`**
- Builds a context string explaining database classifications
- Shows emojis and counts for each type in results
- Includes instruction: "Use these database-provided classifications. Do NOT reclassify places yourself."
- Can be included in system prompt or user message to reinforce rules

### Service Layer (`backend/services/database.py`)

#### New Methods

**`search_main_attractions(query: str, limit: int = 5)`**
- Service-layer implementation for searching main attractions
- SQL-level filtering: `WHERE attraction_type = 'main_attraction'`
- Used by PostgreSQL chatbot service

**`get_all_main_attractions(limit: int = 100)`**
- Retrieve all places classified as main attractions
- No keyword filtering, just browse by type

### AI System Prompt (`backend/services/chatbot_postgres.py`)

Enhanced system prompt includes critical instructions:

```
กฎพิเศษ - IMPORTANT RULES ABOUT PLACE CLASSIFICATION:
- ข้อมูลสถานที่ในระบบได้จัดหมวดหมู่เรียบร้อยแล้ว (attraction_type ในฐานข้อมูล)
- ห้ามเปลี่ยนแปลงการจัดหมวดหมู่ของสถานที่จากที่ระบบกำหนด
- ถ้าถามหา "สถานที่ท่องเที่ยว" หรือ "ที่เที่ยวหลัก" ให้ใช้เฉพาะสถานที่ที่ระบบจัดเป็น "main_attraction"
- ห้ามรวมร้านอาหาร/คาเฟ่/ชุมชน เว้นแต่ผู้ใช้ถามอย่างชัดเจน
- ถ้าไม่เจอ "main attractions" ให้บอกตรงว่า "ไม่พบสถานที่ท่องเที่ยวหลักที่ตรงกับการค้นหาของคุณ"
```

## Usage Examples

### Example 1: Searching for Main Attractions (Thai)

**User**: "สถานที่ท่องเที่ยวในสมุทรสงครามมีอะไรบ้าง?"

**Process**:
1. Query is passed to `_is_main_attractions_query()` → returns `True` (contains "สถานที่ท่องเที่ยว")
2. `_match_travel_data()` calls `search_main_attractions("สมุทรสงคราม", limit=5)`
3. SQL executes: `SELECT * FROM places WHERE attraction_type = 'main_attraction' AND ...`
4. Only main attractions are returned (NOT restaurants, cafes, markets unless they're classified as main)
5. AI receives classification context from `_add_classification_context()`
6. AI responds with ONLY main attractions

**Expected Response**: Lists only temples, parks, nature reserves, museums, monuments (typical main_attraction types)

### Example 2: Searching All Places

**User**: "มีร้านอาหารในสมุทรสงคราม?"

**Process**:
1. Query is NOT a main_attractions_query (no "สถานที่ท่องเที่ยว" indicator)
2. `_match_travel_data()` calls `search_places("ร้านอาหาร", limit=5)`
3. SQL executes: `SELECT * FROM places WHERE ... (no attraction_type filter)`
4. Results include all types (restaurants, cafes, main attractions, etc.)
5. AI can see restaurants/cafes in results and responds appropriately

### Example 3: Empty Main Attractions Result

**User**: "มีวัดใหญ่ๆ หรือไม่?"

**Process**:
1. Query detected as main_attractions_query (searching for significant attractions)
2. `search_main_attractions("วัด")` returns empty list
3. `_add_classification_context([])` returns empty context
4. AI SHOULD explicitly respond: "ไม่พบสถานที่ท่องเที่ยวหลักที่ตรงกับการค้นหาของคุณ"

### Example 4: Retrieving Restaurants (Different Type)

**User**: "แนะนำร้านอาหารอร่อยๆ"

**Process**:
1. Query is NOT for main_attractions_query (looking for restaurants, not "สถานที่ท่องเที่ยว")
2. `search_places("อร่อย")` returns places including those with `attraction_type = 'restaurant'`
3. Results properly include restaurants from database
4. AI can recommend restaurants appropriately

## Important Notes

### What Changed vs. What Stayed the Same

**Changed**:
- ✅ `search_places()` now accepts `attraction_type` parameter
- ✅ New `search_main_attractions()` function for primary attractions
- ✅ `_match_travel_data()` now detects and handles main attraction queries
- ✅ System prompt includes strict rules about classification authority
- ✅ Added `_is_main_attractions_query()` to detect intent

**Stayed the Same**:
- ✅ Database schema (column already exists)
- ✅ Place.to_dict() model conversion
- ✅ General search behavior for non-typed queries

### SQL-Level Guarantees

The filtering MUST happen at SQL WHERE clause level:

```python
# CORRECT - Filtering at SQL level
select(Place).where(Place.attraction_type == 'main_attraction')

# WRONG - Filtering in Python (this is NOT done)
# results = [p for p in all_places if p.attraction_type == 'main_attraction']
```

This ensures:
1. Only needed data is retrieved from database
2. AI cannot modify the filter
3. Performance is optimized
4. Clear audit trail of filtering

### Testing the Implementation

**Test Case 1: Main Attractions Only**
```python
from backend.db import search_main_attractions

results = search_main_attractions("สมุทรสงคราม", limit=10)
# Verify: All results have attraction_type == 'main_attraction'
# Verify: No restaurants, cafes, or markets included
```

**Test Case 2: All Attractions**
```python
from backend.db import search_places

results = search_places("สมุทรสงคราม", limit=10)
# Verify: Results include multiple attraction_type values
# Verify: May include restaurants, cafes, main attractions, etc.
```

**Test Case 3: Specific Type**
```python
from backend.db import get_attractions_by_type

restaurants = get_attractions_by_type("restaurant", limit=10)
# Verify: All results have attraction_type == 'restaurant'
```

## Troubleshooting

### Issue: AI is including restaurants when asking for main attractions

**Solution**: 
1. Check that `_is_main_attractions_query()` is detecting the query correctly
2. Verify SQL query uses `attraction_type == 'main_attraction'` (not ILIKE)
3. Check database to ensure restaurants have `attraction_type = 'restaurant'`, not 'main_attraction'
4. Add system prompt reminder to AI response context

### Issue: Searches returning no results when there should be some

**Solution**:
1. Check database `attraction_type` values match the query intent
2. Verify keyword matching still works (filtering should apply AFTER keyword match)
3. Run SQL query directly to verify data exists

### Issue: Performance degradation

**Solution**:
1. Ensure indices exist on `attraction_type` and text columns
2. Verify `limit` parameter is reasonable (default 10-100)
3. Check that `search_main_attractions()` is more efficient than keyword filters alone

## Future Enhancements

1. **Multi-language Intent Detection**: Extend `_is_main_attractions_query()` for more languages
2. **Custom Classification Schemes**: Allow different filtering logic based on user preferences
3. **Analytics**: Track which attraction types are most searched for
4. **Confidence Scores**: Add confidence level for classification predictions
5. **User Feedback**: Let users correct classifications to improve system

## Related Files

- [backend/db.py](../backend/db.py) - Database models and search functions
- [backend/chat.py](../backend/chat.py) - Chatbot with intent detection
- [backend/services/database.py](../backend/services/database.py) - Database service layer
- [backend/services/chatbot_postgres.py](../backend/services/chatbot_postgres.py) - PostgreSQL chatbot with system prompts
