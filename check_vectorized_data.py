"""Check what tables and data the AI currently has access to"""
import sys
sys.path.insert(0, 'C:/Users/Tuchtuntan/Desktop/World.Journey.Ai')

from backend.db import Place, MessageFeedback, UserActivityLog, ChatLog, LocationCache, Base
from sqlalchemy import inspect

print('\n' + '='*70)
print('DATABASE TABLES IN YOUR SYSTEM')
print('='*70)

for table_name in Base.metadata.tables.keys():
    print(f'  📊 {table_name}')

print('\n' + '='*70)
print('PLACES TABLE - WHAT GETS VECTORIZED')
print('='*70)

for col in inspect(Place).columns:
    if 'embedding' in col.name:
        print(f'  🔍 {col.name}: {col.type} ← VECTORIZED')
    else:
        print(f'     {col.name}: {col.type}')

print('\n' + '='*70)
print('WHAT THE VECTOR SEARCH READS')
print('='*70)
print("""
Currently vectorized: name + description
  └─ Vector dimension: 384
  └─ Model: paraphrase-multilingual-MiniLM-L12-v2
  └─ Storage: description_embedding column

The embedding combines:
  1. place.name (e.g., "Amphawa Floating Market")
  2. place.description (full text description)

Other fields are NOT vectorized but ARE returned to GPT:
  - category, address, opening_hours, price_range
  - latitude, longitude, image_url
  - attraction_type
""")

print('='*70)
print('OTHER TABLES (NOT VECTORIZED)')
print('='*70)
print("""
❌ message_feedback - User feedback data
❌ user_activity_log - Activity tracking
❌ chat_log - Chat history
❌ location_cache - Geocoding cache

These tables are NOT searched by vector.
The AI only gets Place data.
""")

print('='*70)
