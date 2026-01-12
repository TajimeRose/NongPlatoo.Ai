"""GPT chatbot for Samut Songkhram tourism. OPENAI_MODEL (default: gpt-4o)."""

from __future__ import annotations

import concurrent.futures
import hashlib
import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, TYPE_CHECKING

from .configs import PromptRepo
from .db import get_db, Place, search_places, search_main_attractions, get_attractions_by_type
try:
    from .services.database import get_db_service
    DB_SERVICE_AVAILABLE = True
except Exception as exc:
    print(f"[WARN] Database service unavailable for adaptive flow: {exc}")
    DB_SERVICE_AVAILABLE = False

    # Provide stub to keep symbol bound for static analysis / linters.
    def get_db_service() -> Any:  # type: ignore[misc]
        raise RuntimeError("Database service unavailable")


try:
    from .gpt_service import GPTService
    GPT_AVAILABLE = True
except Exception as exc:
    print(f"[WARN] GPT service import failed: {exc}")
    GPT_AVAILABLE = False
    GPTService = None

try:
    from .simple_matcher import FlexibleMatcher
    FLEXIBLE_MATCHER_AVAILABLE = True
except Exception as exc:
    print(f"[WARN] Flexible matcher unavailable: {exc}")
    FLEXIBLE_MATCHER_AVAILABLE = False
    FlexibleMatcher = None

if TYPE_CHECKING:
    from .simple_matcher import FlexibleMatcher as FlexibleMatcherType
else:
    FlexibleMatcherType = Any

from .constants import (
    TRAVEL_DATA_CACHE_TTL_SECONDS,
    RESPONSE_CACHE_TTL_SECONDS,
    DUPLICATE_WINDOW_SECONDS,
    DEFAULT_MATCH_LIMIT,
    DEFAULT_DISPLAY_LIMIT,
    DEFAULT_KEYWORD_DETECTION_LIMIT,
    LOCAL_KEYWORDS as DEFAULT_LOCAL_KEYWORDS,
)
from .text_utils import detect_language, normalize_whitespace

PROMPT_REPO = PromptRepo()

logger = logging.getLogger(__name__)

# ====== PERFORMANCE OPTIMIZATION: Module-level caches ======
_TRAVEL_DATA_CACHE: Optional[List[Dict[str, Any]]] = None
_TRAVEL_DATA_CACHE_TIME: float = 0

_MATCHER_CACHE: Optional[Any] = None
_MATCHER_CACHE_INITIALIZED = False

_RESPONSE_CACHE: Dict[str, Dict[str, Any]] = {}  # Query hash -> response
_RESPONSE_CACHE_TIME: Dict[str, float] = {}  # Query hash -> timestamp

LOCAL_KEYWORDS = PROMPT_REPO.get_prompt("chatbot/local_terms", default=DEFAULT_LOCAL_KEYWORDS)


class TravelChatbot:
    """Chatbot powered solely by GPT (local data + prompts)."""

    def __init__(self) -> None:
        global _TRAVEL_DATA_CACHE, _TRAVEL_DATA_CACHE_TIME
        
        self.bot_name = "NongPlaToo"
        self.chatbot_prompts = PROMPT_REPO.get_prompt("chatbot/answer", default={})
        self.preferences = PROMPT_REPO.get_preferences()
        self.runtime_config = PROMPT_REPO.get_runtime_config()
        self.character_profile = PROMPT_REPO.get_character_profile()
        self.match_limit = self.runtime_config.get("matching", {}).get("max_matches", DEFAULT_MATCH_LIMIT)
        self.display_limit = self.runtime_config.get("matching", {}).get("max_display", DEFAULT_DISPLAY_LIMIT)
        self.gpt_service: Optional[Any] = None
        # self.image_links = self._load_image_links() # Removed
        # self.province_profile = self._load_province_profile() # Removed
        # raw_trip_guides = self._load_trip_guides() # Removed
        
        # Load travel data from cache or DB
        current_time = time.time()
        if _TRAVEL_DATA_CACHE is not None and (current_time - _TRAVEL_DATA_CACHE_TIME) < TRAVEL_DATA_CACHE_TTL_SECONDS:
            self.travel_data = _TRAVEL_DATA_CACHE
        else:
            self.travel_data = self._load_travel_data_from_db()
            _TRAVEL_DATA_CACHE = self.travel_data
            _TRAVEL_DATA_CACHE_TIME = current_time
        
        self.trip_guides = {
            entry["id"]: entry
            for entry in self.travel_data
            if entry.get("category") == "trip_plan"
        }
        self.dataset_summary = self._build_dataset_summary()
        self.local_reference_terms = self._build_local_reference_terms()
        self.matching_engine: Optional[FlexibleMatcherType] = self._init_matcher()
        self._recent_requests: Dict[str, Dict[str, Any]] = {}

        if GPT_AVAILABLE and GPTService is not None:
            try:
                self.gpt_service = GPTService()
                print("[OK] GPT service initialized")
            except Exception as exc:
                print(f"[ERROR] Cannot initialize GPT service: {exc}")
                self.gpt_service = None
        else:
            print("[WARN] GPT service unavailable")

    def _init_matcher(self) -> Optional[FlexibleMatcherType]:
        global _MATCHER_CACHE, _MATCHER_CACHE_INITIALIZED
        
        if not FLEXIBLE_MATCHER_AVAILABLE or FlexibleMatcher is None:
            return None
        
        # Return cached instance if already initialized
        if _MATCHER_CACHE_INITIALIZED:
            return _MATCHER_CACHE
        
        try:
            _MATCHER_CACHE = FlexibleMatcher()
            _MATCHER_CACHE_INITIALIZED = True
            return _MATCHER_CACHE
        except Exception as exc:
            print(f"[WARN] Cannot initialize flexible matcher: {exc}")
            _MATCHER_CACHE = None
            _MATCHER_CACHE_INITIALIZED = True
            return None

    @staticmethod
    def _detect_language(text: str) -> str:
        """Detect if text is primarily Thai or English."""
        return detect_language(text)

    def _classify_intent(self, query: str) -> Dict[str, Any]:
        """
        Classify user intent as 'specific' (asking about a named place)
        or 'general' (broad category or recommendation request).
        Returns: {intent_type: 'specific'|'general', keywords: [...], clean_question: str}
        """
        clean_question = query.strip()
        normalized = clean_question.lower()
        
        # Extract keywords from the query
        extracted_keywords = []
        
        # Specific intent indicators - asking about a named place
        specific_indicators = [
            "อยู่ที่ไหน", "where is", "อยู่ตรงไหน", "ที่อยู่",
            "เกี่ยวกับ", "about", "tell me about", "บอกเกี่ยวกับ",
            "คือ", "คืออะไร", "what is", "เป็นอย่างไร",
            "ไปยังไง", "how to get", "วิธีไป", "เดินทางไป"
        ]
        
        # General intent indicators - asking for recommendations/categories
        general_indicators = [
            "แนะนำ", "recommend", "suggestion", "มีอะไร", "what",
            "บ้าง", "some", "ไหนดี", "where should", "ควรไป",
            "อยากไป", "want to visit", "หา", "find", "looking for",
            "มี", "are there", "any", "list"
        ]
        
        # Check if query mentions specific place names from database
        specific_place_match = False
        for entry in self.travel_data[:50]:  # Check first 50 entries for performance
            place_names = [
                entry.get("place_name"),
                entry.get("name"),
                entry.get("name_th"),
                entry.get("name_en")
            ]
            for name in place_names:
                if name and len(str(name)) >= 3:
                    normalized_name = self._normalize_name_token(str(name))
                    if normalized_name and normalized_name in self._normalize_name_token(normalized):
                        specific_place_match = True
                        extracted_keywords.append(str(name))
                        break
            if specific_place_match:
                break
        
        # Determine intent type
        has_specific_indicator = any(ind in normalized for ind in specific_indicators)
        has_general_indicator = any(ind in normalized for ind in general_indicators)
        
        if specific_place_match or (has_specific_indicator and not has_general_indicator):
            intent_type = "specific"
        else:
            intent_type = "general"
        
        # Auto-detect keywords if none found
        if not extracted_keywords:
            extracted_keywords = self._auto_detect_keywords(query, limit=3)
        
        return {
            "intent_type": intent_type,
            "keywords": extracted_keywords,
            "clean_question": clean_question
        }

    def _matcher_analysis(self, query: str) -> Dict[str, Any]:
        if not query.strip():
            return {"topic": None, "confidence": 0.0, "keywords": [], "is_local": False}
        engine = getattr(self, "matching_engine", None)
        if not engine:
            return {"topic": None, "confidence": 0.0, "keywords": [], "is_local": False}
        topic = None
        confidence = 0.0
        try:
            topic, confidence = engine.find_best_match(query)
        except Exception as exc:
            print(f"[WARN] Flexible matcher topic detection failed: {exc}")
        try:
            is_local = engine.is_samutsongkhram_related(query)
        except Exception as exc:
            print(f"[WARN] Flexible matcher locality detection failed: {exc}")
            is_local = False
        keywords: List[str] = []
        if topic:
            try:
                keywords = engine.get_topic_keywords(topic)
            except Exception as exc:
                print(f"[WARN] Flexible matcher keywords failed: {exc}")
        # Ensure primitive types for downstream JSON serialization
        safe_topic = topic if isinstance(topic, str) else (str(topic) if topic else None)
        safe_confidence = float(confidence or 0.0)
        safe_local_flag = bool(is_local)
        return {
            "topic": safe_topic,
            "confidence": safe_confidence,
            "keywords": keywords,
            "is_local": safe_local_flag,
        }

    @staticmethod
    def _merge_keywords(*keyword_sets: List[str]) -> List[str]:
        merged: List[str] = []
        seen = set()
        for keyword_list in keyword_sets:
            if not keyword_list:
                continue
            for keyword in keyword_list:
                text = str(keyword).strip()
                if not text:
                    continue
                lowered = text.lower()
                if lowered in seen:
                    continue
                seen.add(lowered)
                merged.append(text)
        return merged

    @staticmethod
    def _normalized_query_key(text: str) -> str:
        """Normalize query text for caching purposes."""
        return normalize_whitespace(text).lower()

    def _replay_duplicate_response(self, user_id: str, key: str) -> Optional[Dict[str, Any]]:
        if not key:
            return None
        entry = self._recent_requests.get(user_id)
        if not entry:
            return None
        if entry["query"] == key and (time.time() - entry["timestamp"]) <= DUPLICATE_WINDOW_SECONDS:
            cached_payload = dict(entry["result"])
            cached_payload["duplicate"] = True
            cached_payload["source"] = f"{cached_payload.get('source', 'cache')}_cached"
            return cached_payload
        return None

    def _cache_response(self, user_id: str, key: str, payload: Dict[str, Any]) -> None:
        if not key:
            return
        self._recent_requests[user_id] = {
            "query": key,
            "timestamp": time.time(),
            "result": payload,
        }

    def _auto_detect_keywords(self, query: str, limit: int = DEFAULT_KEYWORD_DETECTION_LIMIT) -> List[str]:
        if not query or not self.travel_data:
            return []
        normalized_query = self._normalize_name_token(query)
        lowered_query = query.lower()
        detected: List[str] = []
        seen_tokens: set[str] = set()

        def consider(value: Optional[str]) -> None:
            if not value or len(detected) >= limit:
                return
            for variant in self._name_variations(str(value)):
                normalized_variant = self._normalize_name_token(variant)
                lowered_variant = variant.lower()
                if not normalized_variant or normalized_variant in seen_tokens:
                    continue
                if (
                    normalized_variant and normalized_variant in normalized_query
                ) or lowered_variant in lowered_query:
                    seen_tokens.add(normalized_variant)
                    detected.append(variant.strip())
                    break

        for entry in self.travel_data:
            consider(entry.get("place_name"))
            consider(entry.get("name"))
            consider(entry.get("name_th"))
            consider(entry.get("name_en"))
            consider(entry.get("city"))
            location = entry.get("location")
            if isinstance(location, dict):
                consider(location.get("district"))
            elif isinstance(location, str):
                consider(location)
            if len(detected) >= limit:
                break

        if len(detected) < limit:
            for entry in self.travel_data:
                types = entry.get("type") or []
                if isinstance(types, str):
                    types = [types]
                for type_value in types:
                    consider(str(type_value))
                    if len(detected) >= limit:
                        break
                if len(detected) >= limit:
                    break

        return detected

    def _load_travel_data_from_db(self) -> List[Dict[str, Any]]:
        entries: List[Dict[str, Any]] = []
        try:
            db_gen = get_db()
            db = next(db_gen)
            places = db.query(Place).all()
            for place in places:
                entries.append(place.to_dict())
        except Exception as e:
            print(f"[ERROR] Failed to load data from DB: {e}")
            return []

        return self._deduplicate_entries(entries)

    def _google_search_fallback(
        self,
        query: str,
        keywords: Optional[List[str]] = None,
        limit: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Fallback to Google Maps Places search when database has no results.
        Uses Google Maps Places API to find tourism locations in Samut Songkhram.
        Returns results normalized to Place schema format.
        """
        try:
            import googlemaps
        except ImportError:
            print("[WARN] googlemaps not installed, skipping fallback")
            return []

        # Get Google Maps API key from environment
        api_key = os.getenv('GOOGLE_MAPS_API_KEY')
        if not api_key:
            print("[WARN] GOOGLE_MAPS_API_KEY not configured, skipping fallback")
            return []

        results: List[Dict[str, Any]] = []
        
        try:
            # Initialize Google Maps client with timeout
            gmaps = googlemaps.Client(key=api_key, timeout=8)
            
            # Search query - combine main query with Samut Songkhram
            search_query = f"{query} Samut Songkhram Thailand"
            
            print(f"[INFO] Google Maps fallback search: {search_query}")
            
            # Perform Places search with timeout
            def do_search():
                try:
                    # Use Places API nearby search centered on Samut Songkhram
                    # Coordinates: Samut Songkhram center (13.4549°N, 100.7588°E)
                    response = gmaps.places_nearby(  # type: ignore
                        location=(13.4549, 100.7588),
                        radius=50000,  # 50km radius covers entire province
                        keyword=search_query,
                        language='th'
                    )
                    return response.get('results', [])[:limit]
                except googlemaps.exceptions.Timeout:
                    print("[WARN] Google Maps search timed out")
                    return []
                except Exception as e:
                    print(f"[WARN] Google Maps search error: {e}")
                    return []
            
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(do_search)
                try:
                    search_results = future.result(timeout=15)  # 15 second overall timeout
                except concurrent.futures.TimeoutError:
                    print("[WARN] Google Maps search timed out after 15 seconds")
                    return []
                except Exception as e:
                    print(f"[WARN] Google Maps search failed: {e}")
                    return []
            
            # Normalize Google Maps results to Place schema
            for idx, result in enumerate(search_results):
                place_id = result.get('place_id', f'gmaps_{idx}')
                name = result.get('name', 'Unknown Place')
                address = result.get('vicinity', 'Samut Songkhram, Thailand')
                
                # Extract location coordinates
                location = result.get('geometry', {}).get('location', {})
                lat = location.get('lat')
                lng = location.get('lng')
                
                # Get rating and types
                rating = result.get('rating', None)
                types = result.get('types', [])
                is_open = result.get('opening_hours', {}).get('open_now', None)
                
                # Get photo if available
                photos = result.get('photos', [])
                image_urls = []
                if photos and api_key:
                    for photo in photos[:1]:  # Use first photo only
                        photo_ref = photo.get('photo_reference', '')
                        if photo_ref:
                            img_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference={photo_ref}&key={api_key}"
                            image_urls.append(img_url)
                
                # Create normalized place object
                normalized = {
                    'id': f'gmaps_{hashlib.md5(place_id.encode()).hexdigest()[:10]}',
                    'place_id': place_id,
                    'name': name,
                    'place_name': name,
                    'description': f"Location: {address}. Rating: {rating}/5" if rating else f"Location: {address}",
                    'short_description': address,
                    'address': address,
                    'location': address,
                    'latitude': lat,
                    'longitude': lng,
                    'city': 'สมุทรสงคราม',
                    'province': 'สมุทรสงคราม',
                    'type': types,
                    'category': 'From Google Maps',
                    'rating': rating,
                    'is_open': is_open,
                    'images': image_urls,
                    'image_urls': image_urls,
                    'source': 'google_search',
                    '_external': True,
                    '_maps_url': f"https://www.google.com/maps/place/?q=place_id:{place_id}",
                    'place_information': {
                        'detail': address,
                        'category_description': 'Tourism location from Google Maps',
                        'source': 'Google Maps Places API'
                    }
                }
                
                results.append(normalized)
            
            if results:
                print(f"[INFO] Google Maps fallback found {len(results)} results")

            else:
                print("[INFO] Google fallback found no results")
                
        except Exception as e:
            print(f"[ERROR] Google search fallback failed: {e}")
            return []
        
        return results





    def _make_name_keys(self, *values: Optional[str]) -> List[str]:
        keys: List[str] = []
        for value in values:
            if not isinstance(value, str):
                continue
            for variant in self._name_variations(value):
                token = self._normalize_name_token(variant)
                if token and token not in keys:
                    keys.append(token)
        return keys

    @staticmethod
    def _name_variations(value: str) -> List[str]:
        variants: List[str] = []

        def add_variant(text: Optional[str]) -> None:
            if not text:
                return
            cleaned = text.strip()
            if cleaned and cleaned not in variants:
                variants.append(cleaned)

        add_variant(value)
        if "(" in value:
            before, _, remainder = value.partition("(")
            add_variant(before)
            inner, _, _ = remainder.partition(")")
            add_variant(inner)
        if "/" in value:
            for part in value.split("/"):
                add_variant(part)

        return variants

    @staticmethod
    def _normalize_name_token(text: Optional[str]) -> str:
        if not text:
            return ""
        normalized = re.sub(r"[^0-9a-zA-Z\u0E00-\u0E7F]+", "", text.strip().lower())
        return normalized


    @staticmethod
    def _summarize_day_plan(day_plan: Dict[str, Any]) -> str:
        title = day_plan.get("title", "")
        activities = day_plan.get("activities", []) or []
        steps: List[str] = []
        for activity in activities:
            if not isinstance(activity, dict):
                continue
            action = activity.get("action")
            description = activity.get("description")
            if action and description:
                steps.append(f"{action} ({description})")
            elif action:
                steps.append(action)
        actions = " -> ".join(steps)
        if title and actions:
            return f"{title}: {actions}"
        return title or actions

    @staticmethod
    def _summarize_route(route: Dict[str, Any]) -> str:
        start = route.get("start_point")
        order = route.get("route_order", []) or []
        if order:
            path = " -> ".join(order)
            if start:
                return f"เส้นทางแนะนำ: {start} -> {path}"
            return f"เส้นทางแนะนำ: {path}"
        return ""



    def _standardize_entry(
        self,
        entry: Dict[str, Any],
        *,
        source: str,
        priority: int,
    ) -> Optional[Dict[str, Any]]:
        if not isinstance(entry, dict):
            return None
        normalized = dict(entry)
        name_candidates = [
            normalized.get("place_name"),
            normalized.get("name"),
            normalized.get("name_th"),
            normalized.get("name_en"),
            normalized.get("title"),
        ]
        name = next((value for value in name_candidates if value), None)
        if not name:
            return None

        normalized["name"] = name
        normalized["place_name"] = normalized.get("place_name") or name
        normalized["_priority"] = priority
        normalized["source"] = source

        highlights = normalized.get("highlights")
        if isinstance(highlights, str):
            highlights = [highlights]
        elif not isinstance(highlights, list):
            highlights = []
        normalized["highlights"] = highlights

        if isinstance(normalized.get("type"), str):
            normalized["type"] = [normalized["type"]]  # type: ignore[list-item]
        elif not isinstance(normalized.get("type"), list):
            normalized["type"] = []

        description = normalized.get("description") or normalized.get("history") or ""
        normalized["description"] = description

        location = normalized.get("location")
        if not isinstance(location, dict):
            location = {}
        city = normalized.get("city")
        if not city:
            location_str = entry.get("location")
            if isinstance(location_str, str):
                city = self._extract_city_name(location_str)
        if city:
            normalized["city"] = city
            location.setdefault("district", city)
        location.setdefault("province", "สมุทรสงคราม")
        normalized["location"] = location

        info = normalized.get("place_information")
        if not isinstance(info, dict):
            info = {}
        if not info.get("detail"):
            info["detail"] = description
        if "highlights" not in info and highlights:
            info["highlights"] = highlights
        if "category_description" not in info:
            if normalized["type"]:
                info["category_description"] = ", ".join(str(t) for t in normalized["type"])
            else:
                info["category_description"] = normalized.get("category") or "travel"
        normalized["place_information"] = info

        # self._apply_image_links(normalized) # Removed

        if not normalized.get("id"):
            normalized["id"] = self._slugify_identifier(name)

        return normalized

    def _deduplicate_entries(self, entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        merged: Dict[str, Dict[str, Any]] = {}
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            ident = entry.get("id") or self._slugify_identifier(entry.get("place_name", "") or "")
            if not ident:
                continue
            priority = entry.get("_priority", 0)
            existing = merged.get(ident)
            if existing and existing.get("_priority", 0) >= priority:
                continue
            normalized_entry = dict(entry)
            normalized_entry["id"] = ident
            normalized_entry["_priority"] = priority
            merged[ident] = normalized_entry

        final_entries: List[Dict[str, Any]] = []
        for entry in merged.values():
            entry.pop("_priority", None)
            final_entries.append(entry)
        return final_entries


    def _slugify_identifier(self, text: str) -> str:
        if not text:
            return hashlib.sha1(b"default").hexdigest()[:10]
        cleaned = re.sub(r"[^0-9a-zA-Z\u0E00-\u0E7F]+", "-", text.strip().lower())
        cleaned = cleaned.strip("-")
        if cleaned:
            return cleaned
        return hashlib.sha1(text.encode("utf-8")).hexdigest()[:10]

    @staticmethod
    def _extract_city_name(location_text: Optional[str]) -> str:
        if not isinstance(location_text, str):
            return ""
        text = location_text.strip()
        if not text:
            return ""
        for marker in ("อำเภอ", "อ.", "อำเภ"):
            if marker in text:
                after = text.split(marker, 1)[1].strip()
                return after.split()[0].strip(" ,")
        for marker in ("ตำบล", "ต.", "ตำบล"):
            if marker in text:
                after = text.split(marker, 1)[1].strip()
                return after.split()[0].strip(" ,")
        return text

    def _build_dataset_summary(self) -> str:
        if not self.travel_data:
            return ""
        lines = []
        for entry in self.travel_data:
            name = entry.get("name") or entry.get("place_name") or "unknown"
            city = entry.get("city") or entry.get("location", {}).get("district", "")
            entry_type = entry.get("type") or entry.get("category", "")
            if isinstance(entry_type, list):
                entry_type = ", ".join(str(t) for t in entry_type)
            lines.append(f"- {name} | city: {city} | type: {entry_type}")
        return "\n".join(lines[:50])

    def _build_local_reference_terms(self) -> List[str]:
        terms = {term.lower() for term in LOCAL_KEYWORDS}
        for entry in self.travel_data:
            for key in ("name", "place_name", "city", "type", "category"):
                value = entry.get(key)
                if isinstance(value, str):
                    terms.add(value.lower())
        return list(terms)

    def _interpret_query_keywords(self, query: str) -> Dict[str, List[str]]:
        if not self.gpt_service or not self.dataset_summary:
            return {"keywords": [], "places": []}
        try:
            return self.gpt_service.extract_query_entities(query, self.dataset_summary)
        except Exception as exc:
            print(f"[WARN] Query interpretation failed: {exc}")
            return {"keywords": [], "places": []}

    def _is_main_attractions_query(self, query: str) -> bool:
        """
        Detect if user is asking for PRIMARY/MAIN tourist attractions.
        
        Returns True if query contains terms like "สถานที่ท่องเที่ยว" or "ที่เที่ยวหลัก"
        so that we can filter ONLY main_attraction types at SQL level.
        
        This ensures the database classification is used, not AI reclassification.
        """
        normalized_query = query.lower()
        
        # Thai terms for main attractions
        main_attraction_indicators = [
            "สถานที่ท่องเที่ยว",  # tourist attractions (primary/main)
            "ที่เที่ยวหลัก",      # main tourist spots
            "ที่เที่ยวสำคัญ",     # important tourist spots
            "แหล่งท่องเที่ยว",    # tourist sources (often main)
            "จุดท่องเที่ยว",      # tourist spots/points (main)
            "อัตราคะแนนสูง",     # highly-rated
            "มีชื่อเสียง",        # famous/renowned
            "ดังที่สุด",          # most famous
            "หลัก",              # main/primary (suffix indicator)
        ]
        
        # English terms
        english_indicators = [
            "main attractions", "primary attractions", "major attractions",
            "top attractions", "best attractions", "famous places",
            "must see", "must visit", "landmark"
        ]
        
        for indicator in main_attraction_indicators + english_indicators:
            if indicator in normalized_query:
                return True
        
        return False

    def _match_travel_data(
        self,
        query: str,
        keywords: Optional[List[str]] = None,
        limit: Optional[int] = None,
        boost_keywords: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Match travel data by performing a primary search with the full query and
        then optionally expanding the search with additional keywords.  This helper
        normalizes the ``limit`` parameter into a concrete integer value before
        using it, preventing type errors when ``limit`` is ``None``.  It returns
        up to that number of results from the combined searches.
        
        IMPORTANT: If the query asks for "main attractions" (สถานที่ท่องเที่ยว),
        filter ONLY by attraction_type='main_attraction' at SQL level.
        The AI WILL NOT reclassify places - database classification is final.
        """
        # Normalize the limit to an integer.  If the caller doesn't specify a
        # limit, use the runtime-configured limit (self.match_limit) or fall back
        # to 5.  This avoids passing None into search_places or comparing None
        # against integers.
        limit_value: int = (
            limit if isinstance(limit, int) and limit is not None else self.match_limit or 5
        )

        # Check if user is asking specifically for main attractions
        is_main_attraction_query = self._is_main_attractions_query(query)
        
        # Perform the initial DB search using the full query
        if is_main_attraction_query:
            # Use SQL-level filtering: ONLY main_attraction type
            # The AI should not try to reclassify non-main attractions
            results: List[Dict[str, Any]] = search_main_attractions(query, limit=limit_value)
        else:
            results: List[Dict[str, Any]] = search_places(query, limit=limit_value)

        # If the caller provided additional keywords, search each keyword and
        # merge any new results until we reach the limit.  Use a small fixed
        # per-keyword limit to avoid flooding results from a single keyword.
        if keywords:
            for kw in keywords:
                if len(results) >= limit_value:
                    break
                if is_main_attraction_query:
                    kw_results = search_main_attractions(kw, limit=2)
                else:
                    kw_results = search_places(kw, limit=2)
                for res in kw_results:
                    # Avoid adding duplicates by checking the 'id' field
                    if not any(r.get('id') == res.get('id') for r in results):
                        results.append(res)

        # Trim the final result list to the normalized limit
        return results[:limit_value]

    def _add_classification_context(self, results: List[Dict[str, Any]]) -> str:
        """
        Build context string explaining the database classifications of results.
        This helps the AI understand that places are pre-classified and shouldn't reclassify them.
        
        Args:
            results: List of place dictionaries with attraction_type field
            
        Returns:
            String explaining the classifications, suitable to include in system/user context
        """
        if not results:
            return ""
        
        # Count by attraction_type
        classification_map: Dict[str, list] = {}
        for place in results:
            attr_type = place.get('attraction_type', 'unknown')
            if attr_type not in classification_map:
                classification_map[attr_type] = []
            classification_map[attr_type].append(place.get('name') or place.get('place_name', 'Unknown'))
        
        # Build explanation
        lines = [
            "📋 DATABASE CLASSIFICATION CONTEXT:",
            "These search results are already classified by the database system:",
            ""
        ]
        
        for attr_type, places in sorted(classification_map.items()):
            if attr_type == 'main_attraction':
                lines.append(f"🏛️ Main Tourist Attractions ({len(places)}): {', '.join(places[:3])}" + 
                           ("..." if len(places) > 3 else ""))
            elif attr_type == 'secondary_attraction':
                lines.append(f"🏞️ Secondary Attractions ({len(places)}): {', '.join(places[:3])}" + 
                           ("..." if len(places) > 3 else ""))
            elif attr_type == 'market':
                lines.append(f"🛍️ Markets ({len(places)}): {', '.join(places[:3])}" + 
                           ("..." if len(places) > 3 else ""))
            elif attr_type == 'restaurant':
                lines.append(f"🍽️ Restaurants ({len(places)}): {', '.join(places[:3])}" + 
                           ("..." if len(places) > 3 else ""))
            elif attr_type == 'cafe':
                lines.append(f"☕ Cafes ({len(places)}): {', '.join(places[:3])}" + 
                           ("..." if len(places) > 3 else ""))
            elif attr_type == 'activity':
                lines.append(f"🎯 Activities ({len(places)}): {', '.join(places[:3])}" + 
                           ("..." if len(places) > 3 else ""))
            else:
                lines.append(f"📌 {attr_type.upper()} ({len(places)}): {', '.join(places[:3])}" + 
                           ("..." if len(places) > 3 else ""))
        
        lines.extend([
            "",
            "⚠️ IMPORTANT: Use these database-provided classifications. Do NOT reclassify places yourself.",
            "The classifications are final and accurate.",
        ])
        
        return "\n".join(lines)

    def _select_trip_guides_for_query(
        self,
        query: str,
        existing_ids: Optional[set[str]] = None,
        existing_titles: Optional[set[str]] = None,
    ) -> List[Dict[str, Any]]:
        if not getattr(self, "trip_guides", None):
            return []
        normalized = query.lower()
        matches: List[Dict[str, Any]] = []
        seen_ids = set(existing_ids or [])
        seen_titles = set(existing_titles or [])

        def add(slug: str) -> None:
            entry = self.trip_guides.get(slug)
            if not entry:
                return
            entry_id = self._entry_identifier(entry)
            if entry_id in seen_ids:
                return
            title_key = self._normalize_name_token(entry.get("place_name") or entry.get("name"))
            if title_key and title_key in seen_titles:
                return
            if entry not in matches:
                matches.append(entry)
                seen_ids.add(entry_id)
                if title_key:
                    seen_titles.add(title_key)

        if any(keyword in normalized for keyword in ("9 วัด", "๙ วัด", "ไหว้พระ", "temple tour", "nine temples")):
            add("9temples")
        if any(keyword in normalized for keyword in ("2 วัน", "สองวัน", "2-day", "2 day", "1 คืน", "ค้างคืน", "2d1n", "weekend")):
            add("2days1nighttrip")
        if any(keyword in normalized for keyword in ("1 วัน", "วันเดียว", "ครึ่งวัน", "half day", "one day")):
            add("1daytrip")
        return matches

    def _merge_structured_data(
        self,
        base: List[Dict[str, Any]],
        extras: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        if not extras:
            return base
        merged: Dict[str, Dict[str, Any]] = {}
        for entry in base:
            merged[self._entry_identifier(entry)] = entry
        for entry in extras:
            merged[self._entry_identifier(entry)] = entry
        return list(merged.values())

    def _is_specific_place_query(self, query: str, matched_data: List[Dict[str, Any]]) -> bool:
        """Detect if user is asking about a specific place vs a category/type."""
        if not matched_data:
            return False
        
        normalized_query = query.lower()
        
        # Category/type indicators - if present, it's NOT a specific place query
        category_keywords = [
            "ร้านอาหาร", "ที่กิน", "อาหาร", "restaurant", "food",
            "ที่พัก", "โรงแรม", "รีสอร์ท", "accommodation", "hotel",
            "วัด", "temple", "สถานที่", "แหล่ง", "place",
            "ตลาด", "market", "ทะเล", "sea", "beach",
            "ชุมชน", "community", "museum", "พิพิธภัณฑ์",
            "แนะนำ", "recommend", "suggest", "เที่ยว", "travel",
            "visit", "ไปไหน", "where", "ดี", "good", "น่าสนใจ",
            "interesting", "มีอะไร", "what", "บ้าง", "some"
        ]
        
        if any(keyword in normalized_query for keyword in category_keywords):
            # Check if it's asking for multiple or general suggestions
            multiple_indicators = ["บ้าง", "มีอะไร", "แนะนำ", "หลาย", "several", "some", "list", "ไหน"]
            if any(indicator in normalized_query for indicator in multiple_indicators):
                return False
        
        # If query contains a specific place name that matches the top result exactly
        if matched_data:
            top_result = matched_data[0]
            place_names = [
                top_result.get("place_name"),
                top_result.get("name"),
                top_result.get("name_th"),
                top_result.get("name_en")
            ]
            
            for name in place_names:
                if name:
                    # Normalize and check for exact or strong match
                    normalized_name = self._normalize_name_token(str(name))
                    normalized_query_tokens = self._normalize_name_token(normalized_query)
                    
                    if normalized_name and normalized_query_tokens:
                        # If the place name is substantially in the query (>60% overlap)
                        if len(normalized_name) >= 3 and normalized_name in normalized_query_tokens:
                            return True
                        # Or if query is very short and matches
                        if len(normalized_query.split()) <= 3 and normalized_name == normalized_query_tokens:
                            return True
        
        return False

    def _trim_structured_results(
        self,
        entries: List[Dict[str, Any]],
        limit: Optional[int] = None,
        is_specific_place: bool = False,
    ) -> List[Dict[str, Any]]:
        if not entries:
            return []
        
        # If asking about a specific place, return only 1 result
        if is_specific_place:
            max_count = 1
        else:
            # Category/general queries get 4-5 results
            max_count = limit if limit is not None else (self.display_limit or 4)
        
        trimmed: List[Dict[str, Any]] = []
        seen: set[str] = set()
        for entry in entries:
            ident = entry.get("id") or self._entry_identifier(entry)
            if ident in seen:
                continue
            seen.add(ident)
            trimmed.append(entry)
            if len(trimmed) >= max_count:
                break
        return trimmed


    def _entry_identifier(self, entry: Dict[str, Any]) -> str:
        ident = entry.get("id")
        if not ident:
            ident = self._slugify_identifier(entry.get("place_name") or entry.get("name") or repr(entry))
            entry["id"] = ident
        return ident

    def _is_trip_intent(self, normalized_query: str) -> bool:
        trip_keywords = (
            "ทริป",
            "แผนเที่ยว",
            "จัดทริป",
            "แผนการเดินทาง",
            "trip plan",
            "itinerary",
            "travel plan",
        )
        return any(keyword in normalized_query for keyword in trip_keywords)

    def _contains_local_reference(self, text: str) -> bool:
        lowered = text.lower()
        return any(term in lowered for term in self.local_reference_terms)

    def _mentions_other_province(self, query: str, keyword_pool: List[str], places: List[str]) -> bool:
        normalized = query.lower()
        province_match = re.search(r'จังหวัด\s*([^\s,.;!?]+)', normalized)
        if province_match:
            name = province_match.group(1)
            if not self._contains_local_reference(name):
                return True

        for candidate in places:
            candidate_str = str(candidate).lower()
            if candidate_str and not self._contains_local_reference(candidate_str):
                return True

        for keyword in keyword_pool:
            kw = str(keyword).lower()
            if kw and "จังหวัด" in kw and not self._contains_local_reference(kw):
                return True

        return False

    def _refresh_settings(self) -> None:
        self.chatbot_prompts = PROMPT_REPO.get_prompt("chatbot/answer", default=self.chatbot_prompts)
        self.preferences = PROMPT_REPO.get_preferences()
        self.runtime_config = PROMPT_REPO.get_runtime_config()
        self.match_limit = self.runtime_config.get("matching", {}).get("max_matches", 5)

    def _preference_context(self) -> str:
        prefs = self.preferences or {}
        components = []
        if tone := prefs.get("tone"):
            components.append(f"Preferred tone: {tone}")
        if style := prefs.get("response_style"):
            components.append(f"Response style: {style}")
        if format_hint := prefs.get("format"):
            components.append(f"Format guide: {format_hint}")
        if cta := prefs.get("call_to_action"):
            components.append(cta)
        return " | ".join(components)

    def _character_context(self) -> str:
        profile = self.character_profile or {}
        parts = []
        name = profile.get("name")
        if name:
            parts.append(f"Character: {name}")
        if profile.get("characteristics"):
            parts.extend(profile["characteristics"])
        if profile.get("knowledge_scope"):
            parts.append("Knowledge scope: " + ", ".join(profile["knowledge_scope"]))
        return " | ".join(parts)

    def _create_simple_response(self, context_data: List[Dict], language: str, is_specific_place: bool = False) -> str:
        if not context_data:
            return self._prompt_path(
                language,
                ("simple_response", "no_data"),
                default_th=(
                    "น้องปลาทูพร้อมให้ข้อมูลการท่องเที่ยวสมุทรสงครามให้คุณนะคะ "
                    "ลองถามเกี่ยวกับสถานที่ท่องเที่ยว ร้านอาหาร หรือที่พักในสมุทรสงครามได้เลยค่ะ "
                    "(ขออภัยที่ตอนนี้ยังไม่พบข้อมูลที่ตรงกับคำถามในฐานข้อมูล)"
                ),
                default_en=(
                    "I'm ready to provide tourism information about Samut Songkhram. "
                    "Feel free to ask about attractions, restaurants, or accommodations! "
                    "(Sorry, no matching data found in the database right now)"
                )
            )

        def summarize_entry(entry: Dict[str, Any], idx: int) -> str:
            name = entry.get("name") or entry.get("place_name") or "Unknown"
            location = entry.get("city") or entry.get("location", {}).get("district")
            description = (
                entry.get("description")
                or entry.get("place_information", {}).get("detail")
                or ""
            )
            highlights = entry.get("highlights") or entry.get("place_information", {}).get("highlights") or []
            best_time = entry.get("best_time") or entry.get("place_information", {}).get("best_time")
            tips = entry.get("tips") or entry.get("place_information", {}).get("tips")
            opening_hours = entry.get("opening_hours") or ""
            price_range = entry.get("price_range") or ""
            address = entry.get("address") or ""
            rating = entry.get("rating") or entry.get("place_information", {}).get("rating")
            attraction_type = entry.get("attraction_type", "")

            def join_highlights(items: Any) -> str:
                if isinstance(items, list):
                    return ", ".join(str(item) for item in items[:3])
                return str(items)

            # For specific place queries, provide guide-like detailed information
            if is_specific_place and len(context_data) == 1:
                if language == "th":
                    lines = [f"🌟 **{name}**"]
                    if attraction_type:
                        lines.append(f"📂 ประเภท: {attraction_type}")
                    if location:
                        lines.append(f"📍 พื้นที่: {location}")
                    if rating:
                        lines.append(f"⭐ คะแนน: {rating}")
                    if description:
                        lines.append(f"\n📖 **เรื่องราว**: {description}")
                    if highlights:
                        lines.append(f"\n✨ **ไฮไลต์**: {join_highlights(highlights)}")
                    if opening_hours:
                        lines.append(f"\n⏰ **เวลา**: {opening_hours}")
                    if price_range:
                        lines.append(f"💰 **ค่าใช้สอย**: {price_range}")
                    if address:
                        lines.append(f"📮 **ที่ตั้ง**: {address}")
                    if best_time:
                        lines.append(f"\n🌤️ **เวลาที่ดี**: {best_time}")
                    if tips:
                        lines.append(f"\n💡 **เคล็ดลับ**: {join_highlights(tips)}")
                else:
                    lines = [f"🌟 **{name}**"]
                    if attraction_type:
                        lines.append(f"📂 Type: {attraction_type}")
                    if location:
                        lines.append(f"📍 Area: {location}")
                    if rating:
                        lines.append(f"⭐ Rating: {rating}")
                    if description:
                        lines.append(f"\n📖 **About**: {description}")
                    if highlights:
                        lines.append(f"\n✨ **Highlights**: {join_highlights(highlights)}")
                    if opening_hours:
                        lines.append(f"\n⏰ **Hours**: {opening_hours}")
                    if price_range:
                        lines.append(f"💰 **Cost**: {price_range}")
                    if address:
                        lines.append(f"📮 **Address**: {address}")
                    if best_time:
                        lines.append(f"\n🌤️ **Best Time**: {best_time}")
                    if tips:
                        lines.append(f"\n💡 **Tips**: {join_highlights(tips)}")
            else:
                # For multiple places, use compact format
                if language == "th":
                    lines = [f"{idx}. {name}"]
                    if location:
                        lines.append(f"   📍 พื้นที่: {location}")
                    if description:
                        lines.append(f"   จุดเด่น: {description[:100]}..." if len(description) > 100 else f"   จุดเด่น: {description}")
                    if highlights:
                        lines.append(f"   ✨ {join_highlights(highlights)}")
                    if best_time:
                        lines.append(f"   ⏰ {best_time}")
                else:
                    lines = [f"{idx}. {name}"]
                    if location:
                        lines.append(f"   📍 Area: {location}")
                    if description:
                        lines.append(f"   Why visit: {description[:100]}..." if len(description) > 100 else f"   Why visit: {description}")
                    if highlights:
                        lines.append(f"   ✨ {join_highlights(highlights)}")
                    if best_time:
                        lines.append(f"   ⏰ {best_time}")
            return "\n".join(lines)

        intro_template = self._prompt_path(
            language,
            ("simple_response", "intro"),
            default_th=(
                "“น้องปลาทู” ได้เตรียมข้อมูลจากฐานข้อมูลสมุทรสงครามมาให้ {count} สถานที่ค่ะ "
                "รายละเอียดแต่ละจุดอยู่ด้านล่างเลยนะคะ:"
            ),
            default_en=(
                "Here are {count} verified Samut Songkhram spots that match your question. "
                "Check the details below:"
            )
        )
        outro = self._prompt_path(
            language,
            ("simple_response", "outro"),
            default_th="\nหากต้องการข้อมูลเพิ่มเติม สามารถถามเพิ่มได้เลยค่ะ 😊",
            default_en="\nFeel free to ask for more information! 😊"
        )

        max_entries = 3
        summaries = [
            summarize_entry(entry, idx)
            for idx, entry in enumerate(context_data[:max_entries], 1)
        ]
        if len(context_data) > max_entries:
            remaining_note = (
                f"\n... และยังมีอีก {len(context_data) - max_entries} สถานที่ที่เกี่ยวข้องค่ะ"
                if language == "th"
                else f"\n... plus {len(context_data) - max_entries} more related places."
            )
        else:
            remaining_note = ""

        body = "\n\n".join(summaries)
        if is_specific_place and len(context_data) == 1:
            return f"{intro_template}\n\n{body}{outro}"
        else:
            return f"{intro_template.format(count=len(context_data))}\n\n{body}{remaining_note}{outro}"

    def _prompt(self, key: str, language: str, *, default_th: str = "", default_en: str = "") -> str:
        return self._prompt_path(language, (key,), default_th=default_th, default_en=default_en)

    def _prompt_path(
        self,
        language: str,
        keys: tuple[str, ...],
        *,
        default_th: str = "",
        default_en: str = ""
    ) -> str:
        default_value = default_th if language == "th" else default_en
        node: Any = self.chatbot_prompts
        for key in keys:
            if not isinstance(node, dict):
                node = None
                break
            node = node.get(key)
        if isinstance(node, dict):
            return node.get(language, default_value)
        if isinstance(node, str):
            return node
        return default_value

    def _intent_from_topic(self, topic: Optional[str]) -> str:
        if not topic:
            return "general"
        mapping = {
            "general_travel": "attractions",
            "amphawa": "attractions",
            "bang_kung": "attractions",
            "khlong_khon": "attractions",
            "food": "restaurants",
            "accommodation": "accommodation",
            "transportation": "transportation",
        }
        return mapping.get(topic, "general")

    # ------------------------------------------------------------------
    # Basic GPT-only fallback (no DB enrichment)
    # ------------------------------------------------------------------
    def _pure_gpt_response(self, user_message: str, language: str) -> Dict[str, Any]:
        """Generate a response using only GPT and character persona (no structured data)."""
        character_note = self._character_context()
        preference_note = self._preference_context()
        system_hint_th = (
            "คุณคือน้องปลาทู แอดมิน AI ผู้ช่วยแนะนำการท่องเที่ยวจังหวัดสมุทรสงคราม "
            "ตอนนี้ฐานข้อมูลภายในยังไม่พร้อม ให้ตอบโดยใช้ความรู้ทั่วไปและรักษาคาแรกเตอร์ที่อบอุ่น เป็นมิตร และช่วยเหลือดี"
        )
        system_hint_en = (
            "You are Nong Pla Too, an AI travel assistant for Samut Songkhram. "
            "The internal database is currently unavailable; respond with general helpful knowledge while preserving the friendly persona."
        )
        if self.gpt_service:
            try:
                gpt_payload = self.gpt_service.generate_response(
                    user_query=user_message,
                    context_data=[],
                    data_type='travel',
                    intent='general',
                    data_status={
                        'success': False,
                        'message': 'Database unavailable; pure GPT persona response',
                        'data_available': False,
                        'source': 'none',
                        'preference_note': preference_note,
                        'character_note': character_note,
                    },
                    system_override=system_hint_th if language == 'th' else system_hint_th, # Force Thai persona instructions even for English to keep character
                )
                return {
                    'response': gpt_payload.get('response', ''),
                    'structured_data': [],
                    'language': language,
                    'source': 'gpt_fallback',
                    'intent': 'general',
                    'tokens_used': gpt_payload.get('tokens_used'),
                    'data_status': {
                        'success': False,
                        'message': 'Pure GPT fallback',
                        'data_available': False,
                        'source': 'none',
                        'preference_note': preference_note,
                        'character_note': character_note,
                    }
                }
            except Exception as exc:
                print(f"[ERROR] Pure GPT fallback failed: {exc}")
        # Static persona reply if GPT path fails
        if language == 'th':
            reply = (
                "สวัสดีค่ะ น้องปลาทูขออภัย ฐานข้อมูลยังไม่พร้อมใช้งานตอนนี้ "
                "หากต้องการสถานที่เที่ยว แนะนำให้ลองระบุกลุ่มสถานที่หรือบรรยากาศที่สนใจค่ะ"
            )
        else:
            reply = (
                "Hi! The internal database is currently unavailable. "
                "If you share the type of place or vibe you want, I can still help."
            )
        return {
            'response': reply,
            'structured_data': [],
            'language': language,
            'source': 'static_persona_fallback',
            'intent': 'general',
            'data_status': {
                'success': False,
                'message': 'Static persona fallback',
                'data_available': False,
                'source': 'none',
                'preference_note': preference_note,
                'character_note': character_note,
            }
        }

    def get_response(self, user_message: str, user_id: str = "default") -> Dict[str, Any]:
        language = self._detect_language(user_message)
        self._refresh_settings()
        trimmed_query = user_message.strip()
        normalized_query = trimmed_query.lower()
        dedup_key = self._normalized_query_key(trimmed_query) if trimmed_query else ""
        
        # Check response cache first (global level for common queries)
        global _RESPONSE_CACHE, _RESPONSE_CACHE_TIME
        current_time = time.time()
        if dedup_key in _RESPONSE_CACHE:
            cache_age = current_time - _RESPONSE_CACHE_TIME.get(dedup_key, 0)
            if cache_age < RESPONSE_CACHE_TTL_SECONDS:
                return dict(_RESPONSE_CACHE[dedup_key])  # Return copy to avoid mutations
            else:
                # Remove expired cache
                del _RESPONSE_CACHE[dedup_key]
                _RESPONSE_CACHE_TIME.pop(dedup_key, None)
        
        # Check user-specific duplicate cache
        cached_payload = self._replay_duplicate_response(user_id, dedup_key)
        if cached_payload:
            return cached_payload

        def finalize_response(payload: Dict[str, Any]) -> Dict[str, Any]:
            self._cache_response(user_id, dedup_key, payload)
            # Also cache at global level for common queries
            if dedup_key:
                _RESPONSE_CACHE[dedup_key] = dict(payload)
                _RESPONSE_CACHE_TIME[dedup_key] = time.time()
            return payload
        
        greetings_th = ("สวัสดี", "หวัดดี", "ดีจ้า", "สวัสดีค่ะ", "สวัสดีครับ")
        greetings_en = ("hello", "hi", "hey", "greetings")
        if trimmed_query and any(word in normalized_query for word in greetings_th + greetings_en):
            greeting_profile = self.character_profile.get("greeting", {}) if self.character_profile else {}
            if language == "th":
                greeting_text = greeting_profile.get(
                    "th",
                    "สวัสดีค่ะ! น้องปลาทูพร้อมช่วยแนะนำทริปในสมุทรสงครามให้เลยค่ะ"
                )
            else:
                greeting_text = greeting_profile.get(
                    "en",
                    "Hello! I'm Nong Pla Too, happy to help plan your Samut Songkhram adventures!"
                )
            return finalize_response({
                'response': greeting_text,
                'structured_data': [],
                'language': language,
                'source': 'greeting',
                'intent': 'greeting',
                'data_status': {
                    'success': True,
                    'message': 'Greeting response',
                    'data_available': False,
                    'source': 'local_json',
                    'preference_note': self._preference_context(),
                    'character_note': self._character_context()
                }
            })

        # Step 2: INTENT CLASSIFICATION
        intent_classification = self._classify_intent(user_message)
        intent_type = intent_classification["intent_type"]
        clean_question = intent_classification["clean_question"]
        
        # Parallelize keyword detection and matcher analysis for faster processing
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            analysis_future = executor.submit(
                self._interpret_query_keywords,
                clean_question
            ) if trimmed_query else None
            matcher_future = executor.submit(self._matcher_analysis, clean_question)
            
            analysis = analysis_future.result() if analysis_future else {"keywords": [], "places": []}
            matcher_signals = matcher_future.result()
        
        keyword_pool = self._merge_keywords(
            intent_classification.get("keywords") or [],
            analysis.get("keywords") or [],
            analysis.get("places") or [],
            matcher_signals.get("keywords") or [],
        )
        auto_keywords_used = False
        fallback_keywords: List[str] = []
        if not keyword_pool:
            fallback_keywords = self._auto_detect_keywords(user_message)
            if fallback_keywords:
                keyword_pool = self._merge_keywords(keyword_pool, fallback_keywords)
                auto_keywords_used = True

        matched_data = self._match_travel_data(
            user_message,
            keywords=keyword_pool,
            boost_keywords=matcher_signals.get("keywords"),
        )
        if not matched_data and not auto_keywords_used:
            fallback_keywords = self._auto_detect_keywords(user_message)
            if fallback_keywords:
                keyword_pool = self._merge_keywords(keyword_pool, fallback_keywords)
                matched_data = self._match_travel_data(
                    user_message,
                    keywords=keyword_pool,
                    boost_keywords=matcher_signals.get("keywords"),
                )
                auto_keywords_used = True
        existing_ids = {self._entry_identifier(entry) for entry in matched_data}
        existing_titles: set[str] = set()
        for entry in matched_data:
            if not isinstance(entry, dict):
                continue
            title = entry.get("place_name") or entry.get("name")
            title_key = self._normalize_name_token(title)
            if title_key:
                existing_titles.add(title_key)
        trip_matches = self._select_trip_guides_for_query(
            user_message,
            existing_ids,
            existing_titles,
        )
        if trip_matches:
            matched_data = self._merge_structured_data(matched_data, trip_matches)
        
        # Detect if this is a specific place query vs category query
        is_specific_place = self._is_specific_place_query(user_message, matched_data)
        
        # Trim results based on query type (1 for specific place, 4-5 for categories)
        matched_data = self._trim_structured_results(matched_data, is_specific_place=is_specific_place)
        
        preference_note = self._preference_context()
        character_note = self._character_context()
        includes_local_term = self._contains_local_reference(user_message)
        if not includes_local_term:
            includes_local_term = any(self._contains_local_reference(str(keyword)) for keyword in keyword_pool)
        if matcher_signals.get("is_local"):
            includes_local_term = True
        
        # Google Search Fallback: If no data found in database, try web search
        if not matched_data and includes_local_term:
            logger.info(f"No database results for query: {user_message}")
            logger.info("Attempting Google search fallback...")
            
            try:
                google_results = self._google_search_fallback(
                    query=user_message,
                    keywords=keyword_pool,
                    limit=3
                )
                
                if google_results:
                    matched_data = google_results
                    print(f"[INFO] Google fallback successful: {len(google_results)} results")
                else:
                    print("[WARN] Google fallback returned no results")
            except Exception as e:
                print(f"[ERROR] Google fallback failed: {e}")
                import traceback
                traceback.print_exc()
        
        mentions_other_province = (
            not includes_local_term
            and self._mentions_other_province(user_message, keyword_pool, analysis.get("places", []))
        )
        detected_intent = intent_type  # Use new intent classification (specific/general)
        data_status = {
            'intent_type': intent_type,  # Add intent type to status
            'success': bool(matched_data),
            'message': (
                f"Matched {len(matched_data)} entries" + 
                (" from web search" if matched_data and matched_data[0].get('source') == 'google_search' else " using keywords: " + str(keyword_pool))
                if matched_data else
                f"No Samut Songkhram entries matched for keywords: {keyword_pool}"
            ),
            'data_available': bool(matched_data),
            'source': 'google_search_fallback' if (matched_data and matched_data[0].get('source') == 'google_search') else 'local_json',
            'preference_note': preference_note,
            'character_note': character_note,
            'matching_signals': {
                'topic': matcher_signals.get("topic"),
                'topic_confidence': round(float(matcher_signals.get("confidence", 0.0)), 3),
                'is_local': matcher_signals.get("is_local"),
                'keywords': keyword_pool,
            },
        }

        if mentions_other_province:
            warning_message = (
                "น้องปลาทูจะให้ข้อมูลได้ชัดเจนและครอบคลุม หากถามข้อมูลในจังหวัดสมุทรสงครามค่ะ ขออภัยด้วยนะคะ"
            )
            return finalize_response({
                'response': warning_message,
                'structured_data': [],
                'language': language,
                'source': 'out_of_scope',
                'intent': 'general',
                'data_status': {
                    **data_status,
                    'message': 'Out of supported province scope',
                    'data_available': False
                }
            })

        if not user_message.strip():
            simple_msg = self._prompt(
                "empty_query",
                language,
                default_th="กรุณาพิมพ์คำถามเกี่ยวกับการท่องเที่ยวในสมุทรสงครามนะคะ",
                default_en="Please share a travel question for Samut Songkhram."
            )
            return finalize_response({
                'response': simple_msg,
                'structured_data': [],
                'language': language,
                'source': 'empty_query',
                'data_status': data_status
            })

        if self.gpt_service:
            try:
                gpt_result = self.gpt_service.generate_response(
                    user_query=clean_question,
                    context_data=matched_data,
                    data_type='travel',
                    intent=detected_intent,
                    intent_type=intent_type,
                    data_status=data_status
                )

                return finalize_response({
                    'response': gpt_result['response'],
                    'structured_data': matched_data,
                    'language': language,
                    'source': gpt_result.get('source', 'openai'),
                    'intent': detected_intent,
                    'tokens_used': gpt_result.get('tokens_used'),
                    'data_status': data_status,
                    'character_note': character_note
                })
                
            except Exception as e:
                print(f"[ERROR] GPT generation failed: {e}")
                simple_response = self._create_simple_response(matched_data, language, is_specific_place=is_specific_place)
                return finalize_response({
                    'response': simple_response,
                    'structured_data': matched_data,
                    'language': language,
                    'source': 'simple_fallback',
                    'intent': detected_intent,
                    'gpt_error': str(e),
                    'data_status': data_status
                })
        else:
            simple_response = self._create_simple_response(matched_data, language, is_specific_place=is_specific_place)
            return finalize_response({
                'response': simple_response,
                'structured_data': matched_data,
                'language': language,
                'source': 'simple',
                'intent': detected_intent,
                'data_status': data_status
            })

    def get_response_stream(self, user_message: str, user_id: str = "default"):
        """Stream response chunks for gradual text output."""
        language = self._detect_language(user_message)
        self._refresh_settings()
        trimmed_query = user_message.strip()
        normalized_query = trimmed_query.lower()
        
        # Handle greetings
        greetings_th = ("สวัสดี", "หวัดดี", "ดีจ้า", "สวัสดีค่ะ", "สวัสดีครับ")
        greetings_en = ("hello", "hi", "hey", "greetings")
        if trimmed_query and any(word in normalized_query for word in greetings_th + greetings_en):
            greeting_profile = self.character_profile.get("greeting", {}) if self.character_profile else {}
            if language == "th":
                greeting_text = greeting_profile.get(
                    "th",
                    "สวัสดีค่ะ! น้องปลาทูพร้อมช่วยแนะนำทริปในสมุทรสงครามให้เลยค่ะ"
                )
            else:
                greeting_text = greeting_profile.get(
                    "en",
                    "Hello! I'm Nong Pla Too, happy to help plan your Samut Songkhram adventures!"
                )
            yield {"type": "text", "text": greeting_text}
            yield {"type": "done", "language": language, "source": "greeting"}
            return

        # Intent classification
        intent_classification = self._classify_intent(user_message)
        intent_type = intent_classification["intent_type"]
        clean_question = intent_classification["clean_question"]
        
        # Send intent info
        yield {"type": "intent", "intent_type": intent_type}
        
        # Analyze and match data
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            analysis_future = executor.submit(self._interpret_query_keywords, clean_question) if trimmed_query else None
            matcher_future = executor.submit(self._matcher_analysis, clean_question)
            
            analysis = analysis_future.result() if analysis_future else {"keywords": [], "places": []}
            matcher_signals = matcher_future.result()
        
        keyword_pool = self._merge_keywords(
            intent_classification.get("keywords") or [],
            analysis.get("keywords") or [],
            analysis.get("places") or [],
            matcher_signals.get("keywords") or [],
        )
        
        if not keyword_pool:
            fallback_keywords = self._auto_detect_keywords(user_message)
            if fallback_keywords:
                keyword_pool = self._merge_keywords(keyword_pool, fallback_keywords)

        matched_data = self._match_travel_data(user_message, keywords=keyword_pool, boost_keywords=matcher_signals.get("keywords"))
        
        # Send structured data
        if matched_data:
            yield {"type": "structured_data", "data": matched_data[:5]}
        
        preference_note = self._preference_context()
        character_note = self._character_context()
        
        data_status = {
            'intent_type': intent_type,
            'success': bool(matched_data),
            'message': f"Matched {len(matched_data)} entries" if matched_data else "No matches found",
            'data_available': bool(matched_data),
            'source': 'local_json',
            'preference_note': preference_note,
            'character_note': character_note,
        }
        
        # Check for empty query
        if not user_message.strip():
            simple_msg = self._prompt("empty_query", language, 
                                     default_th="กรุณาพิมพ์คำถามเกี่ยวกับการท่องเที่ยวในสมุทรสงครามนะคะ",
                                     default_en="Please share a travel question for Samut Songkhram.")
            yield {"type": "text", "text": simple_msg}
            yield {"type": "done", "language": language, "source": "empty_query"}
            return
        
        # Stream GPT response
        if self.gpt_service:
            try:
                for chunk in self.gpt_service.generate_response_stream(
                    user_query=clean_question,
                    context_data=matched_data,
                    data_type='travel',
                    intent=intent_type,
                    intent_type=intent_type,
                    data_status=data_status
                ):
                    yield chunk
            except Exception as e:
                logger.error(f"GPT streaming failed: {e}")
                yield {"type": "error", "message": str(e)}
        else:
            # Fallback to simple response
            simple_response = self._create_simple_response(matched_data, language, is_specific_place=(intent_type == 'specific'))
            yield {"type": "text", "text": simple_response}
            yield {"type": "done", "language": language, "source": "simple", "structured_data": matched_data}


_CHATBOT: Optional[TravelChatbot] = None


def chat_with_bot(message: str, user_id: str = "default") -> str:
    global _CHATBOT
    if _CHATBOT is None:
        _CHATBOT = TravelChatbot()
    
    result = _CHATBOT.get_response(message, user_id)
    return result['response']


def chat_with_bot_stream(message: str, user_id: str = "default"):
    """Streaming version of chat_with_bot that yields SSE chunks."""
    global _CHATBOT
    if _CHATBOT is None:
        _CHATBOT = TravelChatbot()
    
    # Yield chunks from the streaming response
    for chunk in _CHATBOT.get_response_stream(message, user_id):
        yield chunk


def get_chat_response(message: str, user_id: str = "default") -> Dict[str, Any]:
    global _CHATBOT
    if _CHATBOT is None:
        _CHATBOT = TravelChatbot()
    language = _CHATBOT._detect_language(message)

    # Detect DB connectivity (adaptive branch)
    db_connected = False
    if DB_SERVICE_AVAILABLE:
        # Bound DB connectivity check to avoid blocking the API when DB is unreachable
        try:
            svc = get_db_service()
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(svc.test_connection)
                try:
                    db_connected = future.result(timeout=5)  # Increased to 5 seconds for remote DB
                except concurrent.futures.TimeoutError:
                    logger.warning("DB connectivity check timed out; proceeding without DB")
                    db_connected = False
        except Exception as exc:
            logger.warning(f"DB connectivity check failed: {exc}")
            db_connected = False

    if not db_connected:
        result = _CHATBOT._pure_gpt_response(message, language)
    else:
        result = _CHATBOT.get_response(message, user_id)

    # Attach model + character info uniformly
    try:
        model_params = PROMPT_REPO.get_model_params()
        result['model'] = model_params.get('default_model', 'gpt-4o')
    except Exception:
        result['model'] = 'gpt-4o'
    try:
        result['character'] = (_CHATBOT.character_profile or {}).get('name', 'NongPlaToo')
    except Exception:
        result['character'] = 'NongPlaToo'
    # Add source qualifier for clarity
    if not db_connected and result.get('source') and 'fallback' in result['source']:
        result['source'] = result['source'] + '_no_db'
    elif db_connected and result.get('source') and 'openai' in result['source']:
        result['source'] = 'data+ai'
    elif db_connected and result.get('source') == 'simple':
        result['source'] = 'data+simple'
    return result


if __name__ == "__main__":
    print("NongPlaToo GPT Travel Assistant ready. Type 'quit' to exit.")
    bot = TravelChatbot()
    
    while True:
        user_text = input("\nYou: ")
        if user_text.strip().lower() in {"quit", "exit", "bye"}:
            break
        
        result = bot.get_response(user_text)
        
        print(f"\nBot ({result['source']}): {result['response']}")
        
        if result.get('structured_data'):
            print(f"\n[Structured items: {len(result['structured_data'])}]")

        
        if result.get('tokens_used'):
            print(f"[Tokens: {result['tokens_used']}]")
