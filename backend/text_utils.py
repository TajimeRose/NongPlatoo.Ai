"""Utility functions for text processing and language detection."""

from typing import Optional
from .constants import THAI_CHAR_MIN_CODE, THAI_CHAR_MAX_CODE, DEFAULT_LANGUAGE


def detect_language(text: str) -> str:
    """
    Detect if text is primarily Thai or English.
    
    Args:
        text: The text to analyze
        
    Returns:
        'th' for Thai, 'en' for English
    """
    if not text:
        return DEFAULT_LANGUAGE
    
    thai_char_count = sum(
        1 for char in text 
        if THAI_CHAR_MIN_CODE <= char <= THAI_CHAR_MAX_CODE
    )
    
    # Prioritize Thai if any Thai characters are present
    return "th" if thai_char_count > 0 else "en"


def is_thai_text(text: str) -> bool:
    """
    Check if text contains Thai characters.
    
    Args:
        text: The text to check
        
    Returns:
        True if text contains Thai characters, False otherwise
    """
    return any(THAI_CHAR_MIN_CODE <= char <= THAI_CHAR_MAX_CODE for char in text)


def normalize_whitespace(text: Optional[str]) -> str:
    """
    Normalize whitespace in text by collapsing multiple spaces.
    
    Args:
        text: The text to normalize
        
    Returns:
        Text with normalized whitespace
    """
    if not text:
        return ""
    
    import re
    return re.sub(r"\s+", " ", text.strip())


def truncate_text(text: str, max_length: int, suffix: str = "...") -> str:
    """
    Truncate text to maximum length, adding suffix if truncated.
    
    Args:
        text: The text to truncate
        max_length: Maximum length of result (including suffix)
        suffix: String to add when text is truncated
        
    Returns:
        Truncated text with suffix if needed
    """
    if len(text) <= max_length:
        return text
    
    return text[:max_length - len(suffix)] + suffix


def extract_keywords(text: str, min_length: int = 2) -> list[str]:
    """
    Extract potential keywords from text.
    
    Args:
        text: The text to extract keywords from
        min_length: Minimum length for keywords
        
    Returns:
        List of potential keywords
    """
    import re
    
    # Remove special characters and split
    words = re.findall(r'\w+', text.lower())
    
    # Filter by minimum length
    keywords = [word for word in words if len(word) >= min_length]
    
    # Remove duplicates while preserving order
    seen = set()
    unique_keywords = []
    for keyword in keywords:
        if keyword not in seen:
            seen.add(keyword)
            unique_keywords.append(keyword)
    
    return unique_keywords
