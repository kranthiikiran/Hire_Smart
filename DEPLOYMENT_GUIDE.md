# HireSmart - Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Production Deployment](#production-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Cloud Deployment](#cloud-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **RAM**: Minimum 2GB
- **Disk Space**: Minimum 500MB
- **Docker** (optional): 20.x or higher

### Optional Services

- **Redis**: For caching (optional)
- **MongoDB**: For database upgrade (optional)
- **Nginx**: For production serving

---

## Local Development Setup

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd HireSmart_Project
```

### Step 2: Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
NODE_ENV=development
PORT=3000
JWT_SECRET=dev_secret_key_change_in_production
JWT_REFRESH_SECRET=dev_refresh_secret_key
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
EOF

# Create required directories
mkdir -p uploads data logs

# Start development server
npm run dev
```

Backend will be available at **http://localhost:3000**

### Step 3: Frontend Setup

```bash
cd ../frontend-react

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:3000/api
EOF

# Start development server
npm run dev
```

Frontend will be available at **http://localhost:3001**

### Step 4: Test the Application

1. Open browser to http://localhost:3001
2. Register a new account
3. Login with credentials
4. Upload a job description and resumes
5. View analysis results

---

## Production Deployment

### Option 1: Manual Deployment

#### Backend Deployment

```bash
cd backend

# Install production dependencies
npm ci --production

# Set production environment
export NODE_ENV=production
export PORT=3000
export JWT_SECRET="your-production-secret-key"

# Start with PM2
npm install -g pm2
pm2 start server.js --name hiresmart-backend
pm2 save
pm2 startup
```

#### Frontend Deployment

```bash
cd frontend-react

# Build for production
npm run build

# Serve with Nginx
sudo cp -r dist/* /var/www/hiresmart/

# Configure Nginx (see nginx config below)
sudo nano /etc/nginx/sites-available/hiresmart
sudo ln -s /etc/nginx/sites-available/hiresmart /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/hiresmart;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # SSL configuration (recommended)
    # listen 443 ssl;
    # ssl_certificate /path/to/cert.pem;
    # ssl_certificate_key /path/to/key.pem;
}
```

### Option 2: Systemd Service

Create `/etc/systemd/system/hiresmart-backend.service`:

```ini
[Unit]
Description=HireSmart Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/hiresmart/backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/var/www/hiresmart/backend/.env

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable hiresmart-backend
sudo systemctl start hiresmart-backend
sudo systemctl status hiresmart-backend
```

---

## Docker Deployment

### Using Docker Compose (Recommended)

#### Step 1: Prepare Environment

Create `.env` file in project root:

```env
# Security
JWT_SECRET=your_super_secure_production_secret_minimum_256_bits
JWT_REFRESH_SECRET=your_refresh_secret_minimum_256_bits

# OpenAI API
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Node Environment
NODE_ENV=production
```

#### Step 2: Build and Deploy

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

#### Step 3: Verify Deployment

```bash
# Test backend health
curl http://localhost:3000/api/health

# Test frontend
curl http://localhost/health

# View logs
docker logs hiresmart-backend
docker logs hiresmart-frontend
```

### Manual Docker Commands

```bash
# Build backend
cd backend
docker build -t hiresmart-backend .

# Run backend
docker run -d \
  --name hiresmart-backend \
  -p 3000:3000 \
  -e JWT_SECRET=your_secret \
  -v $(pwd)/uploads:/app/backend/uploads \
  -v $(pwd)/data:/app/backend/data \
  hiresmart-backend

# Build frontend
cd ../frontend-react
docker build -t hiresmart-frontend .

# Run frontend
docker run -d \
  --name hiresmart-frontend \
  -p 80:80 \
  --link hiresmart-backend:backend \
  hiresmart-frontend
```

---

## Cloud Deployment

### AWS Deployment

#### Using AWS Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init -p node.js-18 hiresmart

# Create environment
eb create hiresmart-prod

# Deploy
eb deploy

# Open in browser
eb open
```

#### Using AWS ECS

1. Create ECR repositories
2. Push Docker images to ECR
3. Create ECS cluster
4. Define task definitions
5. Create services
6. Configure load balancer

### Azure Deployment

```bash
# Install Azure CLI
az login

# Create resource group
az group create --name hiresmart-rg --location eastus

# Create container registry
az acr create --resource-group hiresmart-rg \
  --name hiresmart --sku Basic

# Build and push
az acr build --registry hiresmart \
  --image hiresmart-backend:latest ./backend

# Create container instance
az container create --resource-group hiresmart-rg \
  --name hiresmart-backend \
  --image hiresmart.azurecr.io/hiresmart-backend:latest \
  --dns-name-label hiresmart \
  --ports 3000
```

### Google Cloud Platform

```bash
# Initialize gcloud
gcloud init

# Build and push to Container Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/hiresmart-backend

# Deploy to Cloud Run
gcloud run deploy hiresmart-backend \
  --image gcr.io/PROJECT_ID/hiresmart-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Heroku Deployment

```bash
# Login to Heroku
heroku login

# Create app
heroku create hiresmart-app

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret

# Deploy backend
cd backend
git init
heroku git:remote -a hiresmart-app
git add .
git commit -m "Initial deployment"
git push heroku main

# Deploy frontend to Netlify or Vercel
```

### DigitalOcean App Platform

1. Connect GitHub repository
2. Configure build settings:
   - Build Command: `npm run build`
   - Run Command: `node server.js`
3. Set environment variables
4. Deploy

---

## Environment Variables Reference

### Backend Required Variables

```env
# Application
NODE_ENV=production
PORT=3000

# Security (REQUIRED - Generate secure random strings)
JWT_SECRET=minimum_32_characters_random_string
JWT_REFRESH_SECRET=minimum_32_characters_random_string

# OpenAI AI Pipeline
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Optional Redis
REDIS_URL=redis://localhost:6379
```

### Frontend Required Variables

```env
# API Configuration
VITE_API_URL=http://your-domain.com/api

# Application
VITE_APP_NAME=HireSmart
VITE_APP_VERSION=1.0.0
```

### Generating Secure Secrets

```bash
# Generate JWT secrets (Linux/Mac)
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or use online generator (for development only)
# Visit: https://randomkeygen.com/
```

---

## SSL/TLS Configuration

### Using Let's Encrypt with Certbot

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Manual SSL Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # ... rest of configuration
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Monitoring & Logging

### Application Logs

```bash
# View backend logs (PM2)
pm2 logs hiresmart-backend

# View backend logs (Docker)
docker logs -f hiresmart-backend

# View systemd logs
sudo journalctl -u hiresmart-backend -f
```

### Health Checks

```bash
# Backend health
curl http://localhost:3000/api/health

# Expected response
{"status":"OK","timestamp":"2024-...","uptime":...}

# Frontend health
curl http://localhost/health
```

### Monitoring Tools

- **PM2 Monitoring**: `pm2 monit`
- **Docker Stats**: `docker stats`
- **System Monitoring**: Use tools like Grafana, Prometheus, DataDog

---

## Backup & Recovery

### Backup Data

```bash
# Backup JSON store
tar -czf backup-$(date +%Y%m%d).tar.gz \
  backend/data/ \
  backend/uploads/

# Restore
tar -xzf backup-20240101.tar.gz -C /path/to/restore/
```

### Database Migration (Optional)

To migrate from JSON to MongoDB:

1. Export existing data
2. Set up MongoDB
3. Update backend configuration
4. Import data to MongoDB
5. Test thoroughly

---

## Scaling

### Horizontal Scaling

```bash
# Run multiple backend instances with PM2
pm2 start server.js -i max --name hiresmart-backend

# Or specify number of instances
pm2 start server.js -i 4 --name hiresmart-backend
```

### Load Balancing

Use Nginx as load balancer:

```nginx
upstream backend {
    least_conn;
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
    server localhost:3004;
}

server {
    location /api/ {
        proxy_pass http://backend;
    }
}
```

---

## Troubleshooting

### Common Issues

#### 1. Backend Won't Start

```bash
# Check logs
npm run dev
# or
pm2 logs hiresmart-backend

# Common causes:
# - Port 3000 already in use
# - Missing .env variables
# - Node version mismatch
```

#### 2. Frontend Can't Connect to Backend

```bash
# Check VITE_API_URL in .env
echo $VITE_API_URL

# Test backend directly
curl http://localhost:3000/api/health

# Check CORS settings in backend
```

#### 3. File Upload Fails

```bash
# Check uploads directory permissions
chmod 755 backend/uploads

# Check disk space
df -h

# Check file size limits in multer config
```

#### 4. JWT Token Issues

```bash
# Verify JWT_SECRET is set
echo $JWT_SECRET

# Clear browser localStorage
# Regenerate tokens by logging in again
```

### Performance Issues

```bash
# Check system resources
htop
# or
docker stats

# Optimize Node.js
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable caching (Redis)
docker run -d -p 6379:6379 redis:alpine
```

### Getting Help

- Check application logs
- Review error messages
- Search GitHub issues
- Contact support team

---

## Post-Deployment Checklist

- [ ] Environment variables configured
- [ ] SSL/TLS certificate installed
- [ ] Firewall rules configured
- [ ] Database backups automated
- [ ] Monitoring tools set up
- [ ] Log rotation enabled
- [ ] Auto-restart configured
- [ ] Health checks passing
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Documentation updated
- [ ] Team trained

---

## Updates & Maintenance

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Backend
cd backend
npm install
pm2 restart hiresmart-backend

# Frontend
cd frontend-react
npm install
npm run build
# Deploy new build
```

### Security Updates

```bash
# Check for vulnerabilities
cd backend
npm audit

cd ../frontend-react
npm audit

# Fix automatically
npm audit fix

# Review and update manually if needed
```

---

## Support

For deployment support:
- Email: devops@hiresmart.com
- Slack: #hiresmart-deployment
- Documentation: https://docs.hiresmart.com

---

**Happy Deploying! 🚀**
