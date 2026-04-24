# API Documentation

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

### Login
**POST** `/api/login`

Request:
```json
{
  "email": "recruiter@example.com",
  "password": "securePassword123"
}
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "email": "recruiter@example.com",
    "role": "recruiter"
  }
}
```

---

## Resume Analysis

### Single Resume Analysis
**POST** `/api/analyze`

**Authentication:** Required (JWT)
**Authorization:** recruiter, admin

Request (multipart/form-data):
```
- jobTitle: "Senior Backend Engineer"
- jobDescription: "We are looking for a Senior Backend Engineer with 5+ years of experience..."
- resume: <file>
```

Response:
```json
{
  "score": 82,
  "classification": "Suitable",
  "matched_skills": ["Python", "Node.js", "MongoDB"],
  "missing_skills": ["Kubernetes"],
  "experience_match": "Excellent",
  "candidate_experience_years": 7,
  "required_experience_years": 5,
  "seniority_level": "Senior",
  "skills_match": "Good",
  "qualifications_match": "Excellent",
  "overall_fit": "Highly Recommended",
  "summary": "John Smith is a strong candidate with 82% match score...",
  "candidate_name": "John Smith",
  "job_title": "Senior Backend Engineer",
  "detailed_metrics": {
    "skill_coverage": "85%",
    "matched_skills_count": 8,
    "required_skills_count": 10,
    "missing_skills_count": 2,
    "extra_skills_count": 3,
    "has_certifications": true,
    "education_level": "Master",
    "exact_skill_match": false
  }
}
```

---

### Batch Analysis
**POST** `/api/batch-analyze`

**Authentication:** Required (JWT)
**Authorization:** recruiter, admin

Request (multipart/form-data):
```
- jobTitle: "Software Engineer"
- jobDescription: "We are seeking experienced software engineers..."
- resumes: <file1>, <file2>, <file3>...
- candidateNames: ["John Smith", "Jane Doe"] (optional)
```

Response:
```json
{
  "batchId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "message": "Batch analysis queued for processing",
  "estimatedWaitTime": 120,
  "totalCandidates": 3,
  "jobTitle": "Software Engineer"
}
```

### Check Batch Status
**POST** `/api/batch-status/:batchId`

**Authentication:** Required (JWT)

Response:
```json
{
  "batchId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress": 100,
  "totalCandidates": 3,
  "processedCandidates": 3,
  "summary": {
    "top_candidate": "Jane Doe",
    "top_score": 92,
    "average_score": 78.3,
    "median_score": 79,
    "score_range": {
      "min": 65,
      "max": 92,
      "range": 27
    },
    "standard_deviation": 12.4,
    "candidates_above_85": 1,
    "candidates_above_75": 2,
    "candidates_above_50": 3,
    "tier_distribution": {
      "elite": 1,
      "excellent": 1,
      "strong": 1,
      "moderate": 0,
      "below": 0
    },
    "pool_competitiveness_index": 15.8,
    "top_three_average": 83,
    "recommendation": "🎯 TOP CANDIDATE: Jane Doe (92%)..."
  },
  "results": [
    {
      "candidate_name": "Jane Doe",
      "score": 92,
      "classification": "Highly Suitable",
      "matched_skills": ["Python", "JavaScript", "React"],
      "experience_match": "Excellent"
    }
  ]
}
```

---

## Sample Analysis

### Send Sample Data (No File Upload)
**POST** `/api/analyze-sample`

Request:
```json
{
  "jobTitle": "Frontend Developer",
  "jobDescription": "Looking for experienced React developer with 3+ years...",
  "candidateName": "John Doe",
  "resumeFile": "resume_software_engineer.txt"
}
```

Response: Same as `/api/analyze`

---

## Health Check

### Check API Status
**GET** `/api/health`

Response:
```json
{
  "status": "OK",
  "message": "HireSmart API is running",
  "cache": "Connected",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

---

## Error Handling

All errors return appropriate HTTP status codes with error details:

### 400 Bad Request
```json
{
  "error": "Job title is required and must be at least 2 characters"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized: Invalid token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden: Insufficient permissions"
}
```

### 500 Internal Server Error
```json
{
  "error": "An error occurred during analysis"
}
```

---

## Rate Limiting

- **General endpoints:** 100 requests per 15 minutes per IP
- **Auth endpoints:** 5 requests per 15 minutes per IP

Rate limit headers included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1705323045
```

---

## Best Practices

1. **Always include authentication token** for protected endpoints
2. **Provide detailed job descriptions** for better accuracy
3. **Use batch processing** for multiple resumes to leverage caching and efficiency
4. **Monitor rate limits** and implement exponential backoff for retries
5. **Log all requests** for audit and debugging purposes

---

## Example cURL Commands

### Login
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"recruiter@example.com","password":"securePassword123"}'
```

### Analyze Resume
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Authorization: Bearer <token>" \
  -F "jobTitle=Senior Engineer" \
  -F "jobDescription=Looking for a senior engineer with..." \
  -F "resume=@/path/to/resume.pdf"
```

### Batch Analysis
```bash
curl -X POST http://localhost:3000/api/batch-analyze \
  -H "Authorization: Bearer <token>" \
  -F "jobTitle=Software Engineer" \
  -F "jobDescription=Seeking software engineers..." \
  -F "resumes=@resume1.pdf" \
  -F "resumes=@resume2.pdf" \
  -F "resumes=@resume3.pdf"
```

---

## Response Time SLAs

| Endpoint | SLA | Notes |
|----------|-----|-------|
| POST /api/analyze | < 30s | Single resume analysis |
| POST /api/batch-analyze | < 30s | Queued, async processing |
| GET /api/batch-status | < 5s | Real-time status |
| GET /api/health | < 1s | Health check |

---

## Version
API Version: **1.0.0**
Last Updated: **January 2024**
