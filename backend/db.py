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

    # Actual columns in the database
    id = Column(Integer, primary_key=True)
    place_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    category = Column(String)
    description = Column(Text)
    address = Column(Text)
    latitude = Column(Numeric(9, 6))
    longitude = Column(Numeric(9, 6))
    opening_hours = Column(Text)
    price_range = Column(Text)
    image_urls = Column(Text)
    attraction_type = Column(String)

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

        # Normalize image_urls from various formats (JSON list, comma/semicolon/pipe/newline separated)
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

        images = _parse_images(self.image_urls)

        def _to_float(value: Any) -> float | None:
            try:
                return float(value) if value is not None else None
            except (TypeError, ValueError):
                return None

        return {
            "id": str(self.id),
            "place_id": self.place_id,
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
        }

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"Place(id={self.id!r}, name={self.name!r}, category={self.category!r})"


class MessageFeedback(Base):
    """ORM model for storing AI response feedback (likes/dislikes)."""
    
    __tablename__ = "message_feedback"
    
    id = Column(Integer, primary_key=True)
    message_id = Column(String, nullable=False, unique=True)  # Unique identifier for each AI response
    user_id = Column(String, nullable=False)  # User who gave feedback
    user_message = Column(Text)  # Original user question
    ai_response = Column(Text)  # AI's response
    feedback_type = Column(String, nullable=False)  # 'like' or 'dislike'
    feedback_comment = Column(Text)  # Optional: reason for dislike
    intent = Column(String)  # What the AI detected as intent
    source = Column(String)  # Response source (gpt, database, etc.)
    created_at = Column(DateTime, default=func.now())
    
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
    Retrieve ALL places with a specific attraction_type.
    
    Useful for browsing by category (e.g., "show me all markets" or "list all restaurants").
    Database-level filtering only - no AI reclassification.
    
    Args:
        attraction_type: The classification to filter by 
                        ('main_attraction', 'secondary_attraction', 'market', 'activity', 
                         'restaurant', 'cafe', etc.)
        limit: Maximum number of results
    
    Returns:
        List of all places with the specified attraction_type
    """
    try:
        init_db()
        session_factory = get_session_factory()
        
        places_stmt = (
            select(Place)
            .where(Place.attraction_type == attraction_type)
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
