
import sys
import os

# Add backend to path as app.py does
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    import world_journey_ai
    print("Successfully imported world_journey_ai")
except ImportError as e:
    print(f"Failed to import world_journey_ai: {e}")

try:
    from world_journey_ai.configs import PromptRepo
    print("Successfully imported PromptRepo")
except ImportError as e:
    print(f"Failed to import PromptRepo: {e}")
