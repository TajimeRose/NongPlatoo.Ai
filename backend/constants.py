"""Centralized constants for the application."""

# Cache Configuration
TRAVEL_DATA_CACHE_TTL_SECONDS = 300  # 5 minutes
RESPONSE_CACHE_TTL_SECONDS = 60  # 1 minute
DUPLICATE_WINDOW_SECONDS = 15
MATCHER_CACHE_INITIALIZED = False

# Query and Matching Limits
DEFAULT_MATCH_LIMIT = 50
DEFAULT_DISPLAY_LIMIT = 6  # Show 4-6 places for better browsing
DEFAULT_SEARCH_LIMIT = 50
MAX_ATTRACTIONS_LIMIT = 100
DEFAULT_KEYWORD_DETECTION_LIMIT = 6

# Timeout Configuration
DEFAULT_CHAT_TIMEOUT_SECONDS = 180  # 3 minutes - allows time for semantic model loading + OpenAI response
DEFAULT_REQUEST_TIMEOUT = 30  # Reduced from 60s for faster responses
DEFAULT_GREETING_TIMEOUT = 30

# Conversation Memory
MAX_MESSAGES_PER_USER = 10
CONVERSATION_TTL_SECONDS = 1800  # 30 minutes

# Language Detection
THAI_CHAR_MIN_CODE = "\u0e00"
THAI_CHAR_MAX_CODE = "\u0e7f"

# API and Service Configuration
DEFAULT_OPENAI_MODEL = "gpt-4o-mini"
DEFAULT_TEMPERATURE = 0.8
DEFAULT_MAX_TOKENS = 600  # Higher for streaming - generates richer content progressively
DEFAULT_TOP_P = 1.0
DEFAULT_PRESENCE_PENALTY = 0.1
DEFAULT_FREQUENCY_PENALTY = 0.1

# Local Keywords
LOCAL_KEYWORDS = [
    "สมุทรสงคราม",
    "samut songkhram"
]

# Default Values
DEFAULT_USER_ID = "default"
DEFAULT_LANGUAGE = "th"
DEFAULT_PROVINCE = "สมุทรสงคราม"

# File Paths
STATIC_FOLDER_NAMES = ["backend/static", "frontend/dist", "static"]
