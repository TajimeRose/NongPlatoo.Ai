"""
Generate embeddings for all places in the database using sentence-transformers.
Run this script once after adding the pgvector extension and vector column.

Usage:
    python -m backend.generate_embeddings
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir.parent))

from backend.db import get_session_factory, Place, get_engine
from sqlalchemy import text

try:
    from sentence_transformers import SentenceTransformer
    print("✓ sentence-transformers loaded")
except ImportError:
    print("ERROR: sentence-transformers not installed")
    print("Install with: pip install sentence-transformers")
    sys.exit(1)


def enable_pgvector_extension():
    """Enable the pgvector extension in PostgreSQL"""
    engine = get_engine()
    with engine.connect() as conn:
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
            print("✓ pgvector extension enabled")
        except Exception as e:
            print(f"⚠ Could not enable pgvector extension: {e}")
            print("  You may need to run this manually as a superuser:")
            print("  CREATE EXTENSION IF NOT EXISTS vector;")


def add_vector_column_if_not_exists():
    """Add the description_embedding column if it doesn't exist"""
    engine = get_engine()
    with engine.connect() as conn:
        try:
            # Check if column exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='places' AND column_name='description_embedding'
            """))
            
            if result.fetchone() is None:
                # Column doesn't exist, add it
                conn.execute(text("ALTER TABLE places ADD COLUMN description_embedding vector(384)"))
                conn.commit()
                print("✓ Added description_embedding column")
            else:
                print("✓ description_embedding column already exists")
        except Exception as e:
            print(f"⚠ Could not add vector column: {e}")
            raise


def create_vector_index():
    """Create an index on the vector column for faster searches"""
    engine = get_engine()
    with engine.connect() as conn:
        try:
            # Check if index exists
            result = conn.execute(text("""
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename='places' AND indexname='places_embedding_idx'
            """))
            
            if result.fetchone() is None:
                print("Creating vector index (this may take a moment)...")
                conn.execute(text("""
                    CREATE INDEX places_embedding_idx 
                    ON places 
                    USING ivfflat (description_embedding vector_cosine_ops)
                    WITH (lists = 100)
                """))
                conn.commit()
                print("✓ Vector index created")
            else:
                print("✓ Vector index already exists")
        except Exception as e:
            print(f"⚠ Could not create index (you can create it later): {e}")


def generate_embeddings(force_regenerate=False):
    """
    Generate embeddings for all places.
    
    Args:
        force_regenerate: If True, regenerate embeddings for ALL places (even those with existing embeddings)
    """
    print("\n🚀 Starting embedding generation...\n")
    
    if force_regenerate:
        print("⚠️  FORCE MODE: Will regenerate ALL embeddings\n")
    
    # Load the model
    print("Loading sentence-transformers model...")
    model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
    print("✓ Model loaded\n")
    
    # Get database session
    Session = get_session_factory()
    session = Session()
    
    try:
        # Fetch all places
        places = session.query(Place).all()
        total = len(places)
        
        if total == 0:
            print("No places found in database!")
            return
        
        print(f"Found {total} places to process\n")
        
        # Generate embeddings
        updated_count = 0
        skipped_count = 0
        
        for idx, place in enumerate(places, 1):
            # Skip if already has embedding (unless force mode)
            if not force_regenerate and place.description_embedding is not None:
                print(f"[{idx}/{total}] ⏭  Skipping '{place.name}' (already has embedding)")
                skipped_count += 1
                continue
            
            # Build comprehensive text including ALL relevant fields for better search
            text_parts = []
            
            # Core information
            if place.name:
                text_parts.append(f"Name: {place.name}")
            if place.description:
                text_parts.append(f"Description: {place.description}")
            
            # Type and category information
            if place.category:
                text_parts.append(f"Category: {place.category}")
            if place.attraction_type:
                text_parts.append(f"Type: {place.attraction_type}")
            
            # Location details
            if place.address:
                text_parts.append(f"Location: {place.address}")
            
            # Operational information
            if place.opening_hours:
                text_parts.append(f"Hours: {place.opening_hours}")
            if place.price_range:
                text_parts.append(f"Price: {place.price_range}")
            
            # Combine all parts
            text_to_embed = " | ".join(text_parts).strip()
            
            if not text_to_embed or text_to_embed == "":
                print(f"[{idx}/{total}] ⚠  Skipping '{place.name or 'Unknown'}' (no text content)")
                skipped_count += 1
                continue
            
            # Generate embedding
            embedding = model.encode(text_to_embed)
            place.description_embedding = embedding.tolist()
            
            print(f"[{idx}/{total}] ✓ Generated embedding for '{place.name}'")
            updated_count += 1
            
            # Commit in batches of 10
            if idx % 10 == 0:
                session.commit()
                print(f"  💾 Saved batch (updated: {updated_count}, skipped: {skipped_count})\n")
        
        # Final commit
        session.commit()
        
        print("\n" + "="*60)
        print(f"✅ Embedding generation complete!")
        print(f"   Total places: {total}")
        print(f"   Updated: {updated_count}")
        print(f"   Skipped: {skipped_count}")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def main():
    """Main execution"""
    import sys
    
    # Check for --force flag to regenerate all embeddings
    force_regenerate = '--force' in sys.argv or '--regenerate' in sys.argv
    
    print("="*60)
    print("  pgvector Embedding Generation for Places")
    if force_regenerate:
        print("  🔄 FORCE MODE: Regenerating ALL embeddings")
    print("="*60 + "\n")
    
    try:
        # Step 1: Enable pgvector
        enable_pgvector_extension()
        
        # Step 2: Add vector column
        add_vector_column_if_not_exists()
        
        # Step 3: Generate embeddings (with force flag if specified)
        generate_embeddings(force_regenerate=force_regenerate)
        
        # Step 4: Create index
        create_vector_index()
        
        print("\n🎉 All done! Your places now have ENHANCED vector embeddings.")
        print("   Embeddings now include: name, description, category, type,")
        print("   location, opening hours, and price range.")
        print("   You can now use semantic search in your API.\n")
        
    except Exception as e:
        print(f"\n❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
