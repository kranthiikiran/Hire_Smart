// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const pdfParse = require('pdf-parse');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const uuid = require('uuid');

// Import custom middleware and services
const { authenticate, authorize } = require('./middleware/auth');
const { validateJobDescription, validateFile } = require('./middleware/validation');
const { securityLogger, performanceLogger, logger } = require('./middleware/logging');
const { generateAccessToken, generateRefreshToken, hashPassword, verifyPassword } = require('./middleware/auth');
const cacheManager = require('./services/cacheManager');
const batchProcessor = require('./services/batchProcessor');
const dataStore = require('./services/dataStore');
const { generateJobDescription, shouldGenerateDescription } = require('./services/jobDescriptionGenerator');

const app = express();
const PORT = process.env.PORT || 5000;

const defaultCorsOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:3000'];
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
    : defaultCorsOrigins;

// Helper function to extract text from PDF files
async function extractTextFromPDF(filePath) {
    try {
        const pdfBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(pdfBuffer);
        return pdfData.text || '';
    } catch (error) {
        console.error('Error extracting text from PDF:', error.message);
        return '';
    }
}

// Helper function to extract text from DOCX files with improved reliability
async function extractTextFromDOCX(filePath) {
    try {
        const JSZip = require('jszip');
        const buffer = fs.readFileSync(filePath);
        
        const zip = new JSZip();
        await zip.loadAsync(buffer);
        
        // Try to extract from document.xml
        const docXml = zip.file('word/document.xml');
        if (!docXml) {
            console.warn('DOCX has no word/document.xml');
            return '';
        }
        
        const xmlContent = await docXml.async('text');
        
        // Extract text from word text tags (w:t) and paragraph tags
        const textMatches = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
        
        if (textMatches && textMatches.length > 0) {
            const text = textMatches
                .map(match => match.replace(/<[^>]*>/g, ''))
                .join(' ')
                .trim();
            
            if (text.length > 0) {
                return text;
            }
        }
        
        // Fallback: extract any text content between brackets
        const fallbackMatches = xmlContent.match(/>([^<]+)</g);
        if (fallbackMatches && fallbackMatches.length > 0) {
            return fallbackMatches
                .map(m => m.slice(1, -1))
                .filter(m => m.trim().length > 0 && !m.includes('<'))
                .join(' ')
                .trim();
        }
        
        return '';
    } catch (error) {
        console.error('Error extracting text from DOCX:', error.message);
        return '';
    }
}

// Helper function to extract resume text from any file
async function extractResumeText(filePath, mimeType, originalName) {
    let resumeText = '';
    
    try {
        if (mimeType === 'text/plain' || originalName.endsWith('.txt')) {
            resumeText = fs.readFileSync(filePath, 'utf-8');
        } else if (mimeType === 'application/pdf' || originalName.endsWith('.pdf')) {
            resumeText = await extractTextFromPDF(filePath);
        } else if (
            mimeType === 'application/msword' ||
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            originalName.endsWith('.docx') ||
            originalName.endsWith('.doc')
        ) {
            resumeText = await extractTextFromDOCX(filePath);
        } else {
            // Fallback: try reading as text
            resumeText = fs.readFileSync(filePath, 'utf-8').substring(0, 5000);
        }
    } catch (error) {
        console.error(`Error extracting resume text: ${error.message}`);
        resumeText = '';
    }
    
    // If extraction failed, provide meaningful fallback
    if (!resumeText || resumeText.trim().length === 0) {
        console.warn(`No text extracted from ${originalName}, using minimal content`);
        resumeText = `Resume file: ${originalName}. Unable to extract text. Analyze based on filename context.`;
    }
    
    return resumeText;
}

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 auth attempts per windowMs (increased for development/testing)
    message: 'Too many failed attempts, please try again later.',
    skip: (req, res) => process.env.NODE_ENV === 'development', // Skip rate limiting in development
    skipSuccessfulRequests: true,
});

// Apply rate limiting
app.use('/api/', limiter);
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);

// CORS and body parsing
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));
app.use(express.json({
    limit: '50mb',
    strict: true
}));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Logging middleware
app.use(require('morgan')('combined', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));

// Request ID middleware for tracking
app.use((req, res, next) => {
    req.id = uuid.v4();
    res.setHeader('X-Request-ID', req.id);
    next();
});

app.use(express.static('../frontend'));

// File upload configuration with extension preservation
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = uuid.v4().replace(/-/g, '');
        const ext = path.extname(file.originalname || '') || '.txt';
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        const allowedExtensions = ['.pdf', '.txt', '.doc', '.docx'];
        const fileExtension = path.extname(file.originalname || '').toLowerCase();

        if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Multer middleware for multiple files
const uploadMultiple = upload.array('resumes', 20); // Max 20 resumes

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        // Don't require Redis for health check - it's optional
        res.json({ 
            status: 'OK', 
            message: 'HireSmart API is running',
            timestamp: new Date().toISOString(),
            service: 'HireSmart Resume Screening API',
            version: '1.0.0',
            features: {
                authentication: 'JWT-based ✅',
                validation: 'Input validation ✅',
                logging: 'Structured logging ✅',
                cache: 'Redis (optional)',
                batch: 'Bull queue (optional)'
            }
        });
    } catch (error) {
        res.status(503).json({ 
            status: 'DEGRADED', 
            message: 'API running but some services unavailable'
        });
    }
});

// Sample data analyze endpoint
app.post('/api/analyze-sample', async (req, res) => {
    try {
        const { jobTitle, jobDescription, candidateName, resumeFile } = req.body;

        // Enhanced input validation
        if (!jobTitle || typeof jobTitle !== 'string' || jobTitle.trim().length < 2) {
            return res.status(400).json({ 
                error: 'Job title is required and must be at least 2 characters' 
            });
        }

        if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length < 10) {
            return res.status(400).json({ 
                error: 'Job description is required and must be at least 10 characters' 
            });
        }

        if (!candidateName || typeof candidateName !== 'string' || candidateName.trim().length < 2) {
            return res.status(400).json({ 
                error: 'Candidate name is required and must be at least 2 characters' 
            });
        }

        console.log(`✓ Sample analysis requested for: ${candidateName}`);

        // Read sample resume file
        const sampleResumePath = resumeFile 
            ? path.join(__dirname, '../sample_resumes', resumeFile)
            : path.join(__dirname, '../sample_resume.txt');
        
        // Check if file exists
        if (!fs.existsSync(sampleResumePath)) {
            console.error(`❌ File not found: ${sampleResumePath}`);
            return res.status(404).json({ 
                error: `Sample resume file not found. Please check the filename.` 
            });
        }
        
        const resumeText = fs.readFileSync(sampleResumePath, 'utf-8');
        console.log(`✓ File loaded: ${resumeText.length} characters`);

        // Sanitize inputs
        const sanitizedJobTitle = jobTitle.trim().substring(0, 200);
        const sanitizedJobDesc = jobDescription.trim().substring(0, 10000);
        const sanitizedCandidateName = candidateName.trim().substring(0, 100);

        // Call Python NLP analysis with timeout
        const analysisResult = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Analysis took too long. Please try again.'));
            }, 30000); // 30 second timeout
            
            analyzeWithPython(
                sanitizedJobTitle,
                sanitizedJobDesc,
                resumeText,
                sanitizedCandidateName
            ).then(result => {
                clearTimeout(timeout);
                resolve(result);
            }).catch(err => {
                clearTimeout(timeout);
                reject(err);
            });
        });

        console.log(`✓ Sample analysis completed: ${analysisResult.score}%`);
        res.json(analysisResult);

    } catch (error) {
        console.error('❌ Error in sample analysis:', error.message);
        res.status(500).json({ 
            error: error.message || 'An error occurred during sample analysis. Please try again.' 
        });
    }
});

// Main analyze endpoint
app.post('/api/analyze', 
    authenticate,  // Ensure user is authenticated
    upload.single('resume'), 
    validateFile,  // Validate uploaded file
    validateJobDescription,  // Validate job description
    async (req, res) => {
    let resumePath = null;
    
    try {
        let { jobTitle, jobDescription } = req.body;
        
        // Enhanced input validation with specific error messages
        if (!jobTitle || typeof jobTitle !== 'string' || jobTitle.trim().length < 2) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ 
                error: 'Job title is required and must be at least 2 characters' 
            });
        }
        
        // Job description is now optional - only validate if provided
        if (jobDescription && typeof jobDescription === 'string' && jobDescription.trim().length > 0 && jobDescription.trim().length < 10) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ 
                error: 'Job description must be at least 10 characters if provided' 
            });
        }
        
        if (!req.file) {
            return res.status(400).json({ 
                error: 'Resume file is required. Please upload a PDF, DOCX, or TXT file' 
            });
        }
        
        // Store path for cleanup
        resumePath = req.file.path;
        
        // Sanitize inputs (trim whitespace, limit length)
        const sanitizedJobTitle = jobTitle.trim().substring(0, 200);
        let sanitizedJobDesc = jobDescription ? jobDescription.trim().substring(0, 10000) : '';
        
        // Auto-generate job description if not provided
        if (shouldGenerateDescription(sanitizedJobDesc)) {
            sanitizedJobDesc = generateJobDescription(sanitizedJobTitle);
            logger.info('Auto-generated job description for single analysis', {
                jobTitle: sanitizedJobTitle,
                requestId: req.id
            });
        }
        
        // Extract resume text
        const resumeText = await extractResumeText(
            resumePath,
            req.file.mimetype,
            req.file.originalname
        );
        
        if (!resumeText || resumeText.trim().length === 0) {
            throw new Error('Could not extract text from resume file. Please check the file format and try again.');
        }
        
        console.log(`✓ Analyzing: ${sanitizedJobTitle}`);
        performanceLogger.info(`Analysis started for job: ${sanitizedJobTitle}`, { userId: req.user?.id, requestId: req.id });
        
        // Check cache - include resume text in hash to ensure unique results per resume
        const crypto = require('crypto');
        const cacheKey = crypto.createHash('md5').update(sanitizedJobTitle + sanitizedJobDesc + resumeText).digest('hex');
        const cachedResult = await cacheManager.getAnalysisResult(cacheKey);
        if (cachedResult) {
            performanceLogger.info('Analysis result retrieved from cache', { requestId: req.id });
            
            const analysisId = uuid.v4();
            dataStore.saveAnalysis({
                id: analysisId,
                userId: req.user?.id,
                recruiter_id: req.user?.id,
                recruiter_email: req.user?.email,
                job_title: sanitizedJobTitle,
                job_description: sanitizedJobDesc,
                resume_metadata: {
                    filename: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size
                },
                result: cachedResult,
                score: cachedResult.score || 0,
                classification: cachedResult.classification || 'Not Suitable',
                timestamp: new Date().toISOString()
            });
            
            // Cleanup uploaded file
            if (fs.existsSync(resumePath)) {
                fs.unlinkSync(resumePath);
            }
            
            return res.json({
                analysis_id: analysisId,
                ...cachedResult
            });
        }
        
        // Call Python NLP analysis with timeout (name will be extracted by Python from resume)
        const analysisResult = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Analysis took too long. Please try again.'));
            }, 30000); // 30 second timeout
            
            analyzeWithPython(
                sanitizedJobTitle,
                sanitizedJobDesc,
                resumeText,
                null  // Pass null for candidateName - Python will extract it from resume
            ).then(result => {
                clearTimeout(timeout);
                resolve(result);
            }).catch(err => {
                clearTimeout(timeout);
                reject(err);
            });
        });

        // Cache the analysis result with the unique cache key (job + resume)
        await cacheManager.cacheAnalysisResult(cacheKey, analysisResult);

        const analysisId = uuid.v4();

        dataStore.saveAnalysis({
            id: analysisId,
            userId: req.user?.id,
            recruiter_id: req.user?.id,
            recruiter_email: req.user?.email,
            job_title: sanitizedJobTitle,
            job_description: sanitizedJobDesc,
            resume_metadata: {
                filename: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            },
            result: analysisResult,
            score: analysisResult.score || 0,
            classification: analysisResult.classification || 'Not Suitable',
            timestamp: new Date().toISOString()
        });
        
        console.log(`✓ Analysis completed: ${analysisResult.score}%`);
        performanceLogger.info(`Analysis completed with score: ${analysisResult.score}%`, { userId: req.user?.id, requestId: req.id });
        
        // Cleanup uploaded file after successful processing
        if (fs.existsSync(resumePath)) {
            fs.unlinkSync(resumePath);
        }

        res.json({
            analysis_id: analysisId,
            ...analysisResult
        });

    } catch (error) {
        console.error('❌ Error in analysis:', error.message);
        
        // Cleanup file on error
        if (resumePath && fs.existsSync(resumePath)) {
            try {
                fs.unlinkSync(resumePath);
                console.log('✓ Cleaned up temporary file');
            } catch (cleanupError) {
                console.error('Failed to cleanup file:', cleanupError.message);
            }
        }
        
        // Return appropriate error message
        const status = error.message.includes('required') ? 400 : 500;
        res.status(status).json({ 
            error: error.message || 'An error occurred during analysis. Please try again.'
        });
    }
});

// Call Python analysis module (with fallback to mock analysis)
function analyzeWithPython(jobTitle, jobDescription, resumeText, candidateName) {
    return new Promise((resolve, reject) => {
        // Try Python analysis first
        const python = spawn('python', ['../ai/resume_match.py']);

        let dataBuffer = '';
        let errorBuffer = '';

        const inputData = JSON.stringify({
            job_title: jobTitle,
            job_description: jobDescription,
            resume_text: resumeText,
            candidate_name: candidateName
        });

        python.stdin.write(inputData);
        python.stdin.end();

        python.stdout.on('data', (data) => {
            dataBuffer += data.toString();
        });

        python.stderr.on('data', (data) => {
            errorBuffer += data.toString();
        });

        python.on('close', (code) => {
            if (code === 0) {
                try {
                    const result = JSON.parse(dataBuffer);
                    resolve(result);
                } catch (e) {
                    // If Python fails, use mock analysis
                    console.log('Python parsing failed, using mock analysis');
                    resolve(mockAnalysis(jobTitle, jobDescription, resumeText, candidateName));
                }
            } else {
                // If Python fails, use mock analysis
                console.log('Python process failed, using mock analysis');
                resolve(mockAnalysis(jobTitle, jobDescription, resumeText, candidateName));
            }
        });

        python.on('error', (error) => {
            // If Python fails to start, use mock analysis
            console.log('Python not available, using mock analysis');
            resolve(mockAnalysis(jobTitle, jobDescription, resumeText, candidateName));
        });
    });
}

// Advanced Mock analysis function with improved accuracy
function mockAnalysis(jobTitle, jobDescription, resumeText, candidateName) {
    // Normalize text
    const normalizeText = (text) => text.toLowerCase().trim();
    const jdNorm = normalizeText(jobDescription);
    const resumeNorm = normalizeText(resumeText);
    
    // Extract required years from job description
    const yearsMatch = jdNorm.match(/(\d+)\+?\s*(?:years|yrs)/i);
    const requiredYears = yearsMatch ? parseInt(yearsMatch[1]) : 3;
    
    // Extract candidate years from resume - more robust extraction
    let candidateYears = 0;
    const yearPatterns = [
        /(\d+)\+?\s*(?:years?|yrs?)\s+of\s+(?:professional\s+)?(?:experience|expertise)/gi,
        /(\d+)\+?\s*(?:years?|yrs?)\s+experience/gi,
        /experience:?\s+(\d+)\+?\s*(?:years?|yrs?)/gi,
        /(\d+)\+?\s*(?:years?|yrs?)/gi
    ];
    
    for (const pattern of yearPatterns) {
        const match = resumeNorm.match(pattern);
        if (match) {
            candidateYears = parseInt(match[1]);
            break;
        }
    }
    if (candidateYears === 0) candidateYears = 1;
    
    // Comprehensive skill database organized by category
    const skillDatabase = {
        'backend': ['python', 'java', 'c#', 'nodejs', 'node.js', 'express', 'django', 'flask', '.net', 'spring', 'golang', 'go', 'ruby', 'php', 'scala', 'fastapi', 'asp.net'],
        'frontend': ['javascript', 'typescript', 'react', 'vue', 'angular', 'html', 'css', 'sass', 'less', 'jquery', 'webpack', 'babel', 'nextjs', 'nuxt'],
        'databases': ['sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'nosql', 'redis', 'cassandra', 'dynamodb', 'elasticsearch', 'oracle', 'firebase'],
        'cloud': ['aws', 'azure', 'gcp', 'google cloud', 'heroku', 'firebase', 's3', 'lambda', 'ec2', 'cloud computing', 'cloud'],
        'devops': ['docker', 'kubernetes', 'k8s', 'jenkins', 'ci/cd', 'cicd', 'gitlab', 'github', 'git', 'terraform', 'ansible', 'helm', 'devops'],
        'ml': ['machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn', 'sklearn', 'keras', 'nlp', 'ai', 'artificial intelligence', 'neural network', 'data science'],
        'tools': ['git', 'jira', 'confluence', 'vim', 'vs code', 'vscode', 'intellij', 'postman', 'slack', 'trello'],
        'methodology': ['agile', 'scrum', 'kanban', 'waterfall', 'lean', 'tdd', 'bdd', 'ci/cd', 'sprint'],
        'design': ['figma', 'adobe xd', 'sketch', 'photoshop', 'illustrator', 'ux', 'ui', 'design', 'prototyping', 'wireframe'],
        'marketing': ['seo', 'sem', 'google analytics', 'social media', 'content marketing', 'email marketing', 'marketing automation', 'hubspot', 'salesforce', 'analytics'],
        'management': ['pmp', 'scrum master', 'csm', 'project management', 'leadership', 'stakeholder management', 'team lead', 'manager']
    };
    
    // Count word frequency in resume to measure depth
    const getWordFrequency = (text, words) => {
        let frequency = 0;
        words.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            const matches = text.match(regex);
            frequency += matches ? matches.length : 0;
        });
        return frequency;
    };
    
    // Extract all skills mentioned in JD
    const jdSkills = new Set();
    const resumeSkills = new Set();
    const resumeSkillFrequency = {};
    
    for (const [category, skills] of Object.entries(skillDatabase)) {
        for (const skill of skills) {
            if (jdNorm.includes(skill)) {
                jdSkills.add(skill);
            }
            if (resumeNorm.includes(skill)) {
                resumeSkills.add(skill);
                // Track frequency
                const regex = new RegExp(`\\b${skill}\\b`, 'gi');
                const matches = resumeNorm.match(regex);
                resumeSkillFrequency[skill] = matches ? matches.length : 1;
            }
        }
    }
    
    // Calculate skill matches with depth scoring
    const matchedSkills = Array.from(resumeSkills).filter(skill => jdSkills.has(skill));
    const missingSkills = Array.from(jdSkills).filter(skill => !resumeSkills.has(skill));
    const extraSkills = Array.from(resumeSkills).filter(skill => !jdSkills.has(skill));
    
    // Capitalize skill names for display
    const capitalize = (text) => text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const displayMatched = matchedSkills.map(capitalize).slice(0, 15);
    const displayMissing = missingSkills.map(capitalize).slice(0, 10);
    
    // Analyze experience level with more granularity
    const seniority = resumeNorm.includes('principal') ? 'Principal' :
                     resumeNorm.includes('senior') ? 'Senior' : 
                     resumeNorm.includes('lead') ? 'Lead' :
                     candidateYears > 8 ? 'Senior' :
                     candidateYears > 5 ? 'Mid-level' :
                     candidateYears > 2 ? 'Junior' : 'Fresher';
    
    const experienceMatch = candidateYears >= requiredYears ? 'Strong' :
                          candidateYears >= (requiredYears - 1) ? 'Good' :
                          candidateYears >= (requiredYears - 2) ? 'Moderate' :
                          candidateYears > 0 ? 'Emerging' : 'Insufficient';
    
    // Check for education requirements
    const hasRelevantDegree = resumeNorm.includes('bachelor') || resumeNorm.includes('master') || resumeNorm.includes('phd') || resumeNorm.includes('degree');
    const hasRelevantField = resumeNorm.includes('computer science') || resumeNorm.includes('engineering') || resumeNorm.includes('data science') || resumeNorm.includes('business') || resumeNorm.includes('marketing') || resumeNorm.includes('information technology') || resumeNorm.includes('it');
    
    const qualsMatch = hasRelevantDegree ? (hasRelevantField ? 'Highly Qualified' : 'Qualified') : 'Check Credentials';
    
    // Check for advanced certifications with points
    const certifications = [
        { name: 'AWS Certified', weight: 5, regex: /aws\s+certified/gi },
        { name: 'GCP Certified', weight: 5, regex: /gcp\s+certified|google\s+cloud/gi },
        { name: 'Azure Certified', weight: 5, regex: /azure\s+certified/gi },
        { name: 'PMP', weight: 4, regex: /\bpmp\b/gi },
        { name: 'Scrum Master', weight: 3, regex: /scrum\s+master|csm|certified scrum/gi },
        { name: 'Other Certified', weight: 2, regex: /certified|certification/gi }
    ];
    
    let certScore = 0;
    for (const cert of certifications) {
        if (cert.regex.test(resumeNorm)) {
            certScore = Math.max(certScore, cert.weight);
        }
    }
    
    // Calculate comprehensive match score (skills + experience only, deterministic)
    let score = 0;

    // Skill matching (0-70 points) - exact skills only
    const skillCoverage = jdSkills.size > 0 ? (matchedSkills.length / jdSkills.size) : 1;
    const skillScore = Math.round(Math.min(skillCoverage * 70, 70));

    // Experience matching (0-30 points)
    const safeRequiredYears = Math.max(requiredYears, 1);
    const experienceRatio = Math.min(candidateYears / safeRequiredYears, 1);
    const experienceScore = Math.round(experienceRatio * 30);

    // Calculate final score (no randomness, no education/cert bias)
    score = Math.round(Math.min(100, skillScore + experienceScore));
    
    // Skills match assessment
    const skillPercentage = skillCoverage * 100;
    const skillsMatch = skillPercentage >= 85 ? 'Excellent' :
                       skillPercentage >= 70 ? 'Good' :
                       skillPercentage >= 50 ? 'Moderate' :
                       skillPercentage >= 25 ? 'Limited' : 'Minimal';
    
    // Overall fit assessment with more granularity
    let overallFit = '';
    if (score >= 90) overallFit = 'Top Tier - Exceptional Match';
    else if (score >= 80) overallFit = 'Highly Recommended';
    else if (score >= 70) overallFit = 'Recommended';
    else if (score >= 60) overallFit = 'Consider';
    else if (score >= 50) overallFit = 'Further Review Needed';
    else if (score >= 35) overallFit = 'Unlikely Fit';
    else overallFit = 'Not Recommended';
    
    // Generate detailed summary
    const summary = generateSummary(candidateName, score, experienceMatch, skillsMatch, matchedSkills.length, jdSkills.size, missingSkills.length);
    
    const exactSkillMatch = jdSkills.size > 0 && missingSkills.length === 0;

    return {
        score: score,
        classification: exactSkillMatch && score >= 90 ? 'Highly Suitable' : score >= 75 ? 'Suitable' : score >= 50 ? 'Partially Suitable' : 'Not Suitable',
        matched_skills: displayMatched,
        missing_skills: displayMissing,
        experience_match: experienceMatch,
        candidate_experience_years: candidateYears,
        required_experience_years: requiredYears,
        seniority_level: seniority,
        skills_match: skillsMatch,
        qualifications_match: qualsMatch,
        overall_fit: overallFit,
        summary: summary,
        candidate_name: candidateName,
        job_title: jobTitle,
        detailed_metrics: {
            skill_coverage: `${Math.round(skillCoverage * 100)}%`,
            matched_skills_count: matchedSkills.length,
            required_skills_count: jdSkills.size,
            missing_skills_count: missingSkills.length,
            extra_skills_count: extraSkills.length,
            has_certifications: certScore > 0,
            education_level: hasRelevantDegree ? 'Bachelor or Higher' : 'Not Specified',
            exact_skill_match: exactSkillMatch
        }
    };
}

// Generate detailed summary based on analysis
function generateSummary(candidateName, score, expMatch, skillMatch, matchedCount, requiredCount, missingCount) {
    let summary = `${candidateName} `;
    
    if (score >= 80) {
        summary += `is an excellent fit for this position with a ${score}% match score. `;
        summary += `Strong background in required skills (${matchedCount}/${requiredCount} matched) and `;
        summary += `${expMatch.toLowerCase()} experience alignment. Highly recommended for immediate consideration.`;
    } else if (score >= 70) {
        summary += `is a strong candidate with a ${score}% match score. `;
        summary += `Good skill alignment (${matchedCount}/${requiredCount} matched) and `;
        summary += `${expMatch.toLowerCase()} experience. Recommended for interview.`;
    } else if (score >= 60) {
        summary += `shows moderate potential with a ${score}% match score. `;
        summary += `${matchedCount} of ${requiredCount} required skills are present, but `;
        summary += `${missingCount} key skills are missing. May require training in specific areas.`;
    } else if (score >= 50) {
        summary += `has some relevant qualifications but with a ${score}% match score. `;
        summary += `Only ${matchedCount}/${requiredCount} required skills matched, with notable gaps `;
        summary += `in ${missingCount} key areas. Further assessment recommended.`;
    } else {
        summary += `has limited alignment with this role (${score}% match score). `;
        summary += `Only ${matchedCount}/${requiredCount} required skills match, with ${missingCount} significant gaps. `;
        summary += `Consider other candidates unless willing to invest in training.`;
    }
    
    return summary;
}

// Authentication endpoint (register)
app.post('/api/register', authLimiter, async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        if (!normalizedEmail.includes('@')) {
            return res.status(400).json({ error: 'Please provide a valid email address' });
        }

        if (String(password).length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Validate role
        const validRoles = ['candidate', 'employer', 'admin'];
        const userRole = role && validRoles.includes(role) ? role : 'candidate';

        const existingUser = dataStore.findUserByEmail(normalizedEmail);
        if (existingUser) {
            return res.status(409).json({ error: 'Account already exists with this email' });
        }

        const userId = uuid.v4();
        const passwordHash = await hashPassword(password);
        const user = dataStore.createUser({
            id: userId,
            name: name || null,
            email: normalizedEmail,
            password_hash: passwordHash,
            role: userRole,
            created_at: new Date().toISOString()
        });

        const accessToken = generateAccessToken({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        });

        const refreshToken = generateRefreshToken({ id: user.id });

        return res.status(201).json({
            message: 'Registration successful',
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        logger.error('Registration error', { error: error.message, requestId: req.id });
        return res.status(500).json({ error: 'Registration failed' });
    }
});

// Authentication endpoint (login)
app.post('/api/login', authLimiter, async (req, res) => {
    try {
        const { email, password, role } = req.body;
        
        if (!email || !password) {
            securityLogger.warn('Login attempt with missing credentials', { email, requestId: req.id });
            return res.status(400).json({ error: 'Email and password required' });
        }

        if (!role || typeof role !== 'string') {
            securityLogger.warn('Login attempt with missing role', { requestId: req.id });
            return res.status(400).json({ error: 'Login error. Please check your details.' });
        }
        
        const normalizedEmail = String(email).trim().toLowerCase();
        const requestedRole = role ? String(role).trim().toLowerCase() : null;
        const normalizedRequestedRole = requestedRole === 'recruiter' ? 'employer' : requestedRole;

        const validLoginRoles = ['candidate', 'employer', 'admin'];
        if (!validLoginRoles.includes(normalizedRequestedRole)) {
            securityLogger.warn('Login attempt with invalid role', {
                requestId: req.id,
                role: normalizedRequestedRole
            });
            return res.status(400).json({ error: 'Login error. Please check your details.' });
        }
        
        const user = dataStore.findUserByEmail(normalizedEmail);

        if (!user) {
            securityLogger.failedLogin(normalizedEmail, req.ip);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isValidPassword = await verifyPassword(password, user.password_hash);
        
        if (!isValidPassword) {
            securityLogger.failedLogin(normalizedEmail, req.ip);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (normalizedRequestedRole && user.role !== normalizedRequestedRole) {
            securityLogger.warn('Login role mismatch', {
                requestId: req.id,
                userId: user.id,
                requestedRole: normalizedRequestedRole,
                actualRole: user.role
            });
            return res.status(403).json({
                error: 'Login error. Please check your details.'
            });
        }

        securityLogger.info(`Login success: ${normalizedEmail}`, { requestId: req.id, userId: user.id });

        // Generate tokens
        const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
        const refreshToken = generateRefreshToken({ id: user.id });
        
        res.json({ 
            accessToken, 
            refreshToken, 
            user: { id: user.id, email: user.email, role: user.role }
        });
    } catch (error) {
        securityLogger.error('Login error', { error: error.message, requestId: req.id });
        res.status(500).json({ error: 'Login failed' });
    }
});

// Batch analyze endpoint for multiple resumes
app.post('/api/batch-analyze', 
    authenticate,  // Ensure user is authenticated
    authorize('employer', 'recruiter', 'admin'),  // Employers, recruiters, and admins
    upload.array('resumes', 50), 
    validateJobDescription,  // Validate job description
    async (req, res) => {
    try {
        const { jobTitle, jobDescription, candidateNames } = req.body;
        const files = req.files;
        const batchId = uuid.v4();

        // Enhanced validation with specific error messages
        if (!jobTitle || typeof jobTitle !== 'string' || jobTitle.trim().length < 2) {
            if (files) files.forEach(f => {
                if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
            });
            return res.status(400).json({ 
                error: 'Job title is required and must be at least 2 characters' 
            });
        }

        // Job description is now optional - only validate if provided
        if (jobDescription && typeof jobDescription === 'string' && jobDescription.trim().length > 0 && jobDescription.trim().length < 10) {
            if (files) files.forEach(f => {
                if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
            });
            return res.status(400).json({ 
                error: 'Job description must be at least 10 characters if provided' 
            });
        }

        if (!files || files.length === 0) {
            return res.status(400).json({ 
                error: 'Please upload at least one resume file (PDF, DOCX, or TXT)' 
            });
        }

        if (files.length > 50) {
            files.forEach(f => {
                if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
            });
            return res.status(400).json({ 
                error: 'Maximum 50 resumes allowed per batch' 
            });
        }

        console.log(`✓ Batch analysis: ${files.length} resumes, Job: ${jobTitle}`);

        // Sanitize inputs
        const sanitizedJobTitle = jobTitle.trim().substring(0, 200);
        const sanitizedJobDesc = jobDescription ? jobDescription.trim().substring(0, 10000) : '';

        // Parse candidate names
        let names = [];
        if (typeof candidateNames === 'string') {
            try {
                const parsed = JSON.parse(candidateNames);
                if (Array.isArray(parsed)) {
                    names = parsed.map(n => String(n).trim()).filter(n => n.length > 0);
                } else {
                    names = candidateNames.split(',').map(n => n.trim()).filter(n => n.length > 0);
                }
            } catch {
                names = candidateNames.split(',').map(n => n.trim()).filter(n => n.length > 0);
            }
        } else if (Array.isArray(candidateNames)) {
            names = candidateNames.filter(n => n && n.trim().length > 0);
        }

        // Process each resume with timeout
        const analysisPromises = files.map(async (file, index) => {
            try {
                const candidateName = names[index] || `Candidate ${index + 1}`;
                
                // Extract text from resume using the helper function
                const resumeText = await extractResumeText(
                    file.path,
                    file.mimetype,
                    file.originalname
                );

                if (!resumeText || resumeText.trim().length === 0) {
                    throw new Error(`Could not extract text from ${file.originalname}`);
                }

                // Analyze resume with timeout
                const result = await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Analysis timeout'));
                    }, 20000); // 20 second timeout per resume
                    
                    analyzeWithPython(
                        sanitizedJobTitle,
                        sanitizedJobDesc,
                        resumeText,
                        candidateName
                    ).then(r => {
                        clearTimeout(timeout);
                        resolve(r);
                    }).catch(e => {
                        clearTimeout(timeout);
                        reject(e);
                    });
                });

                // Clean up uploaded file
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }

                return result;
            } catch (error) {
                console.error(`❌ Error analyzing resume ${index}:`, error.message);
                if (file && file.path && fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                return {
                    error: error.message,
                    candidate_name: names[index] || `Candidate ${index + 1}`,
                    file: file.originalname
                };
            }
        });

        // Wait for all analyses
        const results = await Promise.all(analysisPromises);

        // Sort by score (highest first), errors at bottom
        const sortedResults = results.sort((a, b) => {
            const scoreA = a.score || 0;
            const scoreB = b.score || 0;
            if (a.error && !b.error) return 1;
            if (!a.error && b.error) return -1;
            return scoreB - scoreA;
        });

        // ===== SOPHISTICATED MULTI-FACTOR RANKING =====
        const validResults = sortedResults.filter(r => !r.error && r.score !== undefined);
        
        if (validResults.length > 1) {
            // Calculate detailed statistics for competitive ranking
            const scores = validResults.map(r => r.score);
            const minScore = Math.min(...scores);
            const maxScore = Math.max(...scores);
            const scoreRange = maxScore - minScore;
            const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
            const stdDev = Math.sqrt(
                scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length
            );
            
            // Calculate ranking metrics for each candidate
            sortedResults.forEach((result, index) => {
                if (!result.error && result.score !== undefined) {
                    // 1. Overall Percentile (0-100, higher is better)
                    const percentile = scoreRange > 0 
                        ? Math.round(((result.score - minScore) / scoreRange) * 100)
                        : 50;
                    
                    // 2. Standard deviation scorer (how far above/below average)
                    const stdDevScore = stdDev > 0 
                        ? Math.round((result.score - avgScore) / stdDev * 10)
                        : 0;
                    
                    // 3. Gap to top candidate
                    const gapToTop = maxScore - result.score;
                    const gapPercentage = scoreRange > 0 
                        ? Math.round((gapToTop / scoreRange) * 100)
                        : 0;
                    
                    // 4. Matched skills ratio (quality metric)
                    const skillsRatio = result.matched_skills 
                        ? Math.round((result.matched_skills.length / Math.max(result.matched_skills.length + (result.missing_skills?.length || 0), 1)) * 100)
                        : 0;
                    
                    // 5. Experience match scoring
                    let experienceScore = 0;
                    if (result.experience_match) {
                        if (result.experience_match.includes('Senior') || result.experience_match.includes('8+')) {
                            experienceScore = 85;
                        } else if (result.experience_match.includes('Mid') || result.experience_match.includes('5') || result.experience_match.includes('6') || result.experience_match.includes('7')) {
                            experienceScore = 70;
                        } else if (result.experience_match.includes('Junior') || result.experience_match.includes('0-3') || result.experience_match.includes('3')) {
                            experienceScore = 50;
                        }
                    }
                    
                    // Calculate composite ranking score
                    const compositeScore = Math.round(
                        (percentile * 0.35) +          // 35% - Overall percentile
                        (skillsRatio * 0.30) +         // 30% - Skills coverage
                        (experienceScore * 0.20) +     // 20% - Experience level
                        (Math.min(stdDevScore + 50, 100) * 0.15)  // 15% - Deviation from average
                    );
                    
                    // Store detailed metrics
                    result.ranking_metrics = {
                        percentile: percentile,
                        skills_ratio: skillsRatio,
                        experience_score: experienceScore,
                        gap_to_top: gapToTop,
                        gap_percentage: gapPercentage,
                        composite_score: compositeScore,
                        std_dev_score: stdDevScore,
                        avg_pool_score: avgScore,
                        competitive_tier: calculateTier(percentile)
                    };
                    
                    // Adjust final score for better distribution
                    result.original_score = result.score;
                    result.score = compositeScore;
                }
            });
            
            // Re-sort by composite score
            sortedResults.sort((a, b) => {
                if (a.error && !b.error) return 1;
                if (!a.error && b.error) return -1;
                const scoreA = a.ranking_metrics?.composite_score || a.score || 0;
                const scoreB = b.ranking_metrics?.composite_score || b.score || 0;
                return scoreB - scoreA;
            });
        }

        // Add ranking with detailed context
        const rankedResults = sortedResults.map((result, index) => ({
            ...result,
            rank: index + 1,
            rank_description: generateDetailedRankDescription(
                index + 1, 
                sortedResults.length,
                result.ranking_metrics,
                result.score
            )
        }));

        rankedResults.forEach((candidate) => {
            if (candidate.error) return;

            dataStore.saveAnalysis({
                id: uuid.v4(),
                batch_id: batchId,
                recruiter_id: req.user?.id,
                recruiter_email: req.user?.email,
                job_title: sanitizedJobTitle,
                job_description: sanitizedJobDesc,
                resume_metadata: {
                    filename: candidate.file || candidate.candidate_name,
                    mimetype: 'batch-upload',
                    size: null
                },
                result: candidate,
                score: candidate.score || 0,
                classification: candidate.classification || 'Not Suitable',
                rank: candidate.rank,
                timestamp: new Date().toISOString()
            });
        });

        res.json({
            job_title: jobTitle,
            batch_id: batchId,
            total_candidates: rankedResults.length,
            candidates: rankedResults,
            summary: generateBatchSummary(rankedResults)
        });

    } catch (error) {
        console.error('Error in batch analysis:', error);
        res.status(500).json({ 
            error: error.message || 'An error occurred during batch analysis' 
        });
    }
});

// Helper function to calculate competitive tier
function calculateTier(percentile) {
    if (percentile >= 90) return 'Elite';
    if (percentile >= 75) return 'Excellent';
    if (percentile >= 60) return 'Strong';
    if (percentile >= 40) return 'Moderate';
    return 'Below Average';
}

// Helper function to generate detailed rank description with competitive analysis
function generateDetailedRankDescription(rank, total, metrics, score) {
    const topPercentile = Math.round(((total - rank + 1) / total) * 100);
    const tier = metrics?.competitive_tier || 'Unrated';
    const skillsRatio = metrics?.skills_ratio || 0;
    const gapToTop = metrics?.gap_to_top !== undefined ? metrics.gap_to_top.toFixed(1) : 'N/A';
    
    if (rank === 1) {
        return `🥇 RANK #1 - TOP CANDIDATE | Score: ${score} | Elite tier (${topPercentile}th percentile) | ${skillsRatio}% skill match | Best overall fit`;
    } else if (rank === 2) {
        return `🥈 RANK #2 - STRONG RUNNER-UP | Score: ${score} | ${tier} tier (${topPercentile}th percentile) | ${skillsRatio}% skills | Gap to top: ${gapToTop} pts`;
    } else if (rank === 3) {
        return `🥉 RANK #3 - SOLID CANDIDATE | Score: ${score} | ${tier} tier (${topPercentile}th percentile) | ${skillsRatio}% skills | Gap to top: ${gapToTop} pts`;
    } else if (rank <= Math.ceil(total * 0.2)) {
        return `⭐ TOP 20% | Rank #${rank} of ${total} | Score: ${score} | ${tier} tier | ${skillsRatio}% skills | Highly qualified`;
    } else if (rank <= Math.ceil(total * 0.4)) {
        return `✓ TOP 40% | Rank #${rank} of ${total} | Score: ${score} | ${tier} tier | ${skillsRatio}% skills | Good candidate`;
    } else if (rank <= Math.ceil(total * 0.6)) {
        return `→ MID TIER | Rank #${rank} of ${total} | Score: ${score} | ${tier} tier | ${skillsRatio}% skills | Moderate fit`;
    } else {
        return `• LOWER TIER | Rank #${rank} of ${total} | Score: ${score} | Below average fit`;
    }
}

// Helper function to get rank description [DEPRECATED - use generateDetailedRankDescription]
function getRankDescription(rank, total) {
    const topPercentile = Math.round((rank / total) * 100);
    
    if (rank === 1) {
        return `🥇 Top candidate - Best match (${topPercentile}th percentile)`;
    } else if (rank === 2) {
        return `🥈 Strong runner-up (${topPercentile}th percentile)`;
    } else if (rank === 3) {
        return `🥉 Third best candidate (${topPercentile}th percentile)`;
    } else if (rank <= Math.ceil(total * 0.25)) {
        return `⭐ Top 25% - Highly recommended (${topPercentile}th percentile)`;
    } else if (rank <= Math.ceil(total * 0.5)) {
        return `✓ Top 50% - Recommended (${topPercentile}th percentile)`;
    } else {
        return `→ Further down the list (${topPercentile}th percentile)`;
    }
}

// Helper function to generate batch summary
function generateBatchSummary(rankedResults) {
    const validResults = rankedResults.filter(r => !r.error && r.score !== undefined);
    
    if (validResults.length === 0) {
        return {
            top_candidate: 'N/A',
            top_score: 0,
            average_score: 0,
            candidates_above_75: 0,
            candidates_above_50: 0,
            recommendation: 'No valid candidates to analyze'
        };
    }
    
    const topCandidate = validResults[0];
    const scores = validResults.map(r => r.score);
    
    // Calculate advanced statistics
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const medianScore = scores.length > 0 ? Math.round(scores[Math.floor(scores.length / 2)]) : 0;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const scoreRange = maxScore - minScore;
    const stdDev = Math.sqrt(
        scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length
    );
    
    // Calculate distribution
    const tiers = {
        elite: validResults.filter(r => r.score >= 85).length,
        excellent: validResults.filter(r => r.score >= 70 && r.score < 85).length,
        strong: validResults.filter(r => r.score >= 55 && r.score < 70).length,
        moderate: validResults.filter(r => r.score >= 40 && r.score < 55).length,
        below: validResults.filter(r => r.score < 40).length
    };
    
    // Calculate quality metrics
    const topThreeAvg = Math.round(validResults.slice(0, 3).reduce((sum, r) => sum + r.score, 0) / Math.min(3, validResults.length));
    const competitivenessIndex = scoreRange > 0 ? Math.round((stdDev / avgScore) * 100) : 0;
    
    let summary = {
        top_candidate: topCandidate.candidate_name,
        top_score: topCandidate.score,
        average_score: avgScore,
        median_score: medianScore,
        score_range: { min: minScore, max: maxScore, range: scoreRange },
        standard_deviation: Math.round(stdDev * 10) / 10,
        candidates_above_85: tiers.elite,
        candidates_above_75: tiers.elite + tiers.excellent,
        candidates_above_50: validResults.filter(r => r.score >= 50).length,
        tier_distribution: tiers,
        pool_competitiveness_index: competitivenessIndex,
        top_three_average: topThreeAvg,
        total_valid_candidates: validResults.length,
        recommendation: generateRecommendationText(topCandidate, tiers, avgScore, validResults.length, topThreeAvg)
    };
    
    return summary;
}

// Generate intelligent recommendation text
function generateRecommendationText(topCandidate, tiers, avgScore, totalCandidates, topThreeAvg) {
    let recommendation = '';
    
    // Top candidate analysis
    recommendation += `🎯 TOP CANDIDATE: ${topCandidate.candidate_name} (${topCandidate.score}%). `;
    
    // Pool quality analysis
    if (tiers.elite > 0) {
        recommendation += `Found ${tiers.elite} elite candidate(s). `;
    }
    if (tiers.excellent > 0) {
        recommendation += `${tiers.excellent} excellent candidate(s) in pool. `;
    }
    
    // Recommendation based on pool quality
    if (tiers.elite >= 3) {
        recommendation += `🏆 EXCELLENT POOL: Multiple top-tier candidates available. Compare top 3 carefully. `;
    } else if (tiers.excellent >= 2) {
        recommendation += `✓ GOOD POOL: Strong candidates available including top pick. `;
    } else if (avgScore >= 60) {
        recommendation += `→ MODERATE POOL: Top candidate is clear choice. `;
    } else {
        recommendation += `⚠️ CHALLENGING POOL: Even top candidate has skill gaps. Consider upskilling requirements. `;
    }
    
    // Quality commentary
    recommendation += `Average score: ${avgScore}%, Top 3 average: ${topThreeAvg}%.`;
    
    return recommendation;
}

// Process batch jobs in background after enqueueing
app.post('/api/batch-status/:batchId', authenticate, async (req, res) => {
    try {
        const { batchId } = req.params;
        const status = await batchProcessor.getBatchStatus(batchId);
        res.json(status);
    } catch (error) {
        logger.error('Batch status error', { error: error.message, requestId: req.id });
        res.status(500).json({ error: 'Failed to get batch status' });
    }
});

// Dashboard endpoint for recruiter analytics and history
app.get('/api/dashboard', authenticate, (req, res) => {
    try {
        const analyses = dataStore.getAnalysesByRecruiter(req.user.id, 100);
        const scores = analyses.map((item) => Number(item.score || 0));
        const averageScore = scores.length
            ? Math.round((scores.reduce((sum, current) => sum + current, 0) / scores.length) * 10) / 10
            : 0;

        const shortlistedCount = analyses.filter((item) => Number(item.score || 0) >= 75).length;

        res.json({
            user: {
                id: req.user.id,
                email: req.user.email,
                role: req.user.role
            },
            stats: {
                total_analyses: analyses.length,
                average_score: averageScore,
                shortlisted_candidates: shortlistedCount,
                recent_activity_count: Math.min(analyses.length, 10)
            },
            recent_analyses: analyses.slice(0, 10)
        });
    } catch (error) {
        logger.error('Dashboard fetch failed', { error: error.message, requestId: req.id });
        res.status(500).json({ error: 'Failed to load dashboard data' });
    }
});

// ============================================
// ENHANCED API ROUTES FOR REACT FRONTEND
// ============================================

const resumeParser = require('./services/resumeParser');
const aiService = require('./services/aiService');

// Batch Resume Analysis with AI
app.post('/api/analyze/batch',
    authenticate,
    uploadMultiple,
    async (req, res) => {
        const startTime = Date.now();
        
        try {
            let { jobTitle, jobDescription } = req.body;
            const files = req.files;

            if (!jobTitle) {
                return res.status(400).json({ 
                    error: 'Job title is required' 
                });
            }

            if (!files || files.length === 0) {
                return res.status(400).json({ 
                    error: 'At least one resume file is required' 
                });
            }

            // Auto-generate job description if not provided
            if (shouldGenerateDescription(jobDescription)) {
                jobDescription = generateJobDescription(jobTitle);
                logger.info('Auto-generated job description', {
                    jobTitle,
                    requestId: req.id
                });
            }

            logger.info('Batch analysis started', {
                userId: req.user.id,
                jobTitle,
                hasDescription: !!jobDescription,
                filesCount: files.length,
                requestId: req.id
            });

            // Parse all resume files
            const filePaths = files.map(f => f.path);
            const parsedResumes = await resumeParser.processMultiple(filePaths);

            logger.info('Resume parsing results', {
                total: parsedResumes.length,
                successful: parsedResumes.filter(r => r.success).length,
                requestId: req.id
            });

            // Log individual parsing errors for debugging
            parsedResumes.forEach((result, idx) => {
                if (!result.success) {
                    logger.warn(`Resume ${idx + 1} parsing failed`, {
                        fileName: result.fileName,
                        error: result.error,
                        requestId: req.id
                    });
                }
            });

            // Filter successful parses
            const validResumes = parsedResumes.filter(r => r.success);

            if (validResumes.length === 0) {
                const failureDetails = parsedResumes
                    .filter(r => !r.success)
                    .map(r => ({
                        file: r.fileName,
                        error: r.error
                    }));
                
                return res.status(400).json({
                    error: 'Failed to parse any resume files',
                    details: failureDetails,
                    hint: 'Ensure files are PDF, DOCX, or TXT format and not corrupted'
                });
            }

            // Analyze with AI
            const analysisResults = await aiService.analyzeBatch(
                validResumes.map(r => ({
                    text: r.text,
                    fileName: r.fileName,
                    name: r.metadata.name,
                    email: r.metadata.email
                })),
                jobDescription,
                jobTitle
            );

            // Create batch result
            const batchId = uuid.v4();
            const batchResult = {
                id: batchId,
                jobTitle,
                jobDescription,
                requiredSkills: analysisResults[0]?.requiredSkills || [],
                candidates: analysisResults.map((result, index) => ({
                    id: uuid.v4(),
                    name: result.name || result.metadata?.name || `Candidate ${index + 1}`,
                    email: result.email || result.metadata?.email,
                    fileName: result.fileName,
                    matchScore: result.matchScore,
                    classification: result.classification,
                    skillMatch: result.skillMatch,
                    experienceRelevance: result.experienceRelevance,
                    semanticSimilarity: result.semanticSimilarity,
                    skillsMatched: result.skillsMatched,
                    skillsMissing: result.skillsMissing,
                    summary: result.summary
                })),
                userId: req.user.id,
                userRole: req.user.role,
                userEmail: req.user.email,
                createdAt: new Date().toISOString(),
                processingTime: Date.now() - startTime
            };

            // Store result
            await dataStore.saveAnalysis(batchResult);

            logger.info('Batch analysis completed', {
                batchId,
                candidatesAnalyzed: analysisResults.length,
                processingTime: batchResult.processingTime,
                requestId: req.id
            });

            res.json({
                success: true,
                batchId,
                candidatesAnalyzed: analysisResults.length,
                avgScore: Math.round(
                    analysisResults.reduce((sum, r) => sum + r.matchScore, 0) / analysisResults.length
                ),
                message: 'Analysis completed successfully'
            });

        } catch (error) {
            logger.error('Batch analysis failed', { 
                error: error.message, 
                requestId: req.id 
            });
            res.status(500).json({ 
                error: 'Analysis failed: ' + error.message 
            });
        }
    }
);

// Get Analytics Stats for Dashboard
app.get('/api/analytics/stats', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const analyses = await dataStore.getUserAnalyses(userId);

        if (!analyses || analyses.length === 0) {
            return res.json({
                totalAnalyses: 0,
                averageScore: 0,
                recentScores: [],
                classifications: {
                    suitable: 0,
                    partial: 0,
                    notSuitable: 0
                }
            });
        }

        // Calculate statistics
        const allScores = [];
        const classifications = {
            suitable: 0,
            partial: 0,
            notSuitable: 0
        };

        analyses.forEach(analysis => {
            if (analysis.candidates) {
                analysis.candidates.forEach(candidate => {
                    allScores.push(candidate.matchScore);
                    if (candidate.classification === 'suitable') {
                        classifications.suitable++;
                    } else if (candidate.classification === 'partial') {
                        classifications.partial++;
                    } else {
                        classifications.notSuitable++;
                    }
                });
            }
        });

        const averageScore = allScores.length > 0
            ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
            : 0;

        res.json({
            totalAnalyses: analyses.length,
            averageScore: Math.round(averageScore * 10) / 10,
            recentScores: allScores.slice(-10),
            classifications
        });

    } catch (error) {
        logger.error('Stats fetch failed', { error: error.message, requestId: req.id });
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Get Analysis History
app.get('/api/analytics/history', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 50;
        
        const analyses = await dataStore.getUserAnalyses(userId);

        if (!analyses || analyses.length === 0) {
            return res.json([]);
        }

        // Transform to history format
        const history = analyses
            .map(analysis => ({
                id: analysis.id,
                jobTitle: analysis.jobTitle || analysis.job_title || 'Untitled Role',
                candidateCount: analysis.candidates?.length || (analysis.result ? 1 : 0),
                candidateName: analysis.candidates?.[0]?.name || analysis.result?.candidate_name || 'Candidate',
                matchScore: analysis.candidates?.[0]?.matchScore || analysis.score || analysis.result?.score || 0,
                classification: analysis.candidates?.[0]?.classification || analysis.classification || analysis.result?.classification || 'partial',
                createdAt: analysis.createdAt || analysis.timestamp
            }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);

        res.json(history);

    } catch (error) {
        logger.error('History fetch failed', { error: error.message, requestId: req.id });
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Get Specific Analysis Results
app.get('/api/analytics/results/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const analysis = await dataStore.getAnalysisById(id);

        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found' });
        }

        // Check ownership - handle both userId and recruiter_id for backwards compatibility
        if (analysis.userId !== userId && analysis.recruiter_id !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Check if this is a batch analysis (has candidates array)
        if (Array.isArray(analysis.candidates) && analysis.candidates.length > 0) {
            // Normalize candidates data to ensure consistent field names
            const normalizedCandidates = analysis.candidates.map(candidate => ({
                id: candidate.id,
                name: candidate.name || 'Candidate',
                email: candidate.email,
                fileName: candidate.fileName,
                matchScore: candidate.matchScore || candidate.match_score || 0,
                classification: candidate.classification || 'partial',
                skillMatch: candidate.skillMatch || candidate.skill_match || 0,
                experienceRelevance: candidate.experienceRelevance || candidate.experience_relevance || 0,
                semanticSimilarity: candidate.semanticSimilarity || candidate.semantic_similarity || 0,
                skillsMatched: candidate.skillsMatched || candidate.skills_matched || [],
                skillsMissing: candidate.skillsMissing || candidate.skills_missing || [],
                summary: candidate.summary || ''
            }));

            // Return batch analysis with all candidates
            return res.json({
                id: analysis.id,
                jobTitle: analysis.jobTitle || analysis.job_title,
                jobDescription: analysis.jobDescription || analysis.job_description,
                requiredSkills: analysis.requiredSkills || analysis.required_skills || [],
                candidates: normalizedCandidates,
                createdAt: analysis.timestamp || analysis.createdAt,
                processingTime: analysis.processingTime
            });
        }

        // Single analysis - convert to candidates format for consistency
        const normalizedAnalysis = {
            id: analysis.id,
            jobTitle: analysis.jobTitle || analysis.job_title,
            jobDescription: analysis.jobDescription || analysis.job_description,
            requiredSkills: analysis.requiredSkills || analysis.required_skills || analysis.result?.required_skills || [],
            candidates: [{
                id: analysis.id,
                name: analysis.result?.candidate_name || analysis.result?.name || 'Candidate',
                email: analysis.result?.candidate_email || analysis.result?.email,
                fileName: analysis.resume_metadata?.filename,
                matchScore: analysis.score || analysis.result?.score || 0,
                classification: analysis.classification || analysis.result?.classification || 'partial',
                skillMatch: analysis.result?.skill_match || analysis.result?.skillMatch || 0,
                experienceRelevance: analysis.result?.experience_match || analysis.result?.experienceRelevance || 0,
                semanticSimilarity: analysis.result?.semantic_similarity || analysis.result?.semanticSimilarity || 0,
                skillsMatched: analysis.result?.matched_skills || analysis.result?.skillsMatched || [],
                skillsMissing: analysis.result?.missing_skills || analysis.result?.skillsMissing || [],
                summary: analysis.result?.summary || analysis.result?.explanation || ''
            }],
            createdAt: analysis.timestamp || analysis.createdAt,
            processingTime: analysis.processingTime
        };

        res.json(normalizedAnalysis);

    } catch (error) {
        logger.error('Results fetch failed', { error: error.message, requestId: req.id });
        res.status(500).json({ error: 'Failed to fetch results' });
    }
});

// Authentication error handler
app.use((err, req, res, next) => {
    if (err.message === 'Token not found' || err.message === 'Invalid token') {
        securityLogger.warn('Unauthorized access attempt', { error: err.message, requestId: req.id });
        return res.status(401).json({ error: 'Unauthorized: ' + err.message });
    }
    
    if (err.message === 'Forbidden') {
        securityLogger.warn('Forbidden access attempt', { requestId: req.id });
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    
    // General error handling
    console.error(err.stack);
    logger.error('General error', { error: err.message, requestId: req.id });
    res.status(500).json({ error: err.message || 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 HireSmart Server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoint: http://localhost:${PORT}/api/analyze`);
    console.log('✅ Authentication: JWT-based');
    console.log('📦 Cache: Redis (if available)');
    console.log('🔄 Batch Processing: Bull Queue');
});