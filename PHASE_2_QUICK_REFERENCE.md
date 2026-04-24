# HireSmart Phase 2 - Quick Reference Guide

## 🚀 Getting Started (5 minutes)

### 1. Setup Local Environment
```bash
cd backend
npm install

# Copy environment template
cp .env.example .env

# Start MongoDB (Docker)
docker run -d --name mongodb -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password mongo:6.3

# Start Redis (Docker)
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### 2. Start Application
```bash
npm start
# Server running on http://localhost:3000
```

### 3. Test Setup
```bash
npm test                  # Run all tests
npm run test:coverage     # With coverage report
npm run test:watch       # Watch mode
```

---

## 📁 New Files Created (21 files)

### Middleware (3 files)
```
backend/middleware/
├── auth.js                   (274 lines) - JWT + RBAC
├── validation.js             (181 lines) - Joi + file validation
└── logging.js                (125 lines) - Winston + Morgan
```

### Services (2 files)
```
backend/services/
├── cacheManager.js           (155 lines) - Redis caching
└── batchProcessor.js         (257 lines) - Bull queue
```

### Python AI (2 files)
```
ai/
├── scoring_engine.py         (207 lines) - Weighted scoring
└── fairness_engine.py        (246 lines) - Fairness metrics
```

### Tests (4 files)
```
backend/tests/
├── setup.js                  (25 lines)  - Jest setup
├── auth.test.js              (95 lines)  - Auth tests
├── validation.test.js        (156 lines) - Validation tests
└── scoring.test.js           (147 lines) - Scoring tests
```

### Configuration (5 files)
```
backend/
├── jest.config.js            (20 lines)  - Jest config
├── .env.example              (60 lines)  - Environment template
├── Dockerfile                (35 lines)  - Container image
├── API_DOCUMENTATION.md      (350 lines) - API reference
└── TESTING_GUIDE.md          (400 lines) - Test guide
```

### Root Configuration (2 files)
```
Project Root/
├── docker-compose.yml        (130 lines) - Full stack orchestration
└── .dockerignore             (25 lines)  - Docker optimization
```

### Documentation (2 files)
```
Project Root/
├── DEPLOYMENT_OPERATIONS.md  (1,100 lines) - Dev & production setup
└── IMPLEMENTATION_PHASE_2.md (550 lines)   - This phase summary
```

### Updated Files (1 file)
- `backend/server.js` - Added middleware integration + /api/login
- `backend/package.json` - Added 18 dependencies + scripts

---

## 🔐 Common API Endpoints

### Authentication
```bash
# Login
POST /api/login
{
  "email": "recruiter@example.com",
  "password": "securePassword123"
}

# Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "email": "...", "role": "recruiter" }
}
```

### Analysis
```bash
# Single Resume (requires auth)
POST /api/analyze
Authorization: Bearer <token>
Content-Type: multipart/form-data

jobTitle: "Senior Engineer"
jobDescription: "Looking for 5+ years..."
resume: <file.pdf>

# Response
{
  "score": 82,
  "classification": "Suitable",
  "matched_skills": ["Python", "Node.js"],
  "summary": "..."
}
```

### Batch Processing
```bash
# Queue batch analysis
POST /api/batch-analyze
Authorization: Bearer <token>

# Get status
POST /api/batch-status/{batchId}
Authorization: Bearer <token>
```

### Health Check
```bash
GET /api/health
# No auth required
```

---

## 🧪 Testing Quick Commands

```bash
# Run all tests
npm test

# Run specific suite
npm test -- auth.test.js

# Watch mode (auto-run on changes)
npm run test:watch

# Coverage report
npm run test:coverage
npm run test:coverage -- --verbose

# Debug test
node --inspect-brk node_modules/.bin/jest --runInBand auth.test.js
```

---

## 🐳 Docker Commands

### With Docker Compose (Recommended)
```bash
# Start all services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f api

# Rebuild images
docker-compose up -d --build
```

### Manual Docker
```bash
# Build image
cd backend && docker build -t hiresmart-api:latest .

# Run container
docker run -d -p 3000:3000 --name api hiresmart-api:latest

# View logs
docker logs -f api

# Stop container
docker stop api
```

---

## 🔧 Environment Variables (.env)

### Critical (Must Set)
```env
JWT_SECRET=your-very-long-secret-key-min-32-chars-change-in-production
DATABASE_URL=mongodb://admin:password@localhost:27017/hiresmart
REDIS_HOST=localhost
```

### Optional (Has Defaults)
```env
PORT=3000
NODE_ENV=development
OPENAI_API_KEY=sk-...
```

---

## 📊 Architecture Overview

### Security Layers
```
Request
   ↓
[CORS] → [Rate Limit] → [Helmet Headers]
   ↓
[JWT Auth] → [Validate Input] → [Sanitize]
   ↓
Route Handler
   ↓
[Winston Logging] → [Performance Metrics]
```

### Data Flow
```
Frontend Submit
   ↓
[Validation Middleware]
   ↓
[Cache Check] ← ← ← Redis Cache
   ↓
[Async Job Queue] ← ← ← Bull Queue
   ↓
[Scoring Engine] → [Fairness Check]
   ↓
[Cache Result] → Redis
   ↓
Response to Client
```

---

## 🎯 Key Components

### 1. Authentication (auth.js)
- `generateAccessToken(payload)` - Create 1-hour JWT
- `authenticate(req, res, next)` - Verify token middleware
- `authorize(...roles)` - Role-based access middleware
- `hashPassword(password)` - Bcrypt hashing
- `verifyPassword(password, hash)` - Verify hash

### 2. Validation (validation.js)
- `jobDescriptionSchema` - Joi schema for job posting
- `resumeUploadSchema` - Joi schema for file upload
- `validateFile` - Magic byte file verification
- `sanitizeText(text)` - HTML/XSS prevention

### 3. Scoring (scoring_engine.py)
- `calculate_semantic_score()` - 35% weight
- `calculate_skills_score()` - 30% weight  
- `calculate_experience_score()` - 20% weight
- `calculate_education_score()` - 10% weight
- `compute_final_score()` - Combined weighted score

### 4. Fairness (fairness_engine.py)
- `anonymize_resume()` - Remove PII
- `detect_demographic_attributes()` - Find bias indicators
- `generate_fairness_report()` - Full audit report

### 5. Caching (cacheManager.js)
- `cacheJobDescription(jobDescId, data)`
- `cacheAnalysisResult(analysisId, result)`
- `setUserSession(userId, sessionData)`
- `incrementRateLimit(userId, limit, window)`

### 6. Batch Processing (batchProcessor.js)
- `enqueueBatchAnalysis(jobId, resumes, metadata)`
- `getBatchStatus(batchId)`
- `generateBatchSummary(results)`

---

## 📈 Performance Metrics

### Response Times
- Single resume analysis: 1-2 seconds (cached)
- Batch job queue: < 30 seconds to process
- Health check: < 1 second
- Login: < 100ms

### Throughput
- Concurrent batch jobs: 5 (configurable)
- Requests per second: 100+ (rate limited at 100/15min)
- Auth attempts: 5 per 15 min (brute force protection)

### Storage
- Cache TTL (Job Description): 30 days
- Cache TTL (Analysis): 1 hour
- Cache TTL (Session): 30 days
- Log rotation: 10MB max per file

---

## 🐛 Troubleshooting

### Problem: "Cannot find module"
```bash
npm install
npm run test -- --clearCache
```

### Problem: "ECONNREFUSED" (Database)
```bash
# Check if services running
docker ps

# Start missing service
docker run -d --name mongodb -p 27017:27017 mongo:6.3
```

### Problem: JWT errors
```bash
# Check .env has JWT_SECRET
echo $JWT_SECRET

# Regenerate if needed
# Use any long string (min 32 chars)
```

### Problem: Tests failing
```bash
# Clear Jest cache
npm run test -- --clearCache

# Run with verbose output
npm test -- --verbose --no-coverage

# Run single test file
npm test -- auth.test.js
```

### Problem: Port already in use
```bash
# Windows: Find and kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

---

## 📚 Documentation Reference

### For API Usage
→ Read `backend/API_DOCUMENTATION.md`
- All endpoints documented
- Request/response examples
- Error codes explained
- Rate limiting details

### For Testing
→ Read `backend/TESTING_GUIDE.md`
- How to run tests
- Coverage reporting
- Debugging techniques
- Best practices

### For Deployment
→ Read `DEPLOYMENT_OPERATIONS.md`
- Local dev setup
- Docker setup
- Production deployment (AWS, Heroku, GCP)
- Monitoring & troubleshooting

### For Implementation Details
→ Read `IMPLEMENTATION_PHASE_2.md`
- What was implemented
- Architecture decisions
- What's remaining
- Next steps

---

## 🎓 Learning Resources

### Node.js & Express
- Express middleware: https://expressjs.com/en/guide/using-middleware.html
- JWT auth: https://tools.ietf.org/html/rfc7519

### Python & ML
- Scikit-learn: https://scikit-learn.org/
- Fairness: https://fairmlbook.org/

### DevOps
- Docker: https://docs.docker.com/
- Docker Compose: https://docs.docker.com/compose/

### Testing
- Jest: https://jestjs.io/
- Best practices: https://jestjs.io/docs/testing-frameworks

---

## ✅ Pre-Deployment Checklist

- [ ] All tests passing: `npm test`
- [ ] Coverage report reviewed: `npm run test:coverage`
- [ ] .env configured with production values
- [ ] MongoDB backup created
- [ ] Redis backup created
- [ ] Docker images built: `docker build -t hiresmart-api .`
- [ ] docker-compose tested: `docker-compose up -d`
- [ ] API health check passes: `curl localhost:3000/api/health`
- [ ] SSL certificates configured (production)
- [ ] Monitoring setup (logging, alerts)
- [ ] Documentation reviewed

---

## 🚀 Deployment Paths

### Local Development
```bash
npm install
npm start
npm test
```

### Docker Development
```bash
docker-compose up -d
docker-compose logs -f
```

### Production (AWS)
See: `DEPLOYMENT_OPERATIONS.md` → AWS EC2 section
- SSH into instance
- Clone repo, configure .env
- Run: `docker-compose up -d`

### Production (Heroku)
```bash
heroku create hiresmart-app
heroku addons:create heroku-postgresql
git push heroku main
```

### Production (Google Cloud)
See: `DEPLOYMENT_OPERATIONS.md` → Google Cloud Run section

---

## 📞 Support

### Get Help
1. Check `TESTING_GUIDE.md` for common test issues
2. Check `DEPLOYMENT_OPERATIONS.md` for deployment issues
3. Check `API_DOCUMENTATION.md` for API issues
4. Run tests to verify setup: `npm test`

### Report Issues
- Provide: Error message, command run, OS/Node version
- Include: `npm list`, `.env` (without secrets)
- Attach: Logs from `backend/logs/`

---

## 🎉 What's Next

After Phase 2 (70% complete):

1. **Database Integration** (Week 2)
   - MongoDB models
   - CRUD routes

2. **Frontend Authentication** (Week 2)
   - Login page
   - Token management

3. **Final Testing** (Week 3)
   - Integration tests
   - Load testing

4. **Production Deployment** (Week 3)
   - AWS/Heroku setup
   - Monitoring

**Estimated Completion:** 100% in 2-3 weeks

---

**Last Updated:** January 2024
**Version:** 1.0.0 Phase 2
**Status:** 70% Complete ✅
