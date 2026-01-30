"""
Script to create the news table in the database.
Run this to initialize the news table schema.
"""
import sys
import os

# Add backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db import init_db, engine, News

def create_news_table():
    """Create the news table if it doesn't exist."""
    try:
        # Initialize database connection
        init_db()
        
        # Create the news table
        News.__table__.create(engine, checkfirst=True)
        
        print("✅ News table created successfully!")
        print(f"Table: {News.__tablename__}")
        print(f"Columns: {', '.join([c.name for c in News.__table__.columns])}")
        
    except Exception as e:
        print(f"❌ Error creating news table: {e}")
        raise

if __name__ == "__main__":
    create_news_table()
