"""Create the message_feedback table in the database.

Note: The table will be created automatically when you run app.py
because init_db() is called on startup.

You can also run this script directly to create the table manually.
"""

import sys
import os

# Ensure backend is in path
current_dir = os.path.dirname(__file__)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from db import init_db, MessageFeedback

def create_feedback_table():
    """Create all database tables including message_feedback."""
    try:
        print("Creating database tables...")
        init_db()
        
        print("✅ Successfully created all tables!")
        print(f"   New table: {MessageFeedback.__tablename__}")
        print(f"   Columns: {', '.join([col.name for col in MessageFeedback.__table__.columns])}")
        print("\nThe message_feedback table is now ready to store user feedback.")
        
    except Exception as e:
        print(f"❌ Error creating table: {e}")
        print("\nNote: If you're having connection issues, the table will be")
        print("created automatically when you start the Flask app (app.py).")
        raise

if __name__ == "__main__":
    create_feedback_table()
