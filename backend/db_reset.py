"""Utility to reset database engine - call this after updating connection settings."""
from db import reset_engine

if __name__ == "__main__":
    reset_engine()
    print("✓ Database engine reset successfully")
