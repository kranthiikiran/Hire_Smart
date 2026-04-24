# HireSmart Quick Start Script - PowerShell
# Starts backend and frontend with fixed ports:
# Backend: 5500
# Frontend: 3000

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   HireSmart - Quick Start Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $ScriptDir "backend"
$FrontendDir = Join-Path $ScriptDir "frontend-react"

function Stop-ProcessOnPort {
    param([int]$Port)

    try {
        $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($listeners) {
            $pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($pid in $pids) {
                if ($pid -and $pid -ne $PID) {
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Write-Host "Stopped process $pid on port $Port" -ForegroundColor Yellow
                }
            }
        }
    } catch {
        Write-Host "Warning: could not clear port $Port" -ForegroundColor Yellow
    }
}

try {
    $nodeVersion = node --version
    Write-Host "Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $BackendDir)) {
    Write-Host "ERROR: Backend directory not found: $BackendDir" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $FrontendDir)) {
    Write-Host "ERROR: Frontend directory not found: $FrontendDir" -ForegroundColor Red
    exit 1
}

Write-Host "Checking dependencies..." -ForegroundColor Yellow

Set-Location $BackendDir
if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: backend dependency installation failed" -ForegroundColor Red
        exit 1
    }
}

Set-Location $FrontendDir
if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: frontend dependency installation failed" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Ensuring ports are free..." -ForegroundColor Yellow
Stop-ProcessOnPort -Port 5500
Stop-ProcessOnPort -Port 3000

Write-Host "" 
Write-Host "Starting backend on http://localhost:5500" -ForegroundColor Green
$backendCmd = "cd '$BackendDir'; `$env:PORT='5500'; npm start"
Start-Process powershell -ArgumentList "-NoExit -Command `"$backendCmd`""

Start-Sleep -Seconds 2

Write-Host "Starting frontend on http://localhost:3000" -ForegroundColor Green
$frontendCmd = "cd '$FrontendDir'; npm run dev -- --host 0.0.0.0 --port 3000 --strictPort"
Start-Process powershell -ArgumentList "-NoExit -Command `"$frontendCmd`""

Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Services launched" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "Backend : http://localhost:5500/api" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
