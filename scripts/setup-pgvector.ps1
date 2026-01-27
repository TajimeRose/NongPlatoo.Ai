# pgvector Setup Script for World.Journey.Ai
# Run this script after updating docker-compose.yml and requirements.txt

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  pgvector Setup for World.Journey.Ai" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# Step 1: Check if Docker is running
Write-Host "[1/5] Checking Docker..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    Write-Host "  ✓ Docker is installed`n" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Docker is not running or not installed" -ForegroundColor Red
    Write-Host "  Please install Docker Desktop and try again`n" -ForegroundColor Red
    exit 1
}

# Step 2: Install pgvector Python package
Write-Host "[2/5] Installing pgvector Python package..." -ForegroundColor Yellow
try {
    pip install pgvector>=0.2.4
    Write-Host "  ✓ pgvector installed`n" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Could not install pgvector. Install manually: pip install pgvector`n" -ForegroundColor Yellow
}

# Step 3: Restart Docker containers with pgvector
Write-Host "[3/5] Restarting Docker containers with pgvector..." -ForegroundColor Yellow
try {
    Write-Host "  Stopping existing containers..." -ForegroundColor Gray
    docker-compose down
    
    Write-Host "  Starting containers with pgvector image..." -ForegroundColor Gray
    docker-compose up -d
    
    Write-Host "  Waiting for database to be ready..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
    
    Write-Host "  ✓ Containers restarted`n" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Could not restart containers. Run manually: docker-compose up -d`n" -ForegroundColor Yellow
}

# Step 4: Check database connection
Write-Host "[4/5] Checking database connection..." -ForegroundColor Yellow
try {
    docker-compose exec -T db psql -U postgres -d postgres -c "SELECT version();" | Out-Null
    Write-Host "  ✓ Database is accessible`n" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Could not connect to database`n" -ForegroundColor Yellow
}

# Step 5: Generate embeddings
Write-Host "[5/5] Generating embeddings for places..." -ForegroundColor Yellow
Write-Host "  This will take about 20-30 seconds for 128 places`n" -ForegroundColor Gray

try {
    python -m backend.generate_embeddings
} catch {
    Write-Host "`n  ⚠ Could not generate embeddings automatically" -ForegroundColor Yellow
    Write-Host "  Run manually: python -m backend.generate_embeddings`n" -ForegroundColor Yellow
}

# Summary
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Start your Flask server: python app.py" -ForegroundColor Gray
Write-Host "  2. Test semantic search:" -ForegroundColor Gray
Write-Host "     curl 'http://localhost:8000/api/places/search/semantic?q=floating%20market'" -ForegroundColor Gray
Write-Host ""
Write-Host "API Endpoints available:" -ForegroundColor White
Write-Host "  • /api/places/search/semantic  - Semantic search" -ForegroundColor Gray
Write-Host "  • /api/places/search/hybrid    - Hybrid search" -ForegroundColor Gray
Write-Host "  • /api/places/<id>/similar     - Similar places" -ForegroundColor Gray
Write-Host ""
Write-Host "Documentation: docs/PGVECTOR_SETUP.md`n" -ForegroundColor White
