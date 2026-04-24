# 🚀 HireSmart - Quick Start

## Run with Single Command

### Windows Users:

Double-click **RUN.bat** or run in terminal:
```batch
RUN.bat
```

OR in PowerShell:
```powershell
.\RUN.ps1
```

## Access the Application

Open your browser to: **http://localhost:3000**

## Ports Configuration

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5500

## What the Script Does

1. ✅ Starts backend server (Port 5500)
2. ✅ Starts frontend server (Port 3000)
3. ✅ Opens in separate terminal windows
4. ✅ Both services run simultaneously

## Stopping the Services

Press `Ctrl+C` in each terminal window to stop the services.

## Troubleshooting

### If dependencies are missing:

**Install Backend:**
```powershell
cd backend
npm install
```

**Install Frontend:**
```powershell
cd frontend-react
npm install
```

### If ports are in use:

Check if another application is using port 3000 or 5500:
```powershell
netstat -ano | findstr "3000"
netstat -ano | findstr "5500"
```

### Manual Start (Alternative):

**Terminal 1 - Backend:**
```powershell
cd backend
npm start
```

**Terminal 2 - Frontend:**
```powershell
cd frontend-react
npm run dev
```

## First Time Setup

If  this is your first time running the application:
1. Run `npm install` in both `backend` and `frontend-react` directories
2. Ensure `.env` files exist in both directories
3. Run `RUN.bat` or `RUN.ps1`

---

For more details, see [RUNNING_GUIDE.md](RUNNING_GUIDE.md)
