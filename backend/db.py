"""Database helpers and models for the project.

This module provides:

1. SQLAlchemy ORM models:
   - Place          → maps to `places` table
   - MessageFeedback → maps to `message_feedback` table

2. Connection / session helpers:
   - get_db_url()
   - get_engine()
   - get_session_factory()
   - get_db()
   - init_db()

3. High-level utilities for place search (all use SQL-level filtering):
   - search_places(keyword, limit, attraction_type=None) → search with optional attraction_type filter
   - search_main_attractions(keyword, limit) → ONLY primary tourist attractions
   - get_attractions_by_type(attraction_type, limit) → all places of a specific type

4. Generic database utilities (work with ANY table in the database):
   - list_tables()                      → list all table names
   - fetch_rows(table_name, limit)      → fetch rows from any table as dicts
   - search_any_table(keyword, limit)   → search all tables' text columns
"""

from __future__ import annotations

import os
import json
import re
from typing import Any, Dict, Generator, Iterable, List

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional dependency during runtime
    load_dotenv = None  # type: ignore

from sqlalchemy import (
    Column,
    Integer,
    Numeric,
    String,
    text,
    Text,
    Boolean,
    create_engine,
    or_,
    select,
    MetaData,
    Table,
    inspect,
    DateTime,
    func,
    cast,
)
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker
from sqlalchemy.exc import SQLAlchemyError

try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    Vector = None  # type: ignore

from .constants import DEFAULT_SEARCH_LIMIT, MAX_ATTRACTIONS_LIMIT

if load_dotenv:
    # Automatically pull DATABASE_URL, OPENAI_API_KEY, etc. from .env files.
    # Load from the backend directory's .env file
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
    else:
        # Fallback to default behavior (searches parent directories)
        load_dotenv()


Base = declarative_base()


class Place(Base):
    """ORM model mapping the ``places`` table (existing schema)."""

    __tablename__ = "places"

    # Actual columns in the database (verified via check_images.py)
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    category = Column(String)
    description = Column(Text)
    address = Column(Text)
    latitude = Column(Numeric(9, 6))
    longitude = Column(Numeric(9, 6))
    opening_hours = Column(Text)
    price_range = Column(Text)
    image_url = Column(Text)
    attraction_type = Column(String)
    # Vector column for semantic search (pgvector) - matches database column name
    description_embedding = Column(Vector(384), nullable=True) if Vector else Column(Text, nullable=True)
    google_maps_link = Column(String, nullable=True)

    def to_dict(self) -> Dict[str, object]:
        """Convert to dict with chatbot-compatible field names and defaults."""
        # Extract city from address if available
        city_value = ""
        if self.address is not None:
            # Try to extract city/district from address
            city_match = re.search(r"(อำเภอ|อ\.)\s*([^\s,]+)", str(self.address))
            if city_match:
                city_value = city_match.group(2)

        # Build type list from category/attraction type
        type_candidates: list[str] = []
        for val in (self.attraction_type, self.category):
            if isinstance(val, str) and val.strip():
                type_candidates.append(val)
        type_value = type_candidates

        # Normalize image_url from various formats (JSON list, comma/semicolon/pipe/newline separated)
        def _parse_images(raw: Any) -> list[str]:
            urls: list[str] = []
            if isinstance(raw, (list, tuple, set)):
                urls = [str(u).strip() for u in raw if u]
            elif isinstance(raw, str):
                stripped = raw.strip()
                # Try JSON array first
                if stripped.startswith("["):
                    try:
                        parsed = json.loads(stripped)
                        if isinstance(parsed, list):
                            urls = [str(u).strip() for u in parsed if u]
                    except Exception:
                        urls = []
                if not urls:
                    # Fallback split by common delimiters
                    for token in re.split(r"[,;|\n]+", stripped):
                        token = token.strip()
                        if token:
                            urls.append(token)
            # Deduplicate while preserving order
            seen = set()
            deduped: list[str] = []
            for u in urls:
                if u and u not in seen:
                    seen.add(u)
                    deduped.append(u)
            return deduped

        images = _parse_images(self.image_url)

        def _to_float(value: Any) -> float | None:
            try:
                return float(value) if value is not None else None
            except (TypeError, ValueError):
                return None

        # Build google maps link if missing but coordinates exist
        maps_link = self.google_maps_link
        if not maps_link and self.latitude and self.longitude:  # type: ignore
            maps_link = f"https://www.google.com/maps/search/?api=1&query={self.latitude},{self.longitude}"

        return {
            "id": str(self.id),
            "name": self.name,
            "place_name": self.name,  # Use name as place_name
            "description": self.description,
            "address": self.address,
            "latitude": _to_float(self.latitude),
            "longitude": _to_float(self.longitude),
            "opening_hours": self.opening_hours,
            "price_range": self.price_range,
            "city": city_value,
            "province": "สมุทรสงคราม",  # Default province
            "type": type_value,
            "category": self.category,
            "rating": None,
            "reviews": None,
            "tags": type_value,
            "highlights": type_value,
            "place_information": {
                "detail": self.description,
                "category_description": self.category or (type_value[0] if type_value else None),
            },
            "images": images,
            "attraction_type": self.attraction_type,
            "source": "database",
            "google_maps_link": maps_link,
        }

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"Place(id={self.id!r}, name={self.name!r}, category={self.category!r})"


class MessageFeedback(Base):
    """ORM model for storing AI response feedback (likes/dislikes)."""
    
    __tablename__ = "message_feedback"
    
    id = Column(Integer, primary_key=True)
    message_id = Column(String, nullable=False)  # character varying
    user_id = Column(String, nullable=False)  # character varying
    user_message = Column(Text, nullable=True)  # text
    ai_response = Column(Text, nullable=True)  # text
    feedback_type = Column(String, nullable=False)  # character varying
    feedback_comment = Column(Text, nullable=True)  # text
    intent = Column(String, nullable=True)  # character varying
    source = Column(String, nullable=True)  # character varying
    created_at = Column(DateTime, default=func.now())  # timestamp without time zone
    chat_log_id = Column(Integer, nullable=True)  # integer - Reference to chat_logs table
    
    def to_dict(self) -> Dict[str, object]:
        return {
            "id": self.id,
            "message_id": self.message_id,
            "user_id": self.user_id,
            "user_message": self.user_message,
            "ai_response": self.ai_response,
            "feedback_type": self.feedback_type,
            "feedback_comment": self.feedback_comment,
            "intent": self.intent,
            "source": self.source,
            "created_at": self.created_at.isoformat() if self.created_at is not None else None,
            "chat_log_id": self.chat_log_id,
        }
    
    def __repr__(self) -> str:
        return f"MessageFeedback(id={self.id!r}, message_id={self.message_id!r}, feedback_type={self.feedback_type!r})"


class UserActivityLog(Base):
    """ORM model for tracking user activities (clicks, views, etc.)."""
    
    __tablename__ = "user_activity_logs"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String, nullable=True)  # NULL for anonymous users
    action_type = Column(String, nullable=False)  # 'click', 'view', 'scroll', etc.
    target_element = Column(String)  # Element that was interacted with
    page_url = Column(Text)  # URL where action occurred
    meta_data = Column(Text)  # JSON string for additional data
    ip_address = Column(String)  # User's IP address
    user_agent = Column(String(500))  # Browser/Device info
    created_at = Column(DateTime, default=func.now())
    
    def to_dict(self) -> Dict[str, object]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "action_type": self.action_type,
            "target_element": self.target_element,
            "page_url": self.page_url,
            "meta_data": self.meta_data,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "created_at": self.created_at.isoformat() if self.created_at is not None else None,
        }
    
    def __repr__(self) -> str:
        return f"UserActivityLog(id={self.id!r}, action_type={self.action_type!r}, user_id={self.user_id!r})"


class ChatLog(Base):
    """ORM model for storing chat conversations with AI statistics."""
    
    __tablename__ = "chat_logs"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=True)
    session_id = Column(Integer, nullable=True)  # DB has INTEGER type
    
    user_message = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=False)
    
    model_name = Column(String(50))
    tokens_used = Column(Integer)
    prompt_tokens = Column(Integer)
    latency_ms = Column(Integer)
    
    created_at = Column(DateTime, default=func.now())
    
    def to_dict(self) -> Dict[str, object]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "user_message": self.user_message,
            "ai_response": self.ai_response,
            "model_name": self.model_name,
            "tokens_used": self.tokens_used,
            "prompt_tokens": self.prompt_tokens,
            "latency_ms": self.latency_ms,
            "created_at": self.created_at.isoformat() if self.created_at is not None else None,
        }
    
    def __repr__(self) -> str:
        return f"ChatLog(id={self.id!r})"


class LocationCache(Base):
    """ORM model for caching geocoded location coordinates from Nominatim."""
    
    __tablename__ = "location_cache"
    
    id = Column(Integer, primary_key=True)
    location_name = Column(String(500), nullable=False, unique=True)  # "วิทยาลัยเทคนิคสมุทรสงคราม"
    latitude = Column(Numeric(9, 6), nullable=False)
    longitude = Column(Numeric(9, 6), nullable=False)
    source = Column(String(50), default="nominatim")  # "nominatim", "manual", "google"
    created_at = Column(DateTime, default=func.now())
    
    def to_dict(self) -> Dict[str, object]:
        return {
            "id": self.id,
            "location_name": self.location_name,
            "latitude": float(self.latitude) if self.latitude is not None else None,  # type: ignore
            "longitude": float(self.longitude) if self.longitude is not None else None,  # type: ignore
            "source": self.source,
            "created_at": self.created_at.isoformat() if self.created_at is not None else None,
        }
    
    def __repr__(self) -> str:
        return f"LocationCache(id={self.id!r}, name={self.location_name!r})"


class News(Base):
    """ORM model for news articles."""
    
    __tablename__ = "news"
    
    id = Column(Integer, primary_key=True)
    title = Column(String(500), nullable=False)  # English title
    title_th = Column(String(500), nullable=False)  # Thai title
    summary = Column(Text, nullable=True)  # English summary
    summary_th = Column(Text, nullable=True)  # Thai summary
    content = Column(Text, nullable=True)  # English full content
    content_th = Column(Text, nullable=True)  # Thai full content
    category = Column(String(100), nullable=True)  # e.g., "กิจกรรม", "ข่าวท้องถิ่น"
    image_url = Column(String(1000), nullable=True)
    author = Column(String(200), nullable=True)
    views = Column(Integer, default=0)
    is_published = Column(Boolean, default=True)
    published_at = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    def to_dict(self) -> Dict[str, object]:
        return {
            "id": self.id,
            "title": self.title,
            "title_th": self.title_th,
            "summary": self.summary,
            "summary_th": self.summary_th,
            "content": self.content,
            "content_th": self.content_th,
            "category": self.category,
            "image_url": self.image_url,
            "author": self.author,
            "views": self.views,
            "is_published": self.is_published,
            "published_at": self.published_at.isoformat() if self.published_at is not None else None,
            "created_at": self.created_at.isoformat() if self.created_at is not None else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at is not None else None,
        }
    
    def __repr__(self) -> str:
        return f"News(id={self.id!r}, title_th={self.title_th!r})"


def get_cached_location(location_name: str) -> Dict[str, float] | None:
    """Get cached coordinates for a location name.
    
    Returns:
        {"lat": 13.xxx, "lng": 100.xxx, "source": "cache"} or None
    """
    try:
        init_db()
        session_factory = get_session_factory()
        
        with session_factory() as session:
            cached = session.query(LocationCache).filter(
                LocationCache.location_name.ilike(f"%{location_name}%")
            ).first()
            
            if cached:
                print(f"[CACHE HIT] Location '{location_name}' found in cache")
                result: Dict[str, float] = {
                    "lat": float(cached.latitude),
                    "lng": float(cached.longitude)
                }
                return result
        return None
    except Exception as e:
        print(f"[WARN] Location cache lookup failed: {e}")
        return None


def save_location_to_cache(location_name: str, lat: float, lng: float, source: str = "nominatim") -> bool:
    """Save geocoded location to cache for future use.
    
    Returns:
        True if saved successfully, False otherwise
    """
    try:
        init_db()
        session_factory = get_session_factory()
        
        with session_factory() as session:
            # Check if already exists
            existing = session.query(LocationCache).filter(
                LocationCache.location_name == location_name
            ).first()
            
            if existing:
                return True  # Already cached
            
            new_cache = LocationCache(
                location_name=location_name,
                latitude=lat,
                longitude=lng,
                source=source
            )
            session.add(new_cache)
            session.commit()
            print(f"[CACHE] Saved location '{location_name}' to cache ({lat}, {lng})")
            return True
            
    except Exception as e:
        print(f"[WARN] Failed to save location to cache: {e}")
        return False


def save_google_place_to_db(place_data: Dict[str, Any]) -> bool:
    """Save a Google Places result to our places table for future use.
    
    Returns:
        True if saved successfully, False otherwise
    """
    try:
        init_db()
        session_factory = get_session_factory()
        
        with session_factory() as session:
            # Check if already exists by name (place_id column doesn't exist)
            place_name = place_data.get('name', '')
            if not place_name:
                return False
                
            existing = session.query(Place).filter(
                Place.name == place_name
            ).first()
            
            if existing:
                return True  # Already in DB
            
            # Create new Place entry (without place_id - column doesn't exist)
            new_place = Place(
                name=place_name,
                category=place_data.get('category', 'From Google Maps'),
                description=place_data.get('description', ''),
                address=place_data.get('address', ''),
                latitude=place_data.get('latitude'),
                longitude=place_data.get('longitude'),
                attraction_type='google_cached'
            )
            session.add(new_place)
            session.commit()
            print(f"[DB] Saved Google place '{place_name}' to database")
            return True
            
    except Exception as e:
        print(f"[WARN] Failed to save Google place to DB: {e}")
        return False

def get_db_url() -> str:
    """Resolve the database URL.

    Priority order:
    1. `DATABASE_URL` environment variable (Coolify usually provides this).
    2. Build URL from `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_HOST` /
       `POSTGRES_PORT` / `POSTGRES_DB`.
    3. Fallback to a sensible local Postgres URL used for development.

    Supports an optional SSL mode via `PGSSLMODE` or `DB_SSLMODE` which will
    be appended as a query parameter.
    """
    url = os.getenv("DATABASE_URL")
    if url:
        # Clean up if the env variable accidentally includes the key name
        # This can happen with some .env file parsing issues
        if url.startswith("DATABASE_URL="):
            url = url.replace("DATABASE_URL=", "", 1)
            print(f"[WARN] DATABASE_URL had 'DATABASE_URL=' prefix, cleaned it")
        return url

    # Try common Postgres environment variables (Coolify and other PaaS)
    pg_user = os.getenv("POSTGRES_USER") or os.getenv("DB_USER") or os.getenv("PGUSER")
    pg_password = (
        os.getenv("POSTGRES_PASSWORD")
        or os.getenv("DB_PASSWORD")
        or os.getenv("PGPASSWORD")
        or ""
    )
    pg_host = (
        os.getenv("POSTGRES_HOST")
        or os.getenv("DB_HOST")
        or os.getenv("PGHOST")
        or "localhost"
    )
    pg_port = (
        os.getenv("POSTGRES_PORT")
        or os.getenv("DB_PORT")
        or os.getenv("PGPORT")
        or "5432"
    )
    pg_db = (
        os.getenv("POSTGRES_DB")
        or os.getenv("DB_NAME")
        or os.getenv("PGDATABASE")
        or "worldjourney"
    )

    if pg_user:
        base = f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_db}"

        # Optional SSL mode support
        sslmode = (
            os.getenv("PGSSLMODE")
            or os.getenv("DB_SSLMODE")
            or os.getenv("SQLALCHEMY_SSLMODE")
        )
        if sslmode:
            # If the base already contains query params (unlikely here) we should append with &
            sep = "&" if "?" in base else "?"
            return f"{base}{sep}sslmode={sslmode}"

        return base

    # Final fallback for local development only
    print(
        "[WARN] DATABASE_URL is not set and POSTGRES_* vars not found; "
        "falling back to default postgres URL"
    )
    return "postgresql://postgres:YOUR_LOCAL_PASSWORD@localhost:5432/worldjourney"


_ENGINE: Engine | None = None
_SESSION_FACTORY: sessionmaker | None = None
_SENTENCE_MODEL = None


def get_engine() -> Engine:
    """Return a singleton SQLAlchemy Engine."""
    global _ENGINE
    if _ENGINE is None:
        connect_timeout_seconds = int(os.getenv("DB_CONNECT_TIMEOUT_SECONDS", "3"))
        _ENGINE = create_engine(
            get_db_url(), 
            future=True, 
            pool_pre_ping=True,
            connect_args={
                # Fail fast if database is unreachable to avoid API timeouts
                'connect_timeout': connect_timeout_seconds,
                'options': '-c statement_timeout=30000'
            }
        )
    return _ENGINE


def get_session_factory() -> sessionmaker:
    """Return a singleton session factory."""
    global _SESSION_FACTORY
    if _SESSION_FACTORY is None:
        _SESSION_FACTORY = sessionmaker(
            bind=get_engine(), autoflush=False, autocommit=False, future=True
        )
    return _SESSION_FACTORY


def init_db() -> None:
    """Create ORM-declared tables if they do not exist yet."""
    Base.metadata.create_all(get_engine())


def get_db() -> Generator[Session, None, None]:
    """Yield a managed SQLAlchemy session (FastAPI-compatible helper)."""
    session_factory = get_session_factory()
    session: Session = session_factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


# ---------------------------------------------------------------------------
# Domain-specific search over the tourism tables
# ---------------------------------------------------------------------------


def search_places(
    keyword: str, 
    limit: int = DEFAULT_SEARCH_LIMIT, 
    attraction_type: str | None = None
) -> List[Dict[str, object]]:
    """
    Search ``places`` table for records containing ``keyword``.
    
    Optionally filter by attraction_type at SQL level.
    Classification is handled ONLY at database level - the AI never reclassifies places.

    Args:
        keyword: Search term to match against name, category, address, etc.
        limit: Maximum number of results to return
        attraction_type: Optional filter - if provided, ONLY return places with this exact attraction_type
                        Valid values: 'main_attraction', 'secondary_attraction', 'market', 'activity', 
                        'restaurant', 'cafe', etc.

    Returns:
        List of place dictionaries with database-classified attraction_type
        
    If any database error occurs, log it and return an empty list so that
    the chatbot can still answer using pure GPT instead of crashing the API.
    """
    try:
        init_db()
        session_factory = get_session_factory()
        kw = f"%{keyword}%"

        places_stmt = (
            select(Place)
            .where(
                or_(
                    Place.name.ilike(kw),
                    Place.category.ilike(kw),
                    Place.address.ilike(kw),
                    Place.description.ilike(kw),
                    Place.attraction_type.ilike(kw),
                )
            )
            .order_by(Place.id)
            .limit(limit)
        )

        with session_factory() as session:
            places_rows: Iterable[Place] = session.scalars(places_stmt)
            results: List[Dict[str, object]] = [place.to_dict() for place in places_rows]

        return results[:limit]

    except SQLAlchemyError as e:
        print(f"[WARN] search_places DB error: {e}")
        return []


def search_main_attractions(keyword: str, limit: int = DEFAULT_SEARCH_LIMIT) -> List[Dict[str, object]]:
    """
    Search for PRIMARY tourist attractions (attractions with attraction_type = 'main_attraction').
    
    This function is specifically for queries like "สถานที่ท่องเที่ยว" or "ที่เที่ยวหลัก"
    where the user wants to see main attractions only.
    
    Filtering is done ENTIRELY at SQL level - results are already classified by the database.
    The AI should NOT attempt to reclassify or filter results further.
    
    Args:
        keyword: Search term to match against place attributes
        limit: Maximum number of results (primary attractions only)
    
    Returns:
        List of place dictionaries filtered to ONLY main_attraction types
        
    If no main attractions are found, returns empty list - AI should explicitly 
    state "no primary attractions found for [keyword]"
    """
    return search_places(keyword, limit=limit, attraction_type="main_attraction")


def get_attractions_by_type(attraction_type: str, limit: int = MAX_ATTRACTIONS_LIMIT) -> List[Dict[str, object]]:
    """
    Retrieve ALL places with a specific category.
    
    Useful for browsing by category (e.g., "show me all markets" or "list all restaurants").
    Database-level filtering only - no AI reclassification.
    Searches only the category column.
    
    Args:
        attraction_type: The category keyword to filter by 
                        ('cafe', 'restaurant', 'market', 'activity', 'temple', etc.)
        limit: Maximum number of results
    
    Returns:
        List of all places with matching category
    """
    try:
        init_db()
        session_factory = get_session_factory()
        
        # Search only category column with case-insensitive matching
        places_stmt = (
            select(Place)
            .where(Place.category.ilike(f'%{attraction_type}%'))
            .order_by(Place.name.asc())
            .limit(limit)
        )

        with session_factory() as session:
            places_rows: Iterable[Place] = session.scalars(places_stmt)
            results: List[Dict[str, object]] = [place.to_dict() for place in places_rows]

        return results[:limit]

    except SQLAlchemyError as e:
        print(f"[WARN] get_attractions_by_type DB error: {e}")
        return []


def search_places_near_location(
    keyword: str,
    center_lat: float,
    center_lng: float,
    radius_km: float = 2.0,
    limit: int = DEFAULT_SEARCH_LIMIT
) -> List[Dict[str, object]]:
    """
    Search for places NEAR a specific location within a given radius.
    
    Uses Haversine formula at SQL level to calculate distances.
    Filters by keyword AND proximity.
    
    Args:
        keyword: Search term (e.g., "ร้านอาหาร", "คาเฟ่")
        center_lat: Latitude of the reference point
        center_lng: Longitude of the reference point
        radius_km: Search radius in kilometers (default: 2km)
        limit: Maximum number of results
    
    Returns:
        List of places sorted by distance from the center point
    """
    try:
        init_db()
        session_factory = get_session_factory()
        kw = f"%{keyword}%"
        
        # Haversine formula in SQL to calculate distance in kilometers
        # This calculates the great-circle distance between two points
        haversine_distance = (
            6371 * func.acos(
                func.cos(func.radians(center_lat)) *
                func.cos(func.radians(cast(Place.latitude, Numeric))) *
                func.cos(func.radians(cast(Place.longitude, Numeric)) - func.radians(center_lng)) +
                func.sin(func.radians(center_lat)) *
                func.sin(func.radians(cast(Place.latitude, Numeric)))
            )
        )
        
        # Query places that match keyword AND are within radius
        places_stmt = (
            select(Place, haversine_distance.label('distance'))
            .where(
                # Must have coordinates
                Place.latitude.isnot(None),
                Place.longitude.isnot(None),
                # Keyword filter
                or_(
                    Place.name.ilike(kw),
                    Place.category.ilike(kw),
                    Place.address.ilike(kw),
                    Place.description.ilike(kw),
                    Place.attraction_type.ilike(kw),
                ),
                # Proximity filter (within radius)
                haversine_distance <= radius_km
            )
            .order_by(haversine_distance.asc())  # Sort by nearest first
            .limit(limit)
        )

        with session_factory() as session:
            results: List[Dict[str, object]] = []
            for row in session.execute(places_stmt):
                place = row[0]  # Place object
                distance = row[1]  # Distance in km
                place_dict = place.to_dict()
                place_dict['_distance_km'] = round(float(distance), 2) if distance else None
                results.append(place_dict)
        
        if results:
            print(f"[INFO] Found {len(results)} places near ({center_lat}, {center_lng}) within {radius_km}km")
        else:
            print(f"[INFO] No places found near ({center_lat}, {center_lng}) for '{keyword}'")
        
        return results

    except SQLAlchemyError as e:
        print(f"[WARN] search_places_near_location DB error: {e}")
        return []



# ---------------------------------------------------------------------------
# Generic helpers: work with ANY table in the connected database
# ---------------------------------------------------------------------------


def list_tables() -> list[str]:
    """Return a list of all table names in the current database."""
    inspector = inspect(get_engine())
    return inspector.get_table_names()


def fetch_rows(table_name: str, limit: int = 100) -> list[dict[str, object]]:
    """
    Fetch up to `limit` rows from the given table as plain dicts.

    This works for any existing table in the database, even if we don't have
    an explicit ORM model for it.
    """
    engine = get_engine()
    metadata = MetaData()
    table = Table(table_name, metadata, autoload_with=engine)

    stmt = select(table).limit(limit)

    rows: list[dict[str, object]] = []
    with engine.connect() as conn:
        for row in conn.execute(stmt):
            rows.append(dict(row._mapping))  # row._mapping is a dict-like view
    return rows


def search_any_table(keyword: str, limit_per_table: int = 10) -> list[dict[str, object]]:
    """
    Search all tables for the keyword in text-like columns.

    Returns a list of dicts with an extra key:
        '__table__' → the source table name.

    This is intended for debugging, admin tools, or AI-driven data exploration.
    """
    engine = get_engine()
    inspector = inspect(engine)
    metadata = MetaData()

    kw = f"%{keyword}%"
    results: list[dict[str, object]] = []

    for table_name in inspector.get_table_names():
        table = Table(table_name, metadata, autoload_with=engine)

        # Pick only text-like columns
        text_cols = [
            col for col in table.c if isinstance(col.type, (String, Text))
        ]
        if not text_cols:
            continue

        # Build OR condition: col1 ILIKE '%kw%' OR col2 ILIKE '%kw%' ...
        cond = or_(*[col.ilike(kw) for col in text_cols])
        stmt = select(table).where(cond).limit(limit_per_table)

        with engine.connect() as conn:
            for row in conn.execute(stmt):
                row_dict = dict(row._mapping)
                row_dict["__table__"] = table_name
                results.append(row_dict)

    return results


# ---------------------------------------------------------------------------
# Semantic Search with pgvector
# ---------------------------------------------------------------------------

def search_places_semantic(
    query: str, 
    limit: int = DEFAULT_SEARCH_LIMIT
) -> List[Dict[str, object]]:
    """
    Semantic search using pgvector similarity (cosine distance).
    
    Requires:
    1. pgvector extension installed on PostgreSQL
    2. description_embedding column with generated embeddings
    3. sentence-transformers model for query embedding
    
    Args:
        query: Natural language search query (e.g., "romantic dinner spots")
        limit: Maximum number of results to return
    
    Returns:
        List of places sorted by semantic similarity, each with:
        - All standard place fields
        - similarity_score: cosine similarity (0-1, higher is better)
    
    Example:
        results = search_places_semantic("floating market", limit=5)
        for place in results:
            print(f"{place['name']}: {place['similarity_score']:.2f}")
    """
    if not Vector:
        print("[WARN] pgvector not installed - semantic search unavailable")
        return []
    
    # Global model cache to prevent reloading on every request
    global _SENTENCE_MODEL
    try:
        from sentence_transformers import SentenceTransformer
        if _SENTENCE_MODEL is None:
            print("[INFO] Loading SentenceTransformer model (first time)...")
            _SENTENCE_MODEL = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        model = _SENTENCE_MODEL
        
        # Generate embedding for the query
        query_embedding = model.encode(query)
        
        init_db()
        session_factory = get_session_factory()
        
        with session_factory() as session:
            # Find places with non-null embeddings
            # Cast distance to Float to prevent pgvector type processor from treating it as Vector
            from sqlalchemy import Float
            distance_expr = cast(Place.description_embedding.op('<=>')(query_embedding), Float)
            
            places_stmt = (
                select(
                    Place,
                    distance_expr.label('similarity')
                )
                .where(Place.description_embedding.isnot(None))
                .order_by(distance_expr)
                .limit(limit)
            )
            
            results: List[Dict[str, object]] = []
            # Execute and fetch all results
            rows = session.execute(places_stmt).all()
            
            # Debug: Print first row structure
            if rows:
                print(f"[DEBUG] First row type: {type(rows[0])}, len: {len(rows[0]) if hasattr(rows[0], '__len__') else 'N/A'}")
            
            for row in rows:
                try:
                    # Handle different row structures
                    if hasattr(row, 'Place'):
                        # Named tuple style
                        place = row.Place
                        similarity = row.similarity
                    elif hasattr(row, '__getitem__') and not isinstance(row, (int, float)):
                        # Tuple/list style
                        place = row[0]
                        similarity = row[1]
                    else:
                        print(f"[DEBUG] Unexpected row type: {type(row)}, value: {row}")
                        continue
                    
                    place_dict = place.to_dict()
                    # Normalize similarity
                    try:
                        sim_val = float(similarity)
                        place_dict['similarity_score'] = max(0.0, 1.0 - sim_val) 
                    except (ValueError, TypeError):
                        place_dict['similarity_score'] = 0.5
                    
                    results.append(place_dict)
                except Exception as row_err:
                    print(f"[DEBUG] Row processing error: {row_err}, row type: {type(row)}")
            
            print(f"[SEMANTIC SEARCH] Found {len(results)} results for '{query}'")
            return results
    
    except ImportError:
        print("[WARN] sentence-transformers not installed - semantic search unavailable")
        return []
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[WARN] Semantic search failed: {e}")
        return []


def search_places_hybrid(
    query: str,
    limit: int = DEFAULT_SEARCH_LIMIT,
    keyword_weight: float = 0.3
) -> List[Dict[str, object]]:
    """
    Hybrid search combining semantic search (70%) and keyword search (30%).
    
    This approach gives you the best of both worlds:
    - Semantic search finds conceptually similar places even with different keywords
    - Keyword search ensures exact matches are prioritized
    
    Args:
        query: Search query
        limit: Maximum results
        keyword_weight: How much to weight keyword search (0-1)
    
    Returns:
        List of places with combined_score (0-1)
    
    Example:
        results = search_places_hybrid("floating market", limit=10)
    """
    # Optimized: Fetch only 'limit' results instead of 'limit*2' to reduce query time
    semantic_results = search_places_semantic(query, limit=limit)
    keyword_results = search_places(query, limit=limit)
    
    # Create a scoring dict
    scores: Dict[int, Dict[str, object]] = {}
    
    # Add semantic scores
    for place in semantic_results:
        place_id = int(place.get('id', 0))  # type: ignore
        scores[place_id] = place.copy()
        scores[place_id]['semantic_score'] = place.get('similarity_score', 0)
        scores[place_id]['keyword_score'] = 0
    
    # Add keyword scores
    for place in keyword_results:
        place_id = int(place.get('id', 0))  # type: ignore
        if place_id not in scores:
            scores[place_id] = place.copy()
            scores[place_id]['semantic_score'] = 0
        scores[place_id]['keyword_score'] = 1.0  # Exact match
    
    # Calculate combined score
    for place_id in scores:
        semantic_score = float(scores[place_id].get('semantic_score', 0))  # type: ignore
        keyword_score = float(scores[place_id].get('keyword_score', 0))  # type: ignore
        scores[place_id]['combined_score'] = (
            semantic_score * (1 - keyword_weight) +
            keyword_score * keyword_weight
        )
    
    # Sort by combined score and return top limit
    sorted_results = sorted(
        scores.values(),
        key=lambda x: float(x.get('combined_score', 0)),  # type: ignore
        reverse=True
    )[:limit]
    
    return sorted_results


def get_similar_places(
    place_id: int,
    limit: int = 5
) -> List[Dict[str, object]]:
    """
    Find places similar to a given place using vector similarity.
    
    Great for "Related places" recommendations on place detail pages.
    
    Args:
        place_id: ID of the reference place
        limit: Number of similar places to return
    
    Returns:
        List of similar places sorted by similarity
    """
    if not Vector:
        print("[WARN] pgvector not available for similarity search")
        return []
    
    try:
        init_db()
        session_factory = get_session_factory()
        
        with session_factory() as session:
            # Get the reference place
            reference_place = session.query(Place).filter(Place.id == place_id).first()
            
            if not reference_place or reference_place.description_embedding is None:
                print(f"[INFO] Place {place_id} not found or has no embedding")
                return []
            
            # Find similar places - cast distance to Float
            from sqlalchemy import Float
            distance_expr = cast(Place.description_embedding.op('<=>')(reference_place.description_embedding), Float)
            
            places_stmt = (
                select(
                    Place,
                    distance_expr.label('distance')
                )
                .where(
                    Place.id != place_id,
                    Place.description_embedding.isnot(None)
                )
                .order_by(distance_expr)
                .limit(limit)
            )
            
            results: List[Dict[str, object]] = []
            for place, distance in session.execute(places_stmt):
                place_dict = place.to_dict()
                place_dict['similarity_score'] = 1 - float(distance)
                results.append(place_dict)
            
            return results
    
    except Exception as e:
        print(f"[WARN] Similar places search failed: {e}")
        return []
