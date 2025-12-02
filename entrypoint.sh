#!/bin/bash
# Entrypoint script for Coolify deployment
# This ensures proper environment variable handling and database initialization

set -e

echo "🚀 Starting NongPlatoo.Ai..."

# Load environment variables from backend/.env if it exists
if [ -f backend/.env ]; then
    echo "📝 Loading environment variables from backend/.env"
    export $(cat backend/.env | grep -v '^#' | xargs)
fi

# Set default PORT if not provided by Coolify
export PORT=${PORT:-8000}
echo "🔌 Using PORT: $PORT"

# Initialize database if needed
# DISABLED FOR COOLIFY DEPLOYMENT - AI will use OpenAI API and JSON files only
echo "⚠️ Database initialization disabled (using OpenAI API and JSON files)"
# python -c "from backend.db import init_db; init_db()" || echo "⚠️ Database initialization skipped or failed (may already be initialized)"

# Start gunicorn
echo "✅ Starting Gunicorn on 0.0.0.0:$PORT"
exec gunicorn -b 0.0.0.0:$PORT -w 4 -t 120 --access-logfile - app:app
