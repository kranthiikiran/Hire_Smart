Write-Host "HireSmart - AI Resume Screening System" -ForegroundColor Cyan
Write-Host "Starting services..." -ForegroundColor Cyan
Write-Host ""

function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    return $connection.TcpTestSucceeded
}

$backendPath = Join-Path $PSScriptRoot "backend"
$frontendPath = Join-Path $PSScriptRoot "frontend-react"

if (Test-Port -Port 5500) {
    Write-Host "Port 5500 is already in use. Stop the existing backend server first." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne 'y') {
        exit 0
    }
}

if (Test-Port -Port 3000) {
    Write-Host "Port 3000 is already in use. Stop the existing frontend server first." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne 'y') {
        exit 0
    }
}

Write-Host "Starting backend server..." -ForegroundColor Yellow
$backendProcess = Start-Process -FilePath "powershell.exe" -WorkingDirectory $backendPath -ArgumentList @(
    '-NoExit',
    '-Command',
    'npm run dev'
) -PassThru

Start-Sleep -Seconds 3

Write-Host "Starting frontend development server..." -ForegroundColor Yellow
$frontendProcess = Start-Process -FilePath "powershell.exe" -WorkingDirectory $frontendPath -ArgumentList @(
    '-NoExit',
    '-Command',
    'npm run dev'
) -PassThru

Write-Host ""
Write-Host "Services started." -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "Backend:  http://localhost:5500" -ForegroundColor White
Write-Host "Health:   http://localhost:5500/api/health" -ForegroundColor White
Write-Host ""

Start-Sleep -Seconds 5

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5500/api/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "Backend is responding." -ForegroundColor Green
    }
} catch {
    Write-Host "Backend may still be starting. Check the backend window for errors." -ForegroundColor Yellow
}

Write-Host "Open http://localhost:3000 in your browser." -ForegroundColor Green
Write-Host "Press any key to open the browser..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "Services are running. Keep this window open." -ForegroundColor Yellow

try {
    while ($true) {
        Start-Sleep -Seconds 10
        if ($backendProcess.HasExited) {
            Write-Host "Backend process has stopped." -ForegroundColor Red
            break
        }
        if ($frontendProcess.HasExited) {
            Write-Host "Frontend process has stopped." -ForegroundColor Red
            break
        }
    }
} catch {
    Write-Host "Monitoring stopped." -ForegroundColor Yellow
}
