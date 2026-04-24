# HireSmart - AI Resume Screening System

<div align="center">

![HireSmart Logo](https://img.shields.io/badge/HireSmart-AI%20Resume%20Screening-blue?style=for-the-badge)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-000000?style=flat&logo=express)](https://expressjs.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker)](https://www.docker.com/)

**Production-ready AI-powered resume screening system for modern recruitment workflows**

[Features](#features) • [Quick Start](#quick-start) • [Architecture](#architecture) • [API Docs](#api-documentation) • [Deployment](#deployment)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

HireSmart is an enterprise-grade AI-powered resume screening system that automates candidate evaluation using Natural Language Processing (NLP) and machine learning. It helps recruiters save time by automatically analyzing resumes against job descriptions, ranking candidates, and providing detailed insights.

### Key Capabilities

- **Intelligent Matching**: AI-powered skill extraction and matching
- **Batch Processing**: Analyze multiple resumes simultaneously
- **Smart Ranking**: Automatic candidate ranking based on weighted scores
- **Detailed Analytics**: Comprehensive dashboard with insights
- **Role-Based Access**: Separate workflows for recruiters and job seekers
- **Production Ready**: Dockerized, secure, and scalable

---

## ✨ Features

### For Recruiters

- 📤 **Batch Resume Upload**: Upload up to 20 resumes at once (PDF, DOCX, TXT)
- 🎯 **AI Analysis**: Automatic skill extraction and matching against job requirements
- 📊 **Candidate Ranking**: Ranked results with color-coded match scores
- 📈 **Analytics Dashboard**: Track screening history and performance metrics
- ⚡ **Fast Processing**: Optimized for quick turnaround times

### For Job Seekers

- 📋 **Resume Analysis**: Get AI-powered feedback on your resume
- 🎓 **Skill Gap Analysis**: Identify missing skills for target positions
- 💡 **Improvement Suggestions**: Actionable recommendations
- 📊 **Match Scores**: See how well you match job requirements

### Technical Features

- 🔐 **JWT Authentication**: Secure token-based authentication
- 🔄 **Real-time Processing**: Instant analysis results
- 💾 **JSON Storage**: Enhanced file-based storage (MongoDB-ready)
- 🐳 **Docker Support**: Containerized deployment
- 🎨 **Modern UI**: Responsive React interface with smooth UX
- 📱 **Mobile Friendly**: Works seamlessly on all devices

---

## 🛠 Tech Stack

### Frontend

```
├── React 18.2
├── React Router 6.20
├── Vite 5.0
├── Axios
├── Recharts (Analytics)
├── Lucide Icons
└── React Dropzone
```

### Backend

```
├── Node.js 18+
├── Express 4.18
├── JWT Authentication
├── Multer (File Upload)
├── PDF-Parse
├── Mammoth (DOCX)
├── Winston (Logging)
└── Helmet (Security)
```

### AI/NLP

```
├── OpenAI GPT Structured Analysis
├── OpenAI Embeddings Semantic Similarity
├── Skill Extraction and Gap Detection
├── AI Scoring and Ranking Rationale
└── Candidate Summary Generation
```

### DevOps

```
├── Docker & Docker Compose
├── Nginx (Production)
├── Redis (Caching)
└── PM2 (Process Management)
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Login   │ │Dashboard │ │  Upload  │ │ Results  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │ REST API (JWT)
┌───────────────────────┴─────────────────────────────────┐
│                  BACKEND (Node.js/Express)               │
│  ┌────────────────────────────────────────────────────┐ │
│  │             API Routes & Middleware                 │ │
│  │  • Authentication  • Validation  • Rate Limiting    │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐ │
│  │   Resume    │ │  AI Service  │ │   Data Store   │  │
│  │   Parser    │ │   Engine     │ │   (JSON/DB)    │  │
│  └─────────────┘ └──────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────┘

         Scoring Formula:
         ────────────────
         Final Score = 
           60% Skill Match
         + 25% Experience Relevance
         + 15% Semantic Similarity
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Docker** (optional): For containerized deployment

### Installation

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd HireSmart_Project
```

#### 2. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend-react
npm install
```

#### 3. Environment Configuration

**Backend** - Create `backend/.env`:
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your_super_secret_key_change_this_in_production
JWT_REFRESH_SECRET=your_refresh_secret_key_change_this
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

**Frontend** - Create `frontend-react/.env`:
```env
VITE_API_URL=http://localhost:3000/api
```

#### 4. Start Development Servers

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend-react
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:3001
- **Backend**: http://localhost:3000
- **API Health**: http://localhost:3000/api/health

---

## 💻 Development

### Project Structure

```
HireSmart_Project/
├── frontend-react/          # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── context/         # React context
│   │   ├── utils/           # Utility functions
│   │   ├── App.jsx          # Main app component
│   │   └── main.jsx         # Entry point
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
│
├── backend/                 # Node.js backend
│   ├── middleware/          # Express middleware
│   │   ├── auth.js         # JWT authentication
│   │   ├── validation.js   # Input validation
│   │   └── logging.js      # Request logging
│   ├── services/            # Business logic
│   │   ├── aiService.js    # AI analysis
│   │   ├── resumeParser.js # File parsing
│   │   ├── dataStore.js    # Data persistence
│   │   └── cacheManager.js # Caching
│   ├── data/                # JSON storage
│   ├── uploads/             # Uploaded files
│   ├── logs/                # Application logs
│   ├── server.js            # Main server
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.prod.yml  # Production Docker setup
└── README.md
```

### Available Scripts

#### Frontend

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Lint code
```

#### Backend

```bash
npm start          # Start production server
npm run dev        # Start with nodemon
npm test           # Run tests
npm run lint       # Lint code
```

---

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "recruiter"  // or "user"
}

Response: 201 Created
{
  "user": { "id": "...", "email": "...", "role": "..." },
  "accessToken": "jwt_token_here"
}
```

#### Login
```http
POST /api/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123",
  "role": "recruiter"
}

Response: 200 OK
{
  "user": { ... },
  "accessToken": "jwt_token_here"
}
```

### Analysis Endpoints

#### Batch Resume Analysis
```http
POST /api/analyze/batch
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- jobTitle: "Senior Software Engineer"
- jobDescription: "We are looking for..."
- resumes: [file1.pdf, file2.pdf, ...]

Response: 200 OK
{
  "success": true,
  "batchId": "uuid",
  "candidatesAnalyzed": 5,
  "avgScore": 72,
  "message": "Analysis completed successfully"
}
```

#### Get Analysis Results
```http
GET /api/analytics/results/:id
Authorization: Bearer {token}

Response: 200 OK
{
  "id": "...",
  "jobTitle": "...",
  "jobDescription": "...",
  "candidates": [
    {
      "name": "...",
      "matchScore": 85,
      "classification": "suitable",
      "skillsMatched": [...],
      "skillsMissing": [...],
      "summary": "..."
    }
  ]
}
```

#### Get Dashboard Statistics
```http
GET /api/analytics/stats
Authorization: Bearer {token}

Response: 200 OK
{
  "totalAnalyses": 25,
  "averageScore": 68.5,
  "recentScores": [72, 85, 61, ...],
  "classifications": {
    "suitable": 10,
    "partial": 12,
    "notSuitable": 3
  }
}
```

#### Get Analysis History
```http
GET /api/analytics/history?limit=20
Authorization: Bearer {token}

Response: 200 OK
[
  {
    "id": "...",
    "jobTitle": "...",
    "candidateCount": 5,
    "matchScore": 75,
    "classification": "suitable",
    "createdAt": "2024-..."
  }
]
```

### Response Status Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request |
| 401  | Unauthorized |
| 403  | Forbidden |
| 404  | Not Found |
| 500  | Server Error |

---

## 🐳 Deployment

### Docker Deployment (Recommended)

#### 1. Build and Run with Docker Compose

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

#### 2. Environment Variables

Create a `.env` file in the project root:

```env
JWT_SECRET=your_production_secret_key_minimum_256_bits
JWT_REFRESH_SECRET=your_refresh_secret_key_minimum_256_bits
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
NODE_ENV=production
```

### Manual Deployment

#### Backend Deployment

```bash
# Build
cd backend
npm ci --production

# Start with PM2
pm2 start server.js --name hiresmart-backend

# Or with systemd
sudo systemctl start hiresmart-backend
```

#### Frontend Deployment

```bash
# Build
cd frontend-react
npm ci
npm run build

# Serve with Nginx
sudo cp -r dist/* /var/www/hiresmart/
sudo nginx -s reload
```

### Cloud Deployment

The application can be deployed to:
- **AWS**: EC2, ECS, or Elastic Beanstalk
- **Azure**: App Service or Container Instances
- **Google Cloud**: Cloud Run or App Engine
- **Heroku**: Web dynos
- **DigitalOcean**: App Platform or Droplets

---

## 🔒 Security

### Implemented Security Measures

- ✅ **JWT Authentication**: Secure token-based auth
- ✅ **Password Hashing**: bcryptjs with salt rounds
- ✅ **Rate Limiting**: Prevent brute force attacks
- ✅ **Helmet.js**: HTTP security headers
- ✅ **Input Validation**: Joi schema validation
- ✅ **File Type Validation**: Whitelist-based filtering
- ✅ **CORS Configuration**: Configured origins
- ✅ **Security Logging**: Winston audit logs

### Best Practices

1. **Environment Variables**: Never commit secrets
2. **Token Expiry**: Short-lived access tokens
3. **HTTPS Only**: Use SSL/TLS in production
4. **Regular Updates**: Keep dependencies updated
5. **Security Scanning**: Use `npm audit`

---

## 📊 Scoring Algorithm

### Weighted Formula

```javascript
Final Score = (
  60% × Skill Match +
  25% × Experience Relevance +
  15% × Semantic Similarity
)
```

### Classification Thresholds

| Score Range | Classification | Color |
|-------------|----------------|-------|
| 75-100%     | Suitable       | 🟢 Green |
| 50-74%      | Partially Suitable | 🟡 Yellow |
| 0-49%       | Not Suitable   | 🔴 Red |

### Skill Matching

- **Exact Match**: Direct keyword matching
- **Partial Match**: Fuzzy string matching
- **Context Aware**: Considers synonyms and variations

---

## 🧪 Testing

```bash
# Run backend tests
cd backend
npm test

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📧 Support

For support, email support@hiresmart.com or open an issue in the repository.

---

## 🙏 Acknowledgments

- OpenAI for AI technology inspiration
- OpenAI for GPT and embeddings APIs
- React team for the amazing framework
- Express team for the robust backend framework

---

<div align="center">

**Built with ❤️ by the HireSmart Team**

[![GitHub](https://img.shields.io/badge/GitHub-Repository-black?style=flat&logo=github)](https://github.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?style=flat&logo=linkedin)](https://linkedin.com)

</div>
