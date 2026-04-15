@echo off
REM SRM Project - Quick Start Script for Windows
REM This script starts both backend and frontend for local development

echo.
echo ====================================
echo   SRM Project - Starting Services
echo ====================================
echo.

REM Start backend
echo Starting backend on port 6000...
start "SRM Backend" cmd /k "cd backend && npm run dev"
timeout /t 2 /nobreak >nul

REM Start frontend
echo Starting frontend on port 6001...
start "SRM Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo All services started!
echo.
echo Local Access:
echo    Frontend: http://localhost:6001
echo    Backend:  http://localhost:6000
echo.
echo Cloudflare Tunnel (if configured):
echo    Frontend: https://jastipravita.co
echo    Backend:  https://backend.jastipravita.co
echo.
echo Close the terminal windows to stop services
echo.
pause
