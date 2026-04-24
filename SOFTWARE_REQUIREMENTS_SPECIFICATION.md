# Software Requirements Specification (SRS)

Project: HireSmart - AI Resume Screening System
Document Version: 1.0
Date: 2026-03-13
Prepared For: HireSmart Project Stakeholders
Standard Reference: IEEE 830 Style Structure

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) defines the functional and non-functional requirements for HireSmart, an AI-powered resume screening system. The system supports authenticated users in uploading resumes, comparing candidate profiles against job requirements, generating ranked outputs, and reviewing historical analysis insights.

This SRS serves as the baseline for:
- Development
- Testing and QA
- Academic project review
- Operations and deployment readiness

### 1.2 Scope
HireSmart is a full-stack web application with:
- Frontend UI for authentication, upload, dashboard, results, and history
- Backend API for auth, validation, processing orchestration, and persistence
- AI analysis pipeline using OpenAI APIs for semantic comparison, scoring, classification, and feedback generation

Core in-scope capabilities:
- User registration, login, token refresh, and logout
- Role-aware dashboards
- Resume parsing from PDF, DOCX, and TXT
- Candidate-job matching and scoring
- Candidate classification and ranking
- Analysis history with filters and aggregated metrics
- JSON export of analysis outputs

Out of scope:
- Interview scheduling workflows
- HRIS/ATS third-party integrations
- Multi-tenant enterprise admin console
- Billing/subscription management

### 1.3 Definitions, Acronyms, and Abbreviations
- API: Application Programming Interface
- JWT: JSON Web Token
- UI: User Interface
- NLP: Natural Language Processing
- SRS: Software Requirements Specification
- PII: Personally Identifiable Information
- JD: Job Description
- OpenAI: External AI provider used for embeddings and GPT inference

### 1.4 References
- IEEE 830 SRS style guidance
- Project source repository: HireSmart_Project
- Backend API docs: `backend/API_DOCUMENTATION.md`
- Deployment docs: `DEPLOYMENT_GUIDE.md`, `docker-compose*.yml`

### 1.5 Document Overview
- Section 2: Overall system description
- Section 3: External interface requirements
- Section 4: Functional requirements
- Section 5: Non-functional requirements
- Section 6: Data requirements
- Section 7: System models and use cases
- Section 8: Validation and acceptance criteria
- Section 9: Risks, assumptions, and constraints
- Section 10: Executive summary

## 2. Overall Description

### 2.1 Product Perspective
HireSmart is a client-server system composed of:
- React frontend (`frontend-react`)
- Node.js and Express backend (`backend`)
- Python-based OpenAI analysis module (`ai/resume_match.py`, `ai/openai_analyzer.py`)
- MongoDB data store through Mongoose models
- Optional queue/caching with Redis and Bull

High-level workflow:
1. User authenticates.
2. User submits job details and resume files.
3. Backend validates input and extracts text.
4. AI pipeline computes semantic alignment and structured evaluation.
5. Backend stores analysis and returns ranked candidates.
6. Dashboard and history endpoints provide analytics and traceability.

### 2.2 Product Functions
HireSmart shall provide:
- Authentication and authorization for protected operations
- Multi-file upload for recruiter flow and single-file support for candidate flow
- Resume text extraction from supported document types
- OpenAI-based scoring and classification
- Ranked results with skill gap and summary feedback
- Dashboard counters for total analyses, average score, suitable, partial, and not suitable totals
- Filterable history and results views
- Exportable analysis payload in JSON

### 2.3 User Classes and Characteristics
- Recruiter:
  - Needs quick multi-candidate screening and ranked shortlists
  - Uses dashboard metrics and history comparison
- Candidate:
  - Submits single resume and reviews fit analysis
  - Needs clear, actionable feedback
- System Maintainer:
  - Configures environment variables and deployment
  - Monitors health, logs, and runtime behavior
- Admin (model-level role support):
  - Exists in role model
  - Dedicated admin UI scope is limited in current implementation

### 2.4 Operating Environment
- Frontend:
  - Modern desktop/mobile browsers
- Backend:
  - Node.js 18+
  - Express framework
- AI Runtime:
  - Python 3.9+
  - OpenAI Python SDK
- Database:
  - MongoDB 6+
- Optional components:
  - Redis for queue/caching behavior
- Containers:
  - Docker and Docker Compose support for local/prod-like deployment

### 2.5 Design and Implementation Constraints
- Maximum upload size: 5 MB per file
- Allowed file formats: PDF, DOCX, TXT
- Auth-protected APIs require bearer token
- API throttling is enforced through rate limiting middleware
- OpenAI API key is required for analysis execution
- If Python process fails, backend retries through Node OpenAI analysis service

### 2.6 Assumptions and Dependencies
- Users provide valid, text-extractable resumes
- OpenAI API availability is sufficient for expected project usage
- MongoDB is reachable during runtime
- Frontend API URL configuration matches backend host

## 3. External Interface Requirements

### 3.1 User Interface Requirements
UI pages shall include:
- Login
- Register
- Dashboard
- Upload
- Results
- History

UI behavior requirements:
- UI-1 The system shall display role-relevant dashboard information after login.
- UI-2 The upload page shall validate required fields before submission.
- UI-3 The results page shall render each candidate once without duplicate blocks.
- UI-4 The dashboard shall display live values for total analyses and score/classification metrics.
- UI-5 The dashboard shall support filter actions from metric cards.
- UI-6 Pages shall remain usable on mobile and desktop viewports.

### 3.2 Hardware Interface Requirements
- HI-1 No specialized hardware is required.
- HI-2 Client devices shall support file upload and modern JavaScript execution.
- HI-3 Server host shall support Node.js, Python runtime, and MongoDB connectivity.

### 3.3 Software Interface Requirements
- SI-1 Frontend shall consume backend APIs over HTTP(S) JSON.
- SI-2 Backend shall communicate with MongoDB via Mongoose.
- SI-3 Backend shall execute Python analysis for primary processing.
- SI-4 Backend shall call OpenAI chat and embeddings APIs for scoring and semantic similarity.
- SI-5 Backend shall retry analysis through Node OpenAI service when Python execution fails.
- SI-6 Queue processing shall use Bull/Redis when enabled.

### 3.4 Communications Interface Requirements
- CI-1 API base route shall be `/api`.
- CI-2 Auth routes shall be available under `/api/auth`.
- CI-3 Analysis routes shall be available under `/api/analyze`.
- CI-4 JWT shall be supplied in `Authorization: Bearer <token>` header.
- CI-5 API responses shall be JSON for success and error paths.
- CI-6 Request trace ID shall be included in responses using `X-Request-ID`.

## 4. Functional Requirements

### 4.1 Authentication and Session Management
- FR-1 The system shall register users using email, password, and role.
- FR-2 The system shall reject duplicate email registration.
- FR-3 The system shall authenticate users with email and password.
- FR-4 The system shall issue access and refresh tokens on successful login.
- FR-5 The system shall support refresh-token based access renewal.
- FR-6 The system shall support logout and refresh-token invalidation.
- FR-7 Protected routes shall deny unauthenticated requests.

### 4.2 Upload and Validation
- FR-8 The system shall require `jobTitle` for analysis submission.
- FR-9 The system shall accept optional `jobDescription`.
- FR-10 The system shall auto-generate context from job title when `jobDescription` is absent or too short.
- FR-11 The system shall accept PDF, DOCX, and TXT files only.
- FR-12 The system shall reject files larger than 5 MB.
- FR-13 The system shall reject empty upload submissions.
- FR-14 Recruiter flows shall support multi-file submission up to backend limits.
- FR-15 Candidate flows shall support single-file analysis.

### 4.3 Parsing and AI Evaluation
- FR-16 The system shall extract plain text from TXT files.
- FR-17 The system shall extract plain text from PDF files.
- FR-18 The system shall extract plain text from DOCX files.
- FR-19 The system shall run AI analysis for each resume file.
- FR-20 The system shall compute score components including skill, experience relevance, and semantic similarity.
- FR-21 The system shall normalize scores to a 0-100 scale.
- FR-22 The system shall classify candidates into Suitable, Partially Suitable, or Not Suitable.
- FR-23 The system shall output matched and missing skill lists.
- FR-24 The system shall output candidate strengths, weaknesses, and summary feedback.
- FR-25 The system shall rank candidates by descending match score.
- FR-26 If Python analysis execution fails, the system shall retry via Node OpenAI analysis service.

### 4.4 Results, Dashboard, and History
- FR-27 The system shall persist analysis metadata and candidate results.
- FR-28 The system shall return analysis details by analysis ID to authorized owners only.
- FR-29 The system shall deny cross-user access to analyses.
- FR-30 The system shall provide user history with pagination support.
- FR-31 The system shall provide aggregated user metrics:
  - Total analyses
  - Average match score
  - Suitable candidate total
  - Partial candidate total
  - Not suitable candidate total
- FR-32 The dashboard shall allow classification-based filtering of visible results.
- FR-33 The history view shall support search and classification filters.
- FR-34 The results page shall provide one canonical display per candidate record.

### 4.5 Export, Logging, and Health
- FR-35 The system shall allow JSON export of analysis results.
- FR-36 The backend shall expose `/api/health` service status endpoint.
- FR-37 The backend shall log API request metadata and processing errors.
- FR-38 The backend shall include request IDs for diagnostic traceability.

## 5. Non-Functional Requirements

### 5.1 Performance
- NFR-1 Non-analysis API responses should complete within 2 seconds under normal local load.
- NFR-2 Single-resume analysis should complete within 30 seconds for typical inputs.
- NFR-3 Batch processing time shall scale with number and size of files.

### 5.2 Reliability and Availability
- NFR-4 The system shall continue processing in direct mode when Redis is unavailable.
- NFR-5 The system shall continue analysis by using Node OpenAI retry path when Python execution fails.
- NFR-6 The system shall return explicit failure details when OpenAI analysis cannot complete.

### 5.3 Security
- NFR-7 Passwords shall be stored as hashes only.
- NFR-8 JWT validation shall be enforced for protected API endpoints.
- NFR-9 CORS restrictions shall apply to configured origins.
- NFR-10 Security middleware shall apply HTTP protection headers.
- NFR-11 Rate limiting shall protect auth and analysis endpoints.

### 5.4 Usability
- NFR-12 Error messages shall clearly identify input and authorization failures.
- NFR-13 UI shall provide visible progress and completion states for upload and analysis actions.
- NFR-14 Result outputs shall use clear score and classification labels.

### 5.5 Maintainability
- NFR-15 Frontend, backend, and AI layers shall remain modular and independently testable.
- NFR-16 Environment configuration shall be externalized in `.env` and compose files.
- NFR-17 API contracts shall remain version-stable for existing frontend routes.

### 5.6 Portability
- NFR-18 The system shall run in local development and Docker environments.
- NFR-19 Frontend shall be browser-compatible on current Chrome, Edge, and Firefox versions.

## 6. Data Requirements

### 6.1 Core Entities
- User:
  - email
  - password hash
  - role
  - token state metadata
- Analysis:
  - userId
  - jobTitle
  - jobDescription
  - status
  - score summary fields
  - per-resume outputs
  - timestamps

### 6.2 Resume Result Structure
A candidate result should include:
- Candidate name or file-based identifier
- Match score (0-100)
- Skill match details
- Experience relevance details
- Semantic similarity details
- Classification
- Strengths and weaknesses
- AI-generated summary and rationale

### 6.3 Data Integrity Requirements
- DR-1 Each analysis record shall be associated with exactly one owner user.
- DR-2 Candidate result scores shall be numeric and bounded to 0-100 after normalization.
- DR-3 Classification shall map consistently from score thresholds and AI output normalization.
- DR-4 History and dashboard aggregates shall operate on the authenticated user scope only.

## 7. System Models and Use Cases

### 7.1 Primary Use Cases
- UC-1 Register account
- UC-2 Login and access dashboard
- UC-3 Upload resumes for a role
- UC-4 Review ranked results and candidate feedback
- UC-5 Filter and inspect historical analyses
- UC-6 Export analysis JSON

### 7.2 Use Case: Upload and Analyze Resumes
Actors: Recruiter, Candidate
Preconditions:
- User is authenticated.
- Upload files meet format and size limits.
Main flow:
1. User enters job title and optional job description.
2. User uploads one or more resumes.
3. Backend validates payload.
4. Text extraction executes for each file.
5. AI analysis computes scores, classification, and feedback.
6. Results are ranked and saved.
7. API returns analysis ID and candidate result payload.
Postconditions:
- Analysis record is stored.
- Dashboard and history data are available for retrieval.

### 7.3 Use Case: View Dashboard Metrics
Actors: Authenticated user
Main flow:
1. Frontend requests stats and recent history.
2. Backend computes user-scoped aggregates.
3. UI displays totals and average score.
4. User clicks metric cards to filter visible entries.
Postconditions:
- User sees up-to-date metrics and filtered subsets.

## 8. Verification and Acceptance Criteria

### 8.1 Functional Acceptance Tests
- AT-1 Register/login flow succeeds with valid credentials and fails with invalid credentials.
- AT-2 Upload API rejects unsupported file types and oversized files.
- AT-3 Analysis result includes score, classification, skills, and summary fields.
- AT-4 Results are sorted from highest to lowest score.
- AT-5 Dashboard metrics match analysis history aggregates for the same user.
- AT-6 Results page shows each candidate only once.
- AT-7 Unauthorized access to another user analysis is denied.

### 8.2 Non-Functional Acceptance Tests
- AT-8 Health endpoint responds with service status payload.
- AT-9 Auth and API rate limits trigger on excessive requests.
- AT-10 System continues operation in direct mode when Redis is disabled.
- AT-11 Python analysis failure path retries through Node OpenAI service.

## 9. Risks, Assumptions, and Constraints

### 9.1 Risks
- OpenAI API downtime or quota exhaustion can delay analysis.
- Poor resume text extraction quality can reduce matching accuracy.
- Large batch uploads may increase processing latency.

### 9.2 Assumptions
- OpenAI credentials are valid and configured in runtime environment.
- Uploaded resumes contain sufficient textual content for evaluation.
- Deployment host has adequate resources for Node, Python, and MongoDB.

### 9.3 Constraints
- Resume file size and type limits are enforced at backend validation layer.
- Protected operations require valid JWT authentication.
- AI analysis depends on external OpenAI service availability.

## 10. Executive Summary
HireSmart is an authenticated AI resume screening platform that enables users to upload resumes, compare candidate profiles against role requirements, and receive ranked, explainable outputs. The system uses OpenAI APIs for semantic similarity, structured evaluation, classification, and candidate feedback generation.

The platform combines a React frontend, Node.js and Express backend, MongoDB persistence, and Python/Node orchestration for AI processing. It supports end-to-end workflows for upload, analysis, result review, historical tracking, and export.

This SRS provides complete requirements for behavior, interfaces, quality attributes, data integrity, and acceptance tests so implementation and validation can proceed with a clear baseline.

## Appendix A: Traceability Matrix (Requirement to Module)
- FR-1 to FR-7: `backend/routes/auth.js`, `backend/middleware/auth.js`, frontend auth pages/context
- FR-8 to FR-18: `backend/routes/analyze.js`, `backend/services/resumeParser.js`, validation middleware
- FR-19 to FR-26: `ai/resume_match.py`, `ai/openai_analyzer.py`, `backend/services/aiService.js`, `backend/services/queueService.js`
- FR-27 to FR-34: `backend/models/Analysis.js`, analysis routes, dashboard/history/result frontend pages
- FR-35 to FR-38: results page export logic, `backend/server.js`, logging middleware, health route

## Appendix B: Configuration Baseline
Required backend environment variables:
- `NODE_ENV`
- `PORT`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `OPENAI_API_KEY`

Recommended optional backend variables:
- `OPENAI_MODEL` (default `gpt-4o-mini`)
- `OPENAI_EMBEDDING_MODEL` (default `text-embedding-3-small`)
- `REDIS_URL` (if queue/caching enabled)
- `QUEUE_CONCURRENCY`
