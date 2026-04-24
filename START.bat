@echo off
REM HireSmart Quick Start Script - Windows
REM This script starts both the backend and frontend servers

setlocal enabledelayedexpansion

echo.
echo ========================================
echo    HireSmart - Quick Start Script
echo ========================================
echo.

REM Get the script directory
set SCRIPT_DIR=%~dp0

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✓ Node.js is installed
echo.

REM Build paths
set BACKEND_DIR=%SCRIPT_DIR%backend
set FRONTEND_DIR=%SCRIPT_DIR%frontend-react

REM Check if directories exist
if not exist "%BACKEND_DIR%" (
    echo ERROR: Backend directory not found at %BACKEND_DIR%
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%" (
    echo ERROR: Frontend directory not found at %FRONTEND_DIR%
    pause
    exit /b 1
)

echo ✓ Project directories found
echo.

REM Check dependencies
echo Checking dependencies...
cd /d "%BACKEND_DIR%"
if not exist "node_modules" (
    echo Installing backend dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install backend dependencies
        pause
        exit /b 1
    )
)

cd /d "%FRONTEND_DIR%"
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install frontend dependencies
        pause
        exit /b 1
    )
)

echo ✓ All dependencies are installed
echo.

REM Display startup information
echo ========================================
echo    Starting HireSmart Services
echo ========================================
echo.
echo Backend will run on:  http://localhost:5500
echo Frontend will run on: http://localhost:3000
echo.
echo Press Ctrl+C in each window to stop the services
echo.

REM Start backend in new window
cd /d "%BACKEND_DIR%"
echo Starting Backend Server...
start cmd /k npm start

REM Small delay to ensure backend starts
timeout /t 2

REM Start frontend in new window
cd /d "%FRONTEND_DIR%"
echo Starting Frontend Server...
start cmd /k npm run dev

REM Small delay
timeout /t 2

REM Open browser
echo.
echo Opening browser...
timeout /t 2
start http://localhost:3000

echo.
echo ========================================
echo Both servers are starting. Check the command windows for output.
echo Application will be available at: http://localhost:3000
echo API will be available at: http://localhost:5500/api
echo ========================================
echo.

pause
