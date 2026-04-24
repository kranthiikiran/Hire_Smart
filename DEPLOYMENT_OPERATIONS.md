# HireSmart Development & Deployment Guide

## Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [Docker Containerization](#docker-containerization)
3. [Environment Configuration](#environment-configuration)
4. [Production Deployment](#production-deployment)
5. [Monitoring & Logging](#monitoring--logging)
6. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB 6.0+ or Docker
- Redis 6.0+ or Docker
- npm or yarn

### Step 1: Clone and Navigate
```bash
cd HireSmart_Project
cd backend
npm install
```

### Step 2: Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Step 3: Start MongoDB (Docker)
```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:6.3
```

### Step 4: Start Redis (Docker)
```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7-alpine
```

### Step 5: Install Python Dependencies
```bash
# Create virtual environment
python -m venv venv

# Activate
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install packages
pip install -r requirements.txt
```

### Step 6: Start Backend Server
```bash
npm start
```

Expected output:
```
🚀 HireSmart Server running on http://localhost:3000
📊 API endpoint: http://localhost:3000/api/analyze
✅ Authentication: JWT-based
📦 Cache: Redis (if available)
🔄 Batch Processing: Bull Queue
```

### Step 7: Verify Setup
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "HireSmart API is running",
  "cache": "Connected",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

---

## Docker Containerization

### Quick Start with Docker Compose

#### Option 1: Full Stack Setup (Recommended)
```bash
# Build and start all services
docker-compose up --build

# In background
docker-compose up -d --build
```

#### Option 2: Stop Services
```bash
docker-compose down

# Remove volumes too (WARNING: Deletes data)
docker-compose down -v
```

#### Option 3: View Logs
```bash
docker-compose logs -f api
docker-compose logs -f mongodb
docker-compose logs -f redis
```

### Manual Docker Commands

#### Build Backend Image
```bash
cd backend
docker build -t hiresmart-api:latest .
```

#### Run API Container
```bash
docker run -d \
  --name hiresmart-api \
  -p 3000:3000 \
  -e DATABASE_URL=mongodb://admin:password@mongodb:27017/hiresmart \
  -e REDIS_HOST=redis \
  hiresmart-api:latest
```

#### Network All Containers
```bash
docker network create hiresmart-network

docker run -d \
  --network hiresmart-network \
  --name mongodb \
  -p 27017:27017 \
  mongo:6.3

docker run -d \
  --network hiresmart-network \
  --name redis \
  -p 6379:6379 \
  redis:7-alpine

docker run -d \
  --network hiresmart-network \
  --name api \
  -p 3000:3000 \
  -e DATABASE_URL=mongodb://admin:password@mongodb:27017/hiresmart \
  -e REDIS_HOST=redis \
  hiresmart-api:latest
```

---

## Environment Configuration

### Configure .env File
```bash
cp .env.example .env
```

### Key Environment Variables

**Server:**
```env
PORT=3000
NODE_ENV=production
```

**Database:**
```env
DATABASE_URL=mongodb://admin:password@localhost:27017/hiresmart
```

**Cache:**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Security:**
```env
JWT_SECRET=your-very-long-secret-key-min-32-characters
JWT_EXPIRE=3600
JWT_REFRESH_EXPIRE=2592000
```

**API Keys:**
```env
OPENAI_API_KEY=sk-...
```

### Validate Configuration
```bash
node -e "console.log(require('dotenv').config())"
```

---

## Production Deployment

### Option 1: AWS EC2 Deployment

#### 1. Create EC2 Instance
```bash
# Ubuntu 22.04 LTS recommended
# t3.medium or larger (2 vCPU, 4GB RAM minimum)
# Security group: Allow ports 80, 443, 3000, 27017
```

#### 2. Install Dependencies
```bash
ssh ubuntu@your-instance-ip

sudo apt update
sudo apt install -y nodejs npm python3 python3-pip docker.io docker-compose

# Add user to docker group
sudo usermod -aG docker ubuntu
```

#### 3. Deploy Application
```bash
# Clone repository
git clone <your-repo-url>
cd HireSmart_Project

# Create .env from template
cp backend/.env.example backend/.env
# Edit with production values

# Start with Docker Compose
docker-compose up -d

# Verify
curl http://localhost:3000/api/health
```

#### 4. Setup SSL with Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Setup auto-renewal
sudo systemctl enable certbot.timer
```

#### 5. Setup Nginx Reverse Proxy
```bash
sudo apt install nginx -y

# Configure /etc/nginx/sites-available/default
upstream hiresmart {
    server localhost:3000;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    location / {
        proxy_pass http://hiresmart;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Option 2: Heroku Deployment

#### 1. Prepare for Heroku
```bash
# Ensure package.json has start script
# Ensure Procfile exists
echo "web: node backend/server.js" > Procfile
```

#### 2. Deploy
```bash
heroku create hiresmart-app
heroku addons:create heroku-postgresql:hobby-dev
heroku addons:create heroku-redis:premium-0
heroku config:set JWT_SECRET=your-production-secret
git push heroku main
```

#### 3. Monitor
```bash
heroku logs --tail
heroku open
```

### Option 3: Google Cloud Run Deployment

#### 1. Create Dockerfile
```bash
# Already created at backend/Dockerfile
```

#### 2. Build and Push
```bash
gcloud builds submit --tag gcr.io/your-project/hiresmart-api

gcloud run deploy hiresmart-api \
  --image gcr.io/your-project/hiresmart-api \
  --platform managed \
  --region us-central1 \
  --set-env-vars DATABASE_URL=your-mongodb-url,REDIS_HOST=your-redis-host
```

#### 3. Configure Custom Domain
```bash
gcloud run services update-traffic hiresmart-api --to-revisions LATEST=100
gcloud run domain-mappings create --service hiresmart-api --domain your-domain.com
```

---

## Monitoring & Logging

### View Logs

**Backend Logs:**
```bash
tail -f backend/logs/combined.log
tail -f backend/logs/error.log
```

**Security Events:**
```bash
grep "SECURITY" backend/logs/combined.log
```

**Performance Metrics:**
```bash
grep "PERFORMANCE" backend/logs/combined.log
```

### Health Monitoring

**Check Service Status:**
```bash
curl http://localhost:3000/api/health
```

**Monitor Docker Containers:**
```bash
docker stats hiresmart-api mongodb redis
```

**Database Connection:**
```bash
docker exec mongodb mongosh -u admin -p password --eval "db.adminCommand('ping')"
```

**Redis Connection:**
```bash
docker exec redis redis-cli ping
```

### Performance Optimization

**Monitor Batch Processing:**
```bash
docker logs hiresmart-api | grep "Analysis"
```

**Check Queue Status:**
```javascript
// Add to server.js for monitoring
const queue = require('bull');
queue('analysis-queue').getProcessingCount().then(count => {
  console.log(`Jobs in progress: ${count}`);
});
```

---

## Troubleshooting

### Issue: API Won't Start

**Error:** `Cannot find module 'express'`
```bash
# Solution
cd backend
npm install
```

**Error:** `ECONNREFUSED 127.0.0.1:27017`
```bash
# Check MongoDB
docker ps | grep mongodb
# Start if needed
docker-compose up -d mongodb
```

### Issue: Authentication Failing

**Error:** `JWT verification failed`
```bash
# Check JWT_SECRET in .env
echo $JWT_SECRET

# Should output: your-super-secret-jwt-key-change-in-production
```

### Issue: File Upload Not Working

**Error:** `Cannot read property 'path' of undefined`
```bash
# Check multer configuration
# Ensure 'uploads' directory exists
mkdir -p backend/uploads
chmod 777 backend/uploads
```

### Issue: Memory Usage High

**Solution: Implement Pagination**
```bash
# Reduce batch size
# Monitor with: docker stats
```

### Issue: Slow Response Times

**Check Database:**
```bash
docker exec mongodb mongosh << EOF
use hiresmart
db.resumes.count()
db.analyses.count()
EOF
```

**Create Indexes:**
```bash
docker exec mongodb mongosh << EOF
use hiresmart
db.resumes.createIndex({ "candidate_email": 1 })
db.analyses.createIndex({ "created_at": -1 })
EOF
```

### Issue: Redis Not Connecting

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:6379`
```bash
# Check Redis status
docker ps | grep redis

# Restart Redis
docker restart redis

# Or start new Redis container
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

---

## Backup & Recovery

### Backup Database
```bash
# Backup MongoDB
mongodump --uri="mongodb://admin:password@localhost:27017/hiresmart" \
  --out=./backup

# Backup Redis
docker exec redis redis-cli BGSAVE
docker cp redis:/data/dump.rdb ./backup/redis_dump.rdb
```

### Restore Database
```bash
# Restore MongoDB
mongorestore --uri="mongodb://admin:password@localhost:27017" \
  ./backup

# Restore Redis
docker cp ./backup/redis_dump.rdb redis:/data/dump.rdb
docker restart redis
```

---

## Performance Tuning

### Optimize Node.js
```bash
# Increase file descriptors
ulimit -n 65536

# Run with cluster mode
NODE_ENV=production node --max-old-space-size=4096 server.js
```

### Database Optimization
```bash
# Add indexes
db.resumes.createIndex({ job_id: 1, created_at: -1 })
db.analyses.createIndex({ user_id: 1, created_at: -1 })
```

### Caching Strategy
```javascript
// In auth.js
const cacheKey = `session:${userId}`;
const ttlSeconds = 30 * 24 * 60 * 60; // 30 days
```

---

## Scaling Strategies

### Horizontal Scaling
1. Deploy multiple API instances behind load balancer
2. Use sticky sessions for authenticated users
3. Share Redis instance across instances
4. Use MongoDB replica set

### Vertical Scaling
1. Increase instance size (CPU/RAM)
2. Optimize database queries
3. Implement HTTP caching
4. Use CDN for static assets

---

## Security Checklist

- [ ] Set strong JWT_SECRET in production
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Rate limit enabled
- [ ] Helmet.js enabled for headers
- [ ] Input validation on all endpoints
- [ ] Secure MongoDB credentials
- [ ] Secure Redis (if exposed)
- [ ] Regular security patches
- [ ] Log and monitor suspicious activity

---

## Next Steps

1. [ ] Setup CI/CD pipeline (GitHub Actions)
2. [ ] Implement automated backups
3. [ ] Setup error tracking (Sentry)
4. [ ] Implement APM (New Relic, DataDog)
5. [ ] Setup alerts for critical issues
6. [ ] Load testing with Artillery
7. [ ] Disaster recovery plan

---

**Last Updated:** January 2024
**Version:** 1.0.0
