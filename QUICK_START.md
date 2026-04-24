# 🚀 HireSmart - Quick Start Guide

Get HireSmart up and running in under 5 minutes!

## Prerequisites

- Node.js 18+ installed
- npm 9+ installed
- Terminal/Command Prompt access

## Quick Install

### Option 1: Automated Setup (Fastest)

#### Windows (PowerShell)

```powershell
# Clone and setup
git clone <repository-url>
cd HireSmart_Project

# Setup backend
cd backend
npm install
@"
NODE_ENV=development
PORT=3000
JWT_SECRET=dev_secret_key_please_change_in_production
JWT_REFRESH_SECRET=dev_refresh_secret_key
"@ | Out-File -FilePath .env -Encoding utf8

# Start backend
Start-Process powershell -ArgumentList "npm run dev"

# Setup frontend (in new terminal)
cd ../frontend-react
npm install
@"
VITE_API_URL=http://localhost:3000/api
"@ | Out-File -FilePath .env -Encoding utf8

# Start frontend
npm run dev
```

#### Linux/Mac (Bash)

```bash
# Clone and setup
git clone <repository-url>
cd HireSmart_Project

# Setup backend
cd backend
npm install
cat > .env << EOF
NODE_ENV=development
PORT=3000
JWT_SECRET=dev_secret_key_please_change_in_production
JWT_REFRESH_SECRET=dev_refresh_secret_key
EOF

# Start backend in background
npm run dev &

# Setup frontend
cd ../frontend-react
npm install
cat > .env << EOF
VITE_API_URL=http://localhost:3000/api
EOF

# Start frontend
npm run dev
```

### Option 2: Docker (Simplest)

```bash
# Clone repository
git clone <repository-url>
cd HireSmart_Project

# Create environment file
cat > .env << EOF
JWT_SECRET=production_secret_key
JWT_REFRESH_SECRET=production_refresh_secret
EOF

# Start with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Access application
# Frontend: http://localhost
# Backend: http://localhost:3000
```

### Option 3: Manual Step-by-Step

#### Step 1: Clone Repository

```bash
git clone <repository-url>
cd HireSmart_Project
```

#### Step 2: Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:
```
NODE_ENV=development
PORT=3000
JWT_SECRET=dev_secret_key_change_this
JWT_REFRESH_SECRET=dev_refresh_secret_change_this
```

Start backend:
```bash
npm run dev
```

#### Step 3: Frontend Setup (New Terminal)

```bash
cd frontend-react
npm install
```

Create `frontend-react/.env`:
```
VITE_API_URL=http://localhost:3000/api
```

Start frontend:
```bash
npm run dev
```

## Access the Application

### URLs

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api/health

### First Time Setup

1. **Register Account**
   - Open http://localhost:3001/register
   - Choose "Recruiter" or "Job Seeker"
   - Fill in details
   - Click "Create Account"

2. **Login**
   - Use credentials from registration
   - Select your role
   - Click "Sign In"

3. **Upload Resumes**
   - Click "Upload" in navigation
   - Enter job title (e.g., "Software Engineer")
   - Paste job description
   - Drag & drop resume files (PDF/DOCX/TXT)
   - Click "Analyze Resumes"

4. **View Results**
   - See ranked candidates
   - Review match scores
   - Check skill analysis
   - Export results

## Test Data

### Sample Job Description

```
Senior Software Engineer

We are seeking an experienced software engineer with:
- 5+ years of experience in software development
- Strong proficiency in JavaScript, React, Node.js
- Experience with cloud platforms (AWS, Azure, or GCP)
- Knowledge of Docker and Kubernetes
- Agile/Scrum methodology experience
- Excellent problem-solving skills
- Strong communication and teamwork abilities

Responsibilities:
- Design and develop scalable web applications
- Write clean, maintainable code
- Participate in code reviews
- Mentor junior developers
- Collaborate with cross-functional teams
```

### Sample Resume Files

Use the sample resumes in `sample_resumes/` directory:
- `resume_software_engineer.txt`
- `resume_data_scientist.txt`
- `resume_project_manager.txt`

## Troubleshooting

### Port Already in Use

**Problem**: Port 3000 or 3001 is already in use

**Solution**:
```bash
# Find process using port (Linux/Mac)
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Cannot Connect to Backend

**Problem**: Frontend can't reach backend API

**Solution**:
1. Check backend is running: http://localhost:3000/api/health
2. Verify VITE_API_URL in `frontend-react/.env`
3. Check for CORS errors in browser console

### Dependencies Installation Failed

**Problem**: `npm install` fails

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Or use different registry
npm install --registry=https://registry.npmmirror.com
```

### Module Not Found

**Problem**: Module not found errors

**Solution**:
```bash
# Install missing mammoth for backend
cd backend
npm install mammoth

# Reinstall frontend dependencies
cd ../frontend-react
rm -rf node_modules
npm install
```

## Quick Commands Reference

### Development

```bash
# Start backend dev server
cd backend && npm run dev

# Start frontend dev server
cd frontend-react && npm run dev

# Run backend tests
cd backend && npm test

# Build frontend for production
cd frontend-react && npm run build
```

### Docker

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Stop services
docker-compose -f docker-compose.prod.yml down

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart service
docker-compose -f docker-compose.prod.yml restart backend
```

### Maintenance

```bash
# Update dependencies
npm update

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Check outdated packages
npm outdated
```

## Next Steps

After getting started:

1. **Read Full Documentation**
   - See `COMPLETE_SYSTEM_README.md` for detailed features
   - Check `DEPLOYMENT_GUIDE.md` for production setup

2. **Customize Configuration**
   - Update JWT secrets for production
   - Configure environment variables
   - Set up SSL/TLS

3. **Explore Features**
   - Dashboard analytics
   - Batch processing
   - Export results
   - History tracking

4. **Production Deployment**
   - Follow `DEPLOYMENT_GUIDE.md`
   - Set up monitoring
   - Configure backups

## Need Help?

- **Documentation**: See README files in project root
- **API Docs**: See `API_DOCUMENTATION.md`
- **Issues**: Check GitHub issues
- **Support**: Contact dev team

## Tips & Tricks

### 1. Sample Data

Use provided sample resumes for testing:
```bash
ls sample_resumes/
```

### 2. API Testing

Test API with cURL:
```bash
# Health check
curl http://localhost:3000/api/health

# Register user
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123","role":"recruiter"}'
```

### 3. Development Tools

- **Backend logs**: Displayed in terminal
- **Frontend dev tools**: Press F12 in browser
- **API testing**: Use Postman or Insomnia

### 4. Hot Reload

Both frontend and backend support hot reload:
- Frontend: Changes reflect immediately
- Backend: Uses nodemon for auto-restart

### 5. Environment Switching

Toggle environments easily:
```bash
# Development
NODE_ENV=development npm start

# Production
NODE_ENV=production npm start
```

## Success Indicators

You'll know everything is working when:

✅ Backend health check returns {"status":"OK"}  
✅ Frontend displays login page  
✅ You can register and login  
✅ Resume upload works  
✅ Analysis results display  
✅ Dashboard shows statistics

## Common First-Time Questions

**Q: Do I need MongoDB?**  
A: No, the system uses JSON file storage by default.

**Q: Do I need Redis?**  
A: No, Redis is optional for caching.

**Q: Do I need an AI API key?**  
A: No, the system has a built-in AI engine. API keys are optional for advanced features.

**Q: Can I use this in production?**  
A: Yes! Follow the DEPLOYMENT_GUIDE.md for production setup.

**Q: How do I add more users?**  
A: Register through the UI at /register endpoint.

**Q: Where are uploaded files stored?**  
A: In `backend/uploads/` directory.

**Q: How do I reset data?**  
A: Delete files in `backend/data/` and `backend/uploads/`.

---

**You're all set! Start screening smarter with HireSmart! 🎯**

For detailed documentation, see `COMPLETE_SYSTEM_README.md`
