@echo off
echo Starting Gift Card Admin System...
echo.
echo ========================================
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo ========================================
echo.
echo Admin Credentials:
echo Username: admin
echo Password: admin
echo.
echo Press Ctrl+C to stop servers
echo ========================================
echo.

REM Start backend in a new window
start "Backend API" cmd /k "cd backend && python main.py"

REM Wait a moment for backend to start
timeout /t 3 /nobreak > nul

REM Start frontend
npm start
