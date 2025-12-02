"""
Launcher for the Flask backend so you can run `python app.py` from the repo root.
This forwards execution to `backend/app.py` without changing any backend code.
"""

from __future__ import annotations

import runpy
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"

# Ensure backend package is importable
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

if __name__ == "__main__":
    # Execute backend/app.py as if it were run directly
    runpy.run_module("app", run_name="__main__")
