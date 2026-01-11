"""
Lightweight page-visit counter stored on disk.

Tracks:
- total visits across the site
- per-path visits (normalized strings, e.g., "/", "/places", "/places/:id")
"""

from __future__ import annotations

import json
import os
import threading
from typing import Dict, Tuple

BASE_DIR = os.path.dirname(__file__)
DATA_FILE = os.path.join(BASE_DIR, "Data", "visit_counts.json")

_lock = threading.Lock()


def _ensure_dir() -> None:
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)


def _default_counts() -> Dict[str, object]:
    return {"total": 0, "pages": {}}


def _read_counts() -> Dict[str, object]:
    if not os.path.exists(DATA_FILE):
        return _default_counts()

    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, dict):
                return _default_counts()
            data.setdefault("total", 0)
            data.setdefault("pages", {})
            return data
    except Exception:
        # If the file is corrupted, start fresh but don't crash requests.
        return _default_counts()


def _write_counts(counts: Dict[str, object]) -> None:
    _ensure_dir()
    tmp_file = f"{DATA_FILE}.tmp"
    with open(tmp_file, "w", encoding="utf-8") as f:
        json.dump(counts, f, ensure_ascii=False, indent=2)
    os.replace(tmp_file, DATA_FILE)


def increment_visit(path: str) -> Tuple[int, int, Dict[str, int]]:
    """
    Increment visit counters.

    Returns: total_visits, page_visits, pages_map
    """
    normalized = normalize_path(path)

    with _lock:
        counts = _read_counts()
        total = int(counts.get("total", 0) or 0) + 1
        pages = counts.get("pages") or {}
        page_count = int(pages.get(normalized, 0) or 0) + 1

        counts["total"] = total
        pages[normalized] = page_count
        counts["pages"] = pages

        _write_counts(counts)

    return total, page_count, pages  # type: ignore[return-value]


def get_counts() -> Dict[str, object]:
    with _lock:
        return _read_counts()


def normalize_path(path: str | None) -> str:
    if not path:
        return "/"
    normalized = path.strip() or "/"
    if not normalized.startswith("/"):
        normalized = f"/{normalized}"
    return normalized

