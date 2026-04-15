#!/bin/bash

# SRM Project - Configuration Verification Script
# This script verifies that all services are configured correctly

echo "====================================="
echo "  SRM Project Configuration Check"
echo "====================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for issues
ISSUES=0

# Function to check if a file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} Found: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Missing: $1"
        ISSUES=$((ISSUES+1))
        return 1
    fi
}

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Port $1 is in use (service is running)"
        return 0
    else
        echo -e "${YELLOW}!${NC} Port $1 is NOT in use (service not running)"
        return 1
    fi
}

# Function to check URL
check_url() {
    local url=$1
    local description=$2
    
    if curl -s --max-time 5 "$url" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $description is accessible: $url"
        return 0
    else
        echo -e "${YELLOW}!${NC} $description is NOT accessible: $url"
        return 1
    fi
}

echo "📁 Checking configuration files..."
echo "-----------------------------------"
check_file "backend/.env"
check_file "backend/.env.example"
check_file "frontend/.env.local"
check_file "frontend/.env.example"
check_file "CLOUDFLARE-CONFIG.md"
check_file "SETUP-GUIDE.md"
check_file "MIGRATION-GUIDE.md"
echo ""

echo "🔧 Checking environment variables..."
echo "-----------------------------------"

# Check backend .env
if [ -f "backend/.env" ]; then
    BACKEND_PORT=$(grep "^PORT=" backend/.env | cut -d'=' -f2)
    if [ "$BACKEND_PORT" = "6000" ]; then
        echo -e "${GREEN}✓${NC} Backend PORT is set to 6000"
    else
        echo -e "${RED}✗${NC} Backend PORT is '$BACKEND_PORT' (should be 6000)"
        ISSUES=$((ISSUES+1))
    fi
    
    if grep -q "CORS_ORIGIN" backend/.env; then
        echo -e "${GREEN}✓${NC} CORS_ORIGIN is configured in backend"
    else
        echo -e "${RED}✗${NC} CORS_ORIGIN is missing in backend .env"
        ISSUES=$((ISSUES+1))
    fi
fi

# Check frontend .env.local
if [ -f "frontend/.env.local" ]; then
    if grep -q "NEXT_PUBLIC_API_URL=https://backend.jastipravita.co/api" frontend/.env.local; then
        echo -e "${GREEN}✓${NC} NEXT_PUBLIC_API_URL is correctly configured"
    else
        echo -e "${RED}✗${NC} NEXT_PUBLIC_API_URL is not set to Cloudflare domain"
        ISSUES=$((ISSUES+1))
    fi
    
    if grep -q "NEXT_PUBLIC_UPLOADS_URL=https://backend.jastipravita.co" frontend/.env.local; then
        echo -e "${GREEN}✓${NC} NEXT_PUBLIC_UPLOADS_URL is correctly configured"
    else
        echo -e "${RED}✗${NC} NEXT_PUBLIC_UPLOADS_URL is not set to Cloudflare domain"
        ISSUES=$((ISSUES+1))
    fi
fi
echo ""

echo "🚀 Checking services..."
echo "-----------------------------------"
check_port 6000
check_port 6001
echo ""

echo "🌐 Checking endpoints (if services are running)..."
echo "-----------------------------------"
check_url "http://localhost:6000/health" "Backend health check"
echo ""

echo "📊 Summary"
echo "====================================="
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Your configuration looks good!"
    echo ""
    echo "Next steps:"
    echo "  1. Start services: ./start-dev.sh"
    echo "  2. Configure Cloudflare tunnel (see CLOUDFLARE-CONFIG.md)"
    echo "  3. Test with: curl https://backend.jastipravita.co/health"
else
    echo -e "${RED}✗ Found $ISSUES issue(s)${NC}"
    echo ""
    echo "Please fix the issues above before proceeding."
    echo "Refer to SETUP-GUIDE.md for detailed instructions."
fi
echo ""
echo "====================================="
