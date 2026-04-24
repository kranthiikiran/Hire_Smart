# HireSmart - Testing & Integration Guide

## 🧪 Complete Testing Strategy

### Prerequisites for Testing
- All dependencies installed (`npm install` in backend and frontend)
- Python dependencies installed (`pip install -r requirements.txt` in ai/)
- Services running (backend, frontend, MongoDB, Redis - optional)

---

## 1. Backend API Testing

### Manual API Testing with curl/Postman

#### 1.1 Health Check
```bash
curl http://localhost:5000/api/health
```

Expected Response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-03-06T...",
  "uptime": 123.456,
  "environment": "development"
}
```

#### 1.2 User Registration
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "role": "recruiter",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {...},
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### 1.3 User Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

#### 1.4 Batch Resume Analysis
```bash
# Save your access token
TOKEN="your_access_token_here"

# Analyze resumes
curl -X POST http://localhost:5000/api/analyze/batch \
  -H "Authorization: Bearer $TOKEN" \
  -F "jobTitle=Senior React Developer" \
  -F "jobDescription=We need a senior React developer with 5+ years experience..." \
  -F "experienceLevel=Senior" \
  -F "resumes=@resume1.pdf" \
  -F "resumes=@resume2.pdf"
```

Expected Response:
```json
{
  "success": true,
  "message": "Resumes analyzed successfully",
  "analysisId": "507f1f77bcf86cd799439011",
  "totalProcessed": 2,
  "suitableCount": 1,
  "partiallyCount": 1,
  "notSuitableCount": 0,
  "averageScore": 78,
  "processingTimeMs": 2543,
  "resumes": [...]
}
```

#### 1.5 Get Analysis Results
```bash
curl -X GET "http://localhost:5000/api/analyze/results/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer $TOKEN"
```

#### 1.6 Get Analysis History
```bash
curl -X GET "http://localhost:5000/api/analyze/history?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

#### 1.7 Get User Statistics
```bash
curl -X GET "http://localhost:5000/api/analyze/stats" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 2. Automated Backend Tests

### Run Jest Tests
```bash
cd backend
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Watch Mode (for development)
```bash
npm run test:watch
```

---

## 3. Python NLP Testing

### Test Python Script Directly
```bash
cd ai

# Create test input
echo '{
  "resume_text": "John Doe, Software Engineer with 5 years experience in React, Node.js, Python, MongoDB",
  "job_description": "Looking for React Developer with Node.js experience",
  "job_title": "React Developer"
}' | python resume_match.py
```

Expected Output:
```json
{
  "match_score": 85,
  "classification": "SUITABLE",
  "matched_skills": ["react", "nodejs", "mongodb"],
  "missing_skills": [],
  "experience_match": 100,
 ...
}
```

---

## 4. Integration Testing

### End-to-End Flow Test

#### Step 1: Start All Services
```powershell
# PowerShell
.\START_NEW.ps1
```

Or with Docker:
```bash
docker-compose -f docker-compose.dev.yml up
```

#### Step 2: Frontend-Backend Integration Test

1. **Open Frontend**: http://localhost:5173
2. **Register Account**:
   - Email: test@hiresmart.com
   - Password: TestPass123!
   - Role: Recruiter
3. **Login** with credentials
4. **Upload Job Description**:
   - Job Title: "Senior Full Stack Developer"
   - Description: Paste realistic job description (50+ characters)
   - Experience: Senior5. **Upload Resumes**:
   - Drag and drop 3-5 test resumes (PDF/DOCX/TXT)
   - Verify files appear in upload list
   
6. **Analyze**:
   - Click "Analyze Resumes"
   - Watch progress indicator
   - Wait for completion (should take 5-15 seconds)

7. **Verify Results**:
   - ✅ Candidates ranked by score
   - ✅ Colors match classifications (Green/Yellow/Red)
   - ✅ Skill matches shown
   - ✅ Missing skills displayed
   - ✅ Score breakdown visible

8. **Test Dashboard**:
   - Navigate to Dashboard
   - Verify statistics display correctly
   - Check charts render properly

9. **Test History**:
   - Navigate to History
   - Verify past analysis appears
   - Test filtering and sorting

---

## 5. Database Testing

### MongoDB Verification

```bash
# Connect to MongoDB
mongosh

# Switch to HireSmart database
use hiresmart

# Check collections
show collections

# Count users
db.users.countDocuments()

# Count analyses
db.analyses.countDocuments()

# View recent analysis
db.analyses.find().sort({createdAt: -1}).limit(1).pretty()

# Check indexes
db.users.getIndexes()
db.analyses.getIndexes()
```

### Redis Verification (if enabled)

```bash
# Connect to Redis
redis-cli

# Check connection
PING
# Should return: PONG

# Check queue
KEYS bull:resume-analysis:*

# Get queue stats
LLEN bull:resume-analysis:waiting
LLEN bull:resume-analysis:active
LLEN bull:resume-analysis:completed
```

---

## 6. Performance Testing

### Test Single Resume Analysis
```bash
# Measure time for single resume
time curl -X POST http://localhost:5000/api/analyze/batch \
  -H "Authorization: Bearer $TOKEN" \
  -F "jobTitle=Developer" \
  -F "jobDescription=Experienced developer needed..." \
  -F "resumes=@resume.pdf"
```

Expected: 500-2000ms for single resume

### Test Batch Processing (20 resumes)
```bash
# Upload 20 resumes at once
for i in {1..20}; do
  echo "-F resumes=@resume${i}.pdf"
done | xargs curl -X POST http://localhost:5000/api/analyze/batch \
  -H "Authorization: Bearer $TOKEN" \
  -F "jobTitle=Developer" \
  -F "jobDescription=..."
```

Expected: 2-10 seconds with queue, 10-30 seconds without

### Load Testing with Artillery (Optional)
```bash
npm install -g artillery

# Create artillery config (artillery.yml)
artillery run artillery.yml
```

---

## 7. Security Testing

### Test Rate Limiting
```bash
# Try to make too many requests
for i in {1..150}; do
  curl http://localhost:5000/api/health
done
```

Expected: Should get 429 (Too Many Requests) after 100 requests

### Test JWT Expiration
```bash
# Use expired token
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer expired_token_here"
```

Expected: 401 Unauthorized

### Test CORS
```bash
curl -X OPTIONS http://localhost:5000/api/health \
  -H "Origin: http://malicious-site.com" \
  -H "Access-Control-Request-Method: POST"
```

Expected: CORS error (not allowed origin)

---

## 8. Error Handling Testing

### Test Invalid Inputs

#### Missing required fields
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

Expected: 400 Bad Request with validation error

#### Invalid file type
```bash
curl -X POST http://localhost:5000/api/analyze/batch \
  -H "Authorization: Bearer $TOKEN" \
  -F "jobTitle=Developer" \
  -F "jobDescription=..." \
  -F "resumes=@invalid.exe"
```

Expected: 400 Bad Request (invalid file type)

#### File too large
```bash
# Create large file (>5MB)
dd if=/dev/zero of=large.pdf bs=1M count=10

curl -X POST http://localhost:5000/api/analyze/batch \
  -H "Authorization: Bearer $TOKEN" \
  -F "resumes=@large.pdf" \
  -F "jobTitle=Dev" \
  -F "jobDescription=..."
```

Expected: 413 Payload Too Large

---

## 9. Frontend Testing

### Manual Testing Checklist

- [ ] **Login Page**
  - [ ] Email validation works
  - [ ] Password visibility toggle
  - [ ] Error messages display correctly
  - [ ] Remember me functionality
  - [ ] Redirect after successful login

- [ ] **Register Page**
  - [ ] All fields validate properly
  - [ ] Role selection works
  - [ ] Password strength indicator
  - [ ] Successful registration redirects to dashboard

- [ ] **Dashboard**
  - [ ] Statistics load correctly
  - [ ] Charts render properly
  - [ ] Real-time updates work
  - [ ] Responsive on mobile

- [ ] **Upload Page**
  - [ ] Job description validation
  - [ ] File drag-and-drop works
  - [ ] File list displays correctly
  - [ ] Upload progress shows
  - [ ] Multiple files supported

- [ ] **Results Page**
  - [ ] Candidates ranked correctly
  - [ ] Score colors match classification
  - [ ] Detailed view opens on click
  - [ ] Skills display properly
  - [ ] Export functionality works

- [ ] **History Page**
  - [ ] Past analyses listed
  - [ ] Pagination works
  - [ ] Filtering functions correctly
  - [ ] Click to view details

### Browser Compatibility
Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

---

## 10. Docker Testing

### Test Docker Build
```bash
# Build backend image
cd backend
docker build -f Dockerfile.new -t hiresmart-backend .

# Build frontend image
cd ../frontend-react
docker build -t hiresmart-frontend .
```

### Test Docker Compose
```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# Check container status
docker-compose -f docker-compose.dev.yml ps

# View logs
docker-compose -f docker-compose.dev.yml logs -f backend

# Test health
curl http://localhost:5000/api/health
curl http://localhost:5173

# Stop services
docker-compose -f docker-compose.dev.yml down
```

---

## 11. Common Test Scenarios

### Scenario 1: New User Journey
1. Register new account
2. Login
3. Create first analysis
4. Upload 3 resumes
5. View results
6. Check dashboard updates
7. Logout
8. Login again (test persistence)

### Scenario 2: High-Volume Testing
1. Upload 20 resumes in one batch
2. Verify all process correctly
3. Check queue performance (if Redis enabled)
4. Verify database stores all results
5. Test result retrieval speed

### Scenario 3: Error Recovery
1. Start analysis
2. Stop backend mid-process
3. Restart backend
4. Verify system recovers gracefully
5. Check error logs

### Scenario 4: Multi-User Testing
1. Create 3 different user accounts
2. Each uploads different resumes
3. Verify data isolation
4. Check no cross-user data leakage
5. Test concurrent processing

---

## 12. Troubleshooting Tests

### IF: Backend tests fail
```bash
# Check Node version
node --version  # Should be 18+

# Reinstall dependencies
cd backend
rm -rf node_modules package-lock.json
npm install

# Check environment
cp .env.example .env
# Edit .env as needed

# Run tests with verbose output
npm test -- --verbose
```

### IF: Python script fails
```bash
# Check Python version
python --version  # Should be 3.8+

# Reinstall Python packages
cd ai
pip install -r requirements.txt --upgrade

# Test scikit-learn
python -c "from sklearn.feature_extraction.text import TfidfVectorizer; print('OK')"

# Test script directly
echo '{"resume_text":"test","job_description":"test","job_title":"test"}' | python resume_match.py
```

### IF: MongoDB connection fails
```bash
# Check if MongoDB is running
mongo --eval "db.version()"

# Start MongoDB
mongod --dbpath ./data

# Or use Docker
docker run -d -p 27017:27017 mongo:7.0
```

### IF: File upload fails
```bash
# Check upload directory exists and is writable
mkdir -p backend/uploads
chmod 755 backend/uploads

# Check file size limits in .env
# MAX_FILE_SIZE=5242880  # 5MB
```

---

## 13. CI/CD Testing (Future)

### GitHub Actions Workflow
```yaml
name: HireSmart CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:7.0
        ports:
          - 27017:27017
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd backend && npm ci
          cd ../frontend-react && npm ci
          cd ../ai && pip install -r requirements.txt
      
      - name: Run backend tests
        run: cd backend && npm test
      
      - name: Run linting
        run: cd backend && npm run lint
      
      - name: Build frontend
        run: cd frontend-react && npm run build
```

---

## 14. Success Criteria

### ✅ All Tests Pass When:

**Backend:**
- [ ] Health check returns 200
- [ ] All API endpoints respond correctly
- [ ] Authentication works (register, login, logout)
- [ ] File upload accepts PDF/DOCX/TXT
- [ ] Resume analysis completes successfully
- [ ] Results stored in database correctly
- [ ] Error handling works properly

**Frontend:**
- [ ] All pages load without errors
- [ ] Forms validate correctly
- [ ] API calls succeed
- [ ] File upload UI works
- [ ] Results display correctly
- [ ] Navigation works smoothly
- [ ] Responsive on all devices

**Integration:**
- [ ] Frontend communicates with backend
- [ ] Auth tokens work end-to-end
- [ ] File uploads process completely
- [ ] Python AI script integrates properly
- [ ] Database stores and retrieves data
- [ ] Queue processes jobs (if Redis enabled)

**Performance:**
- [ ] Single resume: < 2 seconds
- [ ] Batch (20): < 10 seconds with queue
- [ ] API response times: < 500ms
- [ ] Frontend loads: < 2 seconds

**Security:**
- [ ] Password hashing works
- [ ] JWT tokens validated
- [ ] CORS configured correctly
- [ ] Rate limiting active
- [ ] No sensitive data in responses
- [ ] Helmet security headers set

---

## 15. Test Reports

### Generate Test Coverage Report
```bash
cd backend
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

### Monitor Logs During Testing
```bash
# Backend logs
tail -f backend/logs/combined.log

# Error logs only
tail -f backend/logs/error.log

# Docker logs
docker-compose -f docker-compose.dev.yml logs -f
```

---

## 📝 Final Checklist Before Deployment

- [ ] All automated tests pass
- [ ] Manual integration tests successful
- [ ] Performance benchmarks met
- [ ] Security tests passed
- [ ] Documentation complete
- [ ] Environment variables configured
- [ ] Database backups enabled
- [ ] Monitoring set up
- [ ] Error tracking configured
- [ ] SSL/HTTPS enabled (production)
- [ ] Load testing completed
- [ ] User acceptance testing done

---

**Need Help?**
- Check backend/logs/error.log for errors
- Review COMPLETE_SETUP_GUIDE.txt for setup issues
- See DETAILED_WORKFLOW.txt for system architecture
- Read COMPLETE_SYSTEM_README.md for full documentation
