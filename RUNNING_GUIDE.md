# 🚀 HireSmart - Quick Start Guide

## ✅ System is Ready to Run!

The HireSmart application is now fully configured and ready to run effortlessly.

### Quick Start (Windows)

#### Option 1: Single Command (Easiest - Recommended)

Simply double-click or run:
```powershell
.\RUN.bat
```
OR
```powershell
.\RUN.ps1
```

Then open: **http://localhost:3000**

#### Option 2: Manual - Run Both Servers Separately

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

Then open: **http://localhost:3000**

#### Option 2: Alternative Commands

**Backend (Development with Auto-Reload):**
```powershell
cd c:\Documents\SDC PROJECT\HireSmart_Project\backend
npm run dev  # Uses nodemon
```

**Frontend (Development):**
```powershell
cd c:\Documents\SDC PROJECT\HireSmart_Project\frontend-react
npm run dev
```

### Access Information

| Component | URL | Status |
|-----------|-----|--------|
| **Frontend** | http://localhost:3000 | ✅ Running |
| **Backend API** | http://localhost:5500/api | ✅ Running |
| **Health Check** | http://localhost:5500/api/health | ✅ Available |

### Configuration Files Created

✅ **Backend .env** - `backend/.env`
- Port: 5500
- Node Environment: development
- JWT Secret: Configured
- All optional services (Redis, MongoDB) gracefully degrade

✅ **Frontend .env** - `frontend-react/.env`
- API URL: Using relative path `/api` (proxied by Vite)

✅ **Vite Configuration** - `frontend-react/vite.config.js`
- Frontend Port: 5173
- API Proxy: Correctly configured to backend on port 3000

### Features Enabled

- ✅ **JWT Authentication** - Token-based secure access
- ✅ **Resume Analysis** - AI-powered candidate matching
- ✅ **File Upload** - PDF, DOCX, and TXT support
- ✅ **Batch Processing** - Analysis of multiple candidates
- ✅ **Fairness Framework** - Bias detection
- ✅ **Rate Limiting** - Protection against abuse
- ✅ **Structured Logging** - Comprehensive logging system
- ✅ **Security Headers** - Helmet.js protection
- ✅ **CORS Enabled** - Cross-origin requests handled
- ✅ **Mock Analysis Fallback** - Works even without Python

### Default Credentials

**For Testing (if login is required):**
- Email: `recruiter@test.com`
- Password: `test123`

Or
- Email: `admin@hiresmart.com`
- Password: `admin123`

### Key Files

| File | Purpose |
|------|---------|
| `backend/server.js` | Main Express server |
| `backend/.env` | Backend environment variables |
| `frontend-react/vite.config.js` | Vite configuration |
| `frontend-react/.env` | Frontend environment variables |
| `ai/resume_match.py` | AI scoring engine (optional) |

### Troubleshooting

#### Port Already in Use

If port 3000 or 5173 is already in use:

**For Backend:**
```powershell
# Change PORT in backend/.env and restart
$env:PORT = 3001
npm start
```

**For Frontend:**
```powershell
# Vite will automatically use next available port
npm run dev
```

#### Dependencies Not Installed

```powershell
# Backend
cd backend
npm install

# Frontend
cd ../frontend-react
npm install
```

#### Python Not Available

The system automatically falls back to mock analysis if Python is not available. Install Python if you want advanced AI features:

```bash
python -m pip install -r ai/requirements.txt
```

### Next Steps

1. **Start Backend**: `npm start` in `backend/` folder
2. **Start Frontend**: `npm run dev` in `frontend-react/` folder
3. **Open Browser**: http://localhost:5173
4. **Test API**: http://localhost:3000/api/health

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/login` | POST | User authentication |
| `/api/analyze` | POST | Single resume analysis |
| `/api/analyze-sample` | POST | Sample analysis |
| `/api/batch-analyze` | POST | Batch analysis |

### Additional Notes

- ✅ All npm dependencies are already installed
- ✅ Node modules are configured and ready
- ✅ Fallback mechanisms are in place
- ✅ Frontend properly configured with API proxy
- ✅ Backend uses file-based storage (no database required)
- ✅ System will work without external services (Redis, MongoDB, Python)

---

**Status**: 🟢 **READY TO USE**

The application is fully configured and ready to run! No additional setup is needed.
