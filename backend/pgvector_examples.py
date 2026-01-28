"""
Examples of using pgvector semantic search in World.Journey.Ai

Run these examples after setting up pgvector and generating embeddings.
"""

from backend.db import (
    search_places_semantic,
    search_places_hybrid,
    find_similar_places,
    search_places
)


def example_1_basic_semantic_search():
    """Example 1: Basic semantic search"""
    print("\n" + "="*60)
    print("Example 1: Basic Semantic Search")
    print("="*60)
    
    # Search in Thai
    print("\n🔍 Searching: 'ตลาดน้ำที่มีชื่อเสียง' (famous floating market)")
    results = search_places_semantic("ตลาดน้ำที่มีชื่อเสียง", limit=3)
    
    for idx, place in enumerate(results, 1):
        score = place.get('similarity_score', 0)
        print(f"\n{idx}. {place['name']}")
        print(f"   Similarity: {score:.3f}")
        print(f"   Description: {place['description'][:100]}...")
    
    # Search in English
    print("\n\n🔍 Searching: 'romantic sunset dinner'")
    results = search_places_semantic("romantic sunset dinner", limit=3)
    
    for idx, place in enumerate(results, 1):
        score = place.get('similarity_score', 0)
        print(f"\n{idx}. {place['name']}")
        print(f"   Similarity: {score:.3f}")
        print(f"   Category: {place.get('category', 'N/A')}")


def example_2_filtered_search():
    """Example 2: Semantic search with filters"""
    print("\n" + "="*60)
    print("Example 2: Filtered Semantic Search")
    print("="*60)
    
    # Search for cafes in a specific district
    print("\n🔍 Searching: 'cozy coffee' in category 'cafe'")
    results = search_places_semantic(
        "cozy coffee",
        limit=5,
        category="cafe"
    )
    
    print(f"\nFound {len(results)} cafes:")
    for place in results:
        score = place.get('similarity_score', 0)
        print(f"  • {place['name']} (Score: {score:.3f})")


def example_3_hybrid_search():
    """Example 3: Hybrid search (semantic + keyword)"""
    print("\n" + "="*60)
    print("Example 3: Hybrid Search")
    print("="*60)
    
    query = "Amphawa floating market"
    
    # Compare semantic vs hybrid
    print(f"\n🔍 Query: '{query}'")
    
    # Pure semantic
    print("\n📊 Semantic Results:")
    semantic_results = search_places_semantic(query, limit=3)
    for idx, place in enumerate(semantic_results, 1):
        print(f"  {idx}. {place['name']}")
    
    # Hybrid (70% semantic, 30% keyword)
    print("\n📊 Hybrid Results (70% semantic, 30% keyword):")
    hybrid_results = search_places_hybrid(query, limit=3, semantic_weight=0.7)
    for idx, place in enumerate(hybrid_results, 1):
        score = place.get('relevance_score', 0)
        print(f"  {idx}. {place['name']} (Score: {score:.3f})")


def example_4_similar_places():
    """Example 4: Find similar places"""
    print("\n" + "="*60)
    print("Example 4: Find Similar Places")
    print("="*60)
    
    # First, get a place
    print("\n🔍 Finding places similar to Amphawa Floating Market...")
    
    # Search for Amphawa
    amphawa_results = search_places_semantic("Amphawa floating market", limit=1)
    
    if amphawa_results:
        reference_place = amphawa_results[0]
        place_id = reference_place['place_id']
        
        print(f"\n📍 Reference place: {reference_place['name']}")
        print(f"   ID: {place_id}")
        
        # Find similar
        similar = find_similar_places(place_id, limit=5)
        
        print(f"\n✨ Similar places:")
        for idx, place in enumerate(similar, 1):
            score = place.get('similarity_score', 0)
            print(f"  {idx}. {place['name']} (Similarity: {score:.3f})")
            print(f"      {place.get('category', 'N/A')}")
    else:
        print("  No results found")


def example_5_comparison():
    """Example 5: Compare semantic vs keyword search"""
    print("\n" + "="*60)
    print("Example 5: Semantic vs Keyword Comparison")
    print("="*60)
    
    # Query with typo
    query = "ampawa market"  # Misspelled
    
    print(f"\n🔍 Query with typo: '{query}'")
    
    # Keyword search
    print("\n📝 Keyword Search Results:")
    keyword_results = search_places(query, limit=3)
    if keyword_results:
        for place in keyword_results:
            print(f"  • {place['name']}")
    else:
        print("  No results found")
    
    # Semantic search (should handle typo better)
    print("\n🧠 Semantic Search Results:")
    semantic_results = search_places_semantic(query, limit=3)
    if semantic_results:
        for place in semantic_results:
            score = place.get('similarity_score', 0)
            print(f"  • {place['name']} (Score: {score:.3f})")
    else:
        print("  No results found")


def example_6_intent_based():
    """Example 6: Intent-based search"""
    print("\n" + "="*60)
    print("Example 6: Intent-Based Search")
    print("="*60)
    
    queries = [
        "I want to take beautiful photos",
        "Where can I see Thai culture?",
        "Looking for family-friendly activities",
        "Need a quiet place to relax"
    ]
    
    for query in queries:
        print(f"\n🎯 Intent: '{query}'")
        results = search_places_semantic(query, limit=2)
        
        if results:
            print(f"   Top suggestions:")
            for place in results:
                score = place.get('similarity_score', 0)
                print(f"   • {place['name']} (Score: {score:.3f})")


def run_all_examples():
    """Run all examples"""
    print("\n" + "="*70)
    print("  pgvector Semantic Search Examples")
    print("  World.Journey.Ai")
    print("="*70)
    
    try:
        example_1_basic_semantic_search()
        example_2_filtered_search()
        example_3_hybrid_search()
        example_4_similar_places()
        example_5_comparison()
        example_6_intent_based()
        
        print("\n" + "="*70)
        print("✅ All examples completed successfully!")
        print("="*70 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error running examples: {e}")
        print("\nMake sure you have:")
        print("  1. Run the embedding generation script")
        print("  2. Database is running with pgvector")
        print("  3. sentence-transformers is installed")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    run_all_examples()
