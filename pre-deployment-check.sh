#!/bin/bash
# Pre-deployment verification script for NongPlatoo.Ai
# Run this before deploying to verify everything is ready

echo "=========================================="
echo "NongPlatoo.Ai - Pre-Deployment Verification"
echo "=========================================="
echo ""

ERRORS=0
WARNINGS=0

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Check Python files
echo "🔍 Checking Python syntax..."
python -m py_compile app.py backend/chat.py backend/db.py backend/gpt_service.py 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Python files compile successfully"
else
    echo -e "${RED}✗${NC} Python syntax errors found"
    ERRORS=$((ERRORS + 1))
fi

# Check for required environment variables
echo ""
echo "🔍 Checking environment variables..."
REQUIRED_VARS=("OPENAI_API_KEY" "DATABASE_URL" "SECRET_KEY")
for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "$(eval echo \$$VAR)" ]; then
        # Try to read from .env
        if grep -q "^${VAR}=" .env; then
            echo -e "${YELLOW}⚠${NC} $VAR in .env (verify it's not placeholder)"
            WARNINGS=$((WARNINGS + 1))
        else
            echo -e "${RED}✗${NC} $VAR not found"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo -e "${GREEN}✓${NC} $VAR is set"
    fi
done

# Check Docker installation
echo ""
echo "🔍 Checking Docker..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker is installed"
    if command -v docker-compose &> /dev/null; then
        echo -e "${GREEN}✓${NC} Docker Compose is installed"
    else
        echo -e "${YELLOW}⚠${NC} Docker Compose not found (may use 'docker compose')"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠${NC} Docker not found (only needed for container deployment)"
    WARNINGS=$((WARNINGS + 1))
fi

# Check dependencies
echo ""
echo "🔍 Checking Python dependencies..."
if [ -f "backend/requirements.txt" ]; then
    echo -e "${GREEN}✓${NC} requirements.txt found"
    # Count packages
    PKG_COUNT=$(grep -c "^[^#]" backend/requirements.txt)
    echo "  - Found $PKG_COUNT packages"
else
    echo -e "${RED}✗${NC} requirements.txt not found"
    ERRORS=$((ERRORS + 1))
fi

# Check Node/Frontend
echo ""
echo "🔍 Checking Frontend setup..."
if [ -f "frontend/package.json" ]; then
    echo -e "${GREEN}✓${NC} package.json found"
    if [ -d "frontend/node_modules" ]; then
        echo -e "${GREEN}✓${NC} node_modules found (dependencies installed)"
    else
        echo -e "${YELLOW}⚠${NC} node_modules not found (run 'npm install' in frontend/)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}✗${NC} package.json not found"
    ERRORS=$((ERRORS + 1))
fi

# Check Dockerfile
echo ""
echo "🔍 Checking Dockerfile..."
if [ -f "Dockerfile" ]; then
    echo -e "${GREEN}✓${NC} Dockerfile found"
    if grep -q "FROM python:" Dockerfile; then
        echo -e "${GREEN}✓${NC} Python base image configured"
    fi
    if grep -q "FROM node:" Dockerfile; then
        echo -e "${GREEN}✓${NC} Node.js builder stage configured"
    fi
else
    echo -e "${RED}✗${NC} Dockerfile not found"
    ERRORS=$((ERRORS + 1))
fi

# Check docker-compose
echo ""
echo "🔍 Checking docker-compose.yml..."
if [ -f "docker-compose.yml" ]; then
    echo -e "${GREEN}✓${NC} docker-compose.yml found"
    if grep -q "healthcheck:" docker-compose.yml; then
        echo -e "${GREEN}✓${NC} Health checks configured"
    else
        echo -e "${YELLOW}⚠${NC} No healthchecks found"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}✗${NC} docker-compose.yml not found"
    ERRORS=$((ERRORS + 1))
fi

# Check .env file
echo ""
echo "🔍 Checking .env configuration..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env file found"
    if grep -q "FLASK_ENV=production" .env; then
        echo -e "${YELLOW}⚠${NC} FLASK_ENV=production (set to development for now)"
    fi
    if grep -q "FLASK_DEBUG=False" .env; then
        echo -e "${GREEN}✓${NC} FLASK_DEBUG=False"
    else
        echo -e "${YELLOW}⚠${NC} FLASK_DEBUG should be False in production"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}✗${NC} .env file not found"
    ERRORS=$((ERRORS + 1))
fi

# Check for production guide
echo ""
echo "🔍 Checking documentation..."
if [ -f "DEPLOYMENT_OPTIMIZATION_REPORT.md" ]; then
    echo -e "${GREEN}✓${NC} Deployment guide found"
else
    echo -e "${YELLOW}⚠${NC} Deployment guide not found"
    WARNINGS=$((WARNINGS + 1))
fi

# Summary
echo ""
echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo -e "${RED}Errors:${NC} $ERRORS"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ Ready for deployment!${NC}"
    exit 0
else
    echo -e "${RED}✗ Fix errors before deploying${NC}"
    exit 1
fi
