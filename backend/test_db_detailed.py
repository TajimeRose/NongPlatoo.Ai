#!/usr/bin/env python3
"""
Comprehensive database connection test with detailed logging.
This script helps diagnose database connection issues in both local and Coolify environments.

Run with: python test_db_detailed.py
"""

import os
import sys
import logging
from datetime import datetime

# Setup logging to console and file
log_file = os.path.join(os.path.dirname(__file__), 'db_check.log')
logging.basicConfig(
    level=logging.DEBUG,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def log_section(title):
    """Log a section header"""
    logger.info("=" * 70)
    logger.info(f"  {title}")
    logger.info("=" * 70)

def test_env_loading():
    """Test environment variable loading"""
    log_section("STEP 1: Environment Variables Loading")
    
    try:
        from dotenv import load_dotenv
        
        # Check .env file exists
        env_path = os.path.join(os.path.dirname(__file__), '.env')
        if os.path.exists(env_path):
            logger.info(f"✓ .env file found at: {env_path}")
            logger.info(f"  File size: {os.path.getsize(env_path)} bytes")
            
            # Load it
            load_dotenv(env_path)
            logger.info("✓ .env file loaded successfully")
        else:
            logger.warning(f"✗ .env file NOT found at: {env_path}")
        
        # Check environment variables
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            # Hide password in logs for security
            masked_url = db_url.split('@')[0] + '@****:****@' + db_url.split('@')[1]
            logger.info(f"✓ DATABASE_URL is set: {masked_url}")
            logger.debug(f"  Full URL: {db_url}")
        else:
            logger.error("✗ DATABASE_URL environment variable is NOT set")
            return False
        
        # Check other postgres vars
        postgres_vars = {
            'POSTGRES_HOST': os.getenv('POSTGRES_HOST'),
            'POSTGRES_PORT': os.getenv('POSTGRES_PORT'),
            'POSTGRES_DB': os.getenv('POSTGRES_DB'),
            'POSTGRES_USER': os.getenv('POSTGRES_USER'),
        }
        
        for var_name, var_value in postgres_vars.items():
            if var_value:
                logger.info(f"✓ {var_name}: {var_value}")
            else:
                logger.debug(f"  {var_name}: (not set)")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Error checking environment variables: {e}", exc_info=True)
        return False

def test_url_parsing():
    """Test database URL parsing"""
    log_section("STEP 2: Database URL Parsing")
    
    try:
        from db import get_db_url
        
        url = get_db_url()
        if url:
            # Hide password for security
            masked_url = url.split('@')[0] + '@****:****@' + url.split('@')[1] if '@' in url else url
            logger.info(f"✓ URL parsed successfully: {masked_url}")
            logger.debug(f"  Full URL: {url}")
            
            # Check URL format
            if url.startswith('postgresql://'):
                logger.info("✓ URL format is correct (postgresql://)")
            else:
                logger.error(f"✗ URL format incorrect. Expected 'postgresql://', got: {url[:30]}")
                return False
            
            return True
        else:
            logger.error("✗ get_db_url() returned empty string")
            return False
            
    except Exception as e:
        logger.error(f"✗ Error parsing URL: {e}", exc_info=True)
        return False

def test_sqlalchemy_engine():
    """Test SQLAlchemy engine creation"""
    log_section("STEP 3: SQLAlchemy Engine Creation")
    
    try:
        from db import get_engine
        
        logger.info("Creating SQLAlchemy engine...")
        engine = get_engine()
        
        logger.info(f"✓ Engine created successfully")
        logger.info(f"  Engine URL: {engine.url}")
        logger.info(f"  Pool size: {engine.pool.size}")
        logger.info(f"  Max overflow: {engine.pool.max_overflow}")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Error creating engine: {e}", exc_info=True)
        return False

def test_database_connection():
    """Test actual database connection"""
    log_section("STEP 4: Database Connection Test")
    
    try:
        from db import get_engine
        
        logger.info("Attempting to connect to database...")
        engine = get_engine()
        
        with engine.connect() as conn:
            logger.info("✓ Connection established!")
            
            # Simple query to test connection
            result = conn.execute("SELECT 1 as test")
            row = result.fetchone()
            logger.info(f"✓ Test query successful: {dict(row._mapping) if row else 'No result'}")
            
        return True
        
    except Exception as e:
        logger.error(f"✗ Database connection failed: {e}", exc_info=True)
        logger.error("Common causes:")
        logger.error("  - Database server is down")
        logger.error("  - Network connectivity issue (firewall, IP whitelist)")
        logger.error("  - Invalid credentials in DATABASE_URL")
        logger.error("  - Database doesn't exist")
        return False

def test_tables_exist():
    """Test if required tables exist"""
    log_section("STEP 5: Database Tables Check")
    
    try:
        from sqlalchemy import inspect
        from db import get_engine
        
        logger.info("Checking for required tables...")
        engine = get_engine()
        inspector = inspect(engine)
        
        tables = inspector.get_table_names()
        logger.info(f"✓ Found {len(tables)} tables in database")
        for table in tables:
            logger.info(f"  - {table}")
        
        # Check for our specific tables
        required_tables = ['places', 'tourist_places', 'message_feedback']
        missing = [t for t in required_tables if t not in tables]
        
        if missing:
            logger.warning(f"✗ Missing tables: {', '.join(missing)}")
            if 'message_feedback' in missing:
                logger.info("  Run: python create_feedback_table.py")
        else:
            logger.info("✓ All required tables exist")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Error checking tables: {e}", exc_info=True)
        return False

def test_message_feedback_table():
    """Test message_feedback table specifically"""
    log_section("STEP 6: Message Feedback Table Details")
    
    try:
        from sqlalchemy import inspect
        from db import get_engine, MessageFeedback
        
        engine = get_engine()
        inspector = inspect(engine)
        
        if 'message_feedback' not in inspector.get_table_names():
            logger.warning("✗ message_feedback table does not exist")
            logger.info("  Creating it now...")
            from db import init_db
            init_db()
            logger.info("✓ Table created")
        else:
            logger.info("✓ message_feedback table exists")
        
        # Get column info
        columns = inspector.get_columns('message_feedback')
        logger.info(f"  Columns ({len(columns)}):")
        for col in columns:
            col_type = str(col['type'])
            nullable = "nullable" if col['nullable'] else "NOT NULL"
            logger.info(f"    - {col['name']}: {col_type} ({nullable})")
        
        # Count rows
        session_factory = __import__('db').get_session_factory()
        session = session_factory()
        try:
            count = session.query(MessageFeedback).count()
            logger.info(f"  Current rows: {count}")
        finally:
            session.close()
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Error checking message_feedback table: {e}", exc_info=True)
        return False

def test_insert_test_data():
    """Test inserting and reading test data"""
    log_section("STEP 7: Insert/Read Test Data")
    
    try:
        from db import get_session_factory, MessageFeedback
        import uuid
        
        session_factory = get_session_factory()
        session = session_factory()
        
        try:
            # Create test record
            test_id = f"test_{uuid.uuid4().hex[:8]}"
            logger.info(f"Inserting test record with ID: {test_id}")
            
            test_feedback = MessageFeedback(
                message_id=test_id,
                user_id="test_user",
                user_message="Test question?",
                ai_response="Test response.",
                feedback_type="like",
                intent="test",
                source="test"
            )
            
            session.add(test_feedback)
            session.commit()
            logger.info("✓ Test record inserted successfully")
            
            # Read it back
            retrieved = session.query(MessageFeedback).filter_by(message_id=test_id).first()
            if retrieved:
                logger.info(f"✓ Test record retrieved: {retrieved.to_dict()}")
            else:
                logger.error("✗ Could not retrieve test record")
                return False
            
            # Clean up
            session.delete(retrieved)
            session.commit()
            logger.info("✓ Test record cleaned up")
            
            return True
            
        finally:
            session.close()
            
    except Exception as e:
        logger.error(f"✗ Error with test data: {e}", exc_info=True)
        return False

def main():
    """Run all tests"""
    logger.info(f"Database Check Started at {datetime.now()}")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"Python: {sys.version}")
    logger.info(f"Working directory: {os.getcwd()}")
    
    tests = [
        ("Environment Loading", test_env_loading),
        ("URL Parsing", test_url_parsing),
        ("SQLAlchemy Engine", test_sqlalchemy_engine),
        ("Database Connection", test_database_connection),
        ("Tables Existence", test_tables_exist),
        ("Message Feedback Table", test_message_feedback_table),
        ("Insert/Read Test", test_insert_test_data),
    ]
    
    results = {}
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            logger.error(f"Unhandled exception in {test_name}: {e}", exc_info=True)
            results[test_name] = False
    
    # Summary
    log_section("TEST SUMMARY")
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        logger.info(f"{status}: {test_name}")
    
    logger.info("=" * 70)
    logger.info(f"Results: {passed}/{total} tests passed")
    logger.info("=" * 70)
    
    if all(results.values()):
        logger.info("✓ All tests passed! Database connection is working.")
        logger.info(f"Log file saved to: {log_file}")
        return 0
    else:
        logger.error("✗ Some tests failed. Check the log above for details.")
        logger.error(f"Log file saved to: {log_file}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
