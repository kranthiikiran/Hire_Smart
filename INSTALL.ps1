# ===================================================
#  HireSmart Installation and Setup Script (PowerShell)
# ===================================================

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  HireSmart - AI Resume Screening System" -ForegroundColor Cyan
Write-Host "  Installation and Setup Script" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Function to check if a command exists
function Test-Command {
    param($Command)
    try {
        if (Get-Command $Command -ErrorAction Stop) {
            return $true
        }
    } catch {
        return $false
    }
}

# Check Node.js
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow
Write-Host ""

if (Test-Command "node") {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check npm
if (Test-Command "npm") {
    $npmVersion = npm --version
    Write-Host "✅ npm: v$npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ npm not found" -ForegroundColor Red
    exit 1
}

# Check Python
if (Test-Command "python") {
    $pythonVersion = python --version
    Write-Host "✅ Python: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Python not found. Please install Python 3.8+ from https://python.org/" -ForegroundColor Red
    Write-Host "   Make sure to check 'Add Python to PATH' during installation" -ForegroundColor Yellow
    exit 1
}

# Check MongoDB (optional)
if (Test-Command "mongod") {
    Write-Host "✅ MongoDB: Installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  MongoDB not found (optional)" -ForegroundColor Yellow
    Write-Host "   System will work with JSON storage" -ForegroundColor Yellow
    Write-Host "   To install MongoDB: https://www.mongodb.com/try/download/community" -ForegroundColor Gray
}

# Check Redis (optional)
if (Test-Command "redis-server") {
    Write-Host "✅ Redis: Installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Redis not found (optional)" -ForegroundColor Yellow
    Write-Host "   Queue will run with direct processing" -ForegroundColor Yellow  
    Write-Host "   To install Redis: https://redis.io/download or use Docker" -ForegroundColor Gray
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Installing Dependencies" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Install backend dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend installation failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
Set-Location ..

# Install Python dependencies
Write-Host ""
Write-Host "📦 Installing Python AI dependencies..." -ForegroundColor Yellow
Set-Location ai
python -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Python dependencies installation failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "✅ Python dependencies installed" -ForegroundColor Green
Set-Location ..

# Install frontend dependencies
Write-Host ""
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend-react
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend installation failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
Set-Location ..

# Create .env file if it doesn't exist
Write-Host ""
Write-Host "⚙️  Configuring environment..." -ForegroundColor Yellow

if (!(Test-Path "backend\.env")) {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "✅ Created backend/.env file" -ForegroundColor Green
    Write-Host "   ⚠️  Please update JWT_SECRET in backend/.env file" -ForegroundColor Yellow
} else {
    Write-Host "✅ backend/.env already exists" -ForegroundColor Green
}

# Create necessary directories
Write-Host ""
Write-Host "📁 Creating required directories..." -ForegroundColor Yellow
$directories = @("backend/uploads", "backend/logs", "backend/data")
foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "✅ Created $dir" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Quick Start Options:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 1: Start with Docker (Recommended)" -ForegroundColor White
Write-Host "   docker-compose up" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 2: Start services manually" -ForegroundColor White
Write-Host "   .\START.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 3: Start services separately" -ForegroundColor White
Write-Host "   Backend:  cd backend && npm start" -ForegroundColor Gray
Write-Host "   Frontend: cd frontend-react && npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   - Quick Start: QUICK_START.md" -ForegroundColor Gray
Write-Host "   - Full Guide: COMPLETE_SYSTEM_README.md" -ForegroundColor Gray
Write-Host "   - Workflow: DETAILED_WORKFLOW.txt" -ForegroundColor Gray
Write-Host ""
Write-Host "🌐 Access URLs (after starting):" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Gray
Write-Host "   Backend API: http://localhost:5000" -ForegroundColor Gray
Write-Host "   API Health: http://localhost:5000/api/health" -ForegroundColor Gray
Write-Host ""
Write-Host "Need help? Check the documentation or run: .\START.ps1" -ForegroundColor Yellow
Write-Host ""
