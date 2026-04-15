#!/bin/bash

# SRM Project - Quick Start Script
# This script starts both backend and frontend for local development

echo "🚀 Starting SRM Project..."
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down all services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "✅ All services stopped."
    exit 0
}

# Trap SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

# Start backend
echo "📡 Starting backend on port 6000..."
cd backend && npm run dev &
BACKEND_PID=$!
cd ..
echo ""

# Wait a moment for backend to start
sleep 2

# Start frontend
echo "🎨 Starting frontend on port 6001..."
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..
echo ""

echo "✅ All services started!"
echo ""
echo "📍 Local Access:"
echo "   Frontend: http://localhost:6001"
echo "   Backend:  http://localhost:6000"
echo ""
echo "🌐 Cloudflare Tunnel (if configured):"
echo "   Frontend: https://jastipravita.co"
echo "   Backend:  https://backend.jastipravita.co"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for processes
wait
