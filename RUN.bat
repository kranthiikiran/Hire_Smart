@echo off
echo ========================================
echo    HireSmart - Starting Services
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5500
echo.
echo Starting backend server...
start "HireSmart Backend" cmd /k "cd backend && npm start"
timeout /t 3 /nobreak > nul
echo Starting frontend server...
start "HireSmart Frontend" cmd /k "cd frontend-react && npm run dev"
echo.
echo Both services are starting...
echo Open http://localhost:3000 in your browser
echo.
pause
