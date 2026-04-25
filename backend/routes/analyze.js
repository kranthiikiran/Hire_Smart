const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const uuid = require('uuid');
const { Analysis } = require('../models');
const dataStore = require('../services/dataStore');
const { authenticate } = require('../middleware/auth');
const { logger } = require('../middleware/logging');
const { processBatchResumes } = require('../services/queueService');
const pdfParse = require('pdf-parse');
const mongoose = require('mongoose');

const toNumber = (...values) => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const cleaned = value.replace('%', '').trim();
      const parsed = Number(cleaned);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return 0;
};

const normalizeClassification = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'suitable' || normalized === 'highly suitable' || normalized === 'suitable_candidate' || normalized === 'suitable candidate') {
    return 'SUITABLE';
  }
  if (normalized.includes('partial')) {
    return 'PARTIALLY_SUITABLE';
  }
  if (normalized.includes('not suitable') || normalized.includes('invalid') || normalized.includes('error')) {
    return 'NOT_SUITABLE';
  }
  if (normalized === 'not_suitable') {
    return 'NOT_SUITABLE';
  }
  return 'NOT_SUITABLE';
};

const isMongoConnected = () => mongoose.connection.readyState === 1;

const summarizeResumes = (resumes = []) => {
  const totalProcessed = resumes.length;
  const suitableCount = resumes.filter((resume) => resume.classification === 'SUITABLE').length;
  const partiallyCount = resumes.filter((resume) => resume.classification === 'PARTIALLY_SUITABLE').length;
  const notSuitableCount = resumes.filter((resume) => resume.classification === 'NOT_SUITABLE').length;
  const averageScore = totalProcessed > 0
    ? Math.round(resumes.reduce((sum, resume) => sum + toNumber(resume.matchScore), 0) / totalProcessed)
    : 0;

  return {
    totalProcessed,
    suitableCount,
    partiallyCount,
    notSuitableCount,
    averageScore
  };
};

const toPlainAnalysis = (analysis) => {
  if (!analysis) {
    return null;
  }

  const source = typeof analysis.toObject === 'function' ? analysis.toObject() : analysis;

  return {
    id: String(source.id || source._id || ''),
    userId: String(source.userId || ''),
    jobTitle: source.jobTitle || '',
    jobDescription: source.jobDescription || '',
    experienceLevel: source.experienceLevel || 'Any',
    resumes: Array.isArray(source.resumes) ? source.resumes : [],
    totalProcessed: toNumber(source.totalProcessed, Array.isArray(source.resumes) ? source.resumes.length : 0),
    suitableCount: toNumber(source.suitableCount),
    partiallyCount: toNumber(source.partiallyCount),
    notSuitableCount: toNumber(source.notSuitableCount),
    averageScore: toNumber(source.averageScore),
    processingTimeMs: toNumber(source.processingTimeMs),
    status: source.status || 'completed',
    errorMessage: source.errorMessage || '',
    createdAt: source.createdAt || source.timestamp || new Date().toISOString(),
    updatedAt: source.updatedAt || source.createdAt || source.timestamp || new Date().toISOString()
  };
};

const buildAnalysisRecord = ({
  analysisId,
  userId,
  jobTitle,
  jobDescription,
  experienceLevel,
  resumes,
  status,
  processingTimeMs,
  errorMessage
}) => {
  const summary = summarizeResumes(resumes);

  return {
    id: String(analysisId),
    userId: String(userId),
    jobTitle,
    jobDescription,
    experienceLevel: experienceLevel || 'Any',
    resumes,
    ...summary,
    processingTimeMs,
    status: status || 'completed',
    errorMessage: errorMessage || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

const persistAnalysisRecord = async (record) => {
  if (isMongoConnected()) {
    try {
      const analysis = new Analysis({
        _id: new mongoose.Types.ObjectId(record.id),
        userId: record.userId,
        jobTitle: record.jobTitle,
        jobDescription: record.jobDescription,
        experienceLevel: record.experienceLevel,
        resumes: record.resumes,
        totalProcessed: record.totalProcessed,
        suitableCount: record.suitableCount,
        partiallyCount: record.partiallyCount,
        notSuitableCount: record.notSuitableCount,
        averageScore: record.averageScore,
        processingTimeMs: record.processingTimeMs,
        status: record.status,
        errorMessage: record.errorMessage
      });

      await analysis.save();
      return toPlainAnalysis(analysis);
    } catch (error) {
      logger.warn('Mongo persistence failed, using fallback storage', {
        error: error.message,
        analysisId: record.id
      });
    }
  }

  const storedRecord = {
    ...record,
    userId: String(record.userId)
  };

  dataStore.saveAnalysis(storedRecord);
  return storedRecord;
};

const getStoredAnalysesForUser = async (userId, status) => {
  const userKey = String(userId);
  const analyses = [];

  if (isMongoConnected()) {
    try {
      const query = { userId };
      if (status) {
        query.status = status;
      }

      const mongoAnalyses = await Analysis.find(query)
        .sort({ createdAt: -1 })
        .lean();

      analyses.push(...mongoAnalyses.map(toPlainAnalysis));
    } catch (error) {
      logger.warn('Mongo history lookup failed, using fallback storage', {
        error: error.message,
        userId: userKey
      });
    }
  }

  const fallbackAnalyses = dataStore.getUserAnalyses(userKey)
    .filter((analysis) => !status || analysis.status === status)
    .map(toPlainAnalysis);

  analyses.push(...fallbackAnalyses);

  return Array.from(
    new Map(analyses.filter(Boolean).map((analysis) => [String(analysis.id), analysis])).values()
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

// Configure multer for file uploads
const MAX_RESUME_FILES = 50;
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = uuid.v4() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: MAX_RESUME_FILES
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(pdf|docx|txt)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, and TXT files are allowed'));
    }
  }
});

// Helper: Extract text from PDF
async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text || '';
  } catch (error) {
    logger.error('PDF extraction error:', error);
    return '';
  }
}

// Helper: Extract text from DOCX
async function extractTextFromDOCX(filePath) {
  try {
    const JSZip = require('jszip');
    const buffer = await fs.readFile(filePath);
    const zip = new JSZip();
    await zip.loadAsync(buffer);
    
    const docXml = zip.file('word/document.xml');
    if (!docXml) return '';
    
    const xmlContent = await docXml.async('text');
    const textMatches = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    
    if (textMatches) {
      return textMatches.map(match => match.replace(/<[^>]*>/g, '')).join(' ').trim();
    }
    return '';
  } catch (error) {
    logger.error('DOCX extraction error:', error);
    return '';
  }
}

// Helper: Extract text from any resume file
async function extractResumeText(filePath, mimeType, originalName) {
  try {
    if (mimeType === 'text/plain' || originalName.endsWith('.txt')) {
      return await fs.readFile(filePath, 'utf-8');
    } else if (mimeType === 'application/pdf' || originalName.endsWith('.pdf')) {
      return await extractTextFromPDF(filePath);
    } else if (originalName.match(/\.docx?$/i)) {
      return await extractTextFromDOCX(filePath);
    }
    return '';
  } catch (error) {
    logger.error('Text extraction error:', error);
    return '';
  }
}

// POST /api/analyze/batch - Batch resume analysis
router.post('/batch', authenticate, upload.array('resumes', MAX_RESUME_FILES), async (req, res) => {
  const startTime = Date.now();
  const analysisId = new mongoose.Types.ObjectId();
  
  try {
    const { jobTitle, jobDescription, experienceLevel } = req.body;
    const userId = req.user.id;
    const normalizedTitle = (jobTitle || '').trim();
    const normalizedDescription = (jobDescription || '').trim();
    const effectiveJobDescription = normalizedDescription.length >= 20
      ? normalizedDescription
      : `Role: ${normalizedTitle}. Candidate should match this role based on skills and experience.`;

    // Validate inputs
    if (!normalizedTitle) {
      // Cleanup uploaded files
      if (req.files) {
        await Promise.all(req.files.map(file => fs.unlink(file.path).catch(() => {})));
      }
      return res.status(400).json({
        success: false,
        message: 'Job title is required'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one resume file is required'
      });
    }

    logger.info(`Processing ${req.files.length} resumes for user ${userId}`);

    // Extract text from all resumes
    const resumesData = await Promise.all(
      req.files.map(async (file) => {
        const resumeText = await extractResumeText(file.path, file.mimetype, file.originalname);
        return {
          resumeFile: file.originalname,
          resumePath: file.path,
          resumeFilename: file.filename,
          resumeText
        };
      })
    );

    // Process resumes using queue service
    const batchResult = await processBatchResumes(resumesData, effectiveJobDescription, normalizedTitle);

    // Format and sort results
    const formattedResumes = batchResult.results
      .map((result, index) => {
        const matchScore = Math.max(0, Math.min(100, Math.round(toNumber(result.match_score, result.matchScore, result.score))));
        const skillMatch = Math.max(0, Math.min(100, Math.round(toNumber(result.skill_match, result.skillMatch, result.skills_match))));
        const experienceMatch = Math.max(0, Math.min(100, Math.round(toNumber(result.experience_match, result.experienceMatch, result.experienceRelevance))));
        const semanticMatch = Math.max(0, Math.min(100, Math.round(toNumber(result.semantic_similarity, result.semanticMatch, result.qualifications_match))));

        return {
        resumeId: uuid.v4(),
        candidateName: result.candidate_name || `Candidate ${index + 1}`,
        email: result.email || '',
        phone: result.phone || '',
        filename: result.resumeFile || resumesData[index].resumeFile,
        filePath: resumesData[index].resumePath,
        matchScore,
        classification: normalizeClassification(result.classification),
        skillMatch,
        experienceMatch,
        semanticMatch,
        skillsMatched: result.matched_skills || [],
        skillsMissing: result.missing_skills || [],
        additionalSkills: result.additional_skills || [],
        yearsOfExperience: toNumber(result.years_experience, result.yearsOfExperience),
        education: result.education || '',
        summary: result.summary || ''
      }})
      .sort((a, b) => b.matchScore - a.matchScore)
      .map((resume, index) => ({
        ...resume,
        rank: index + 1
      }));

    const analysisRecord = buildAnalysisRecord({
      analysisId,
      userId,
      jobTitle: normalizedTitle,
      jobDescription: effectiveJobDescription,
      experienceLevel: experienceLevel || 'Any',
      resumes: formattedResumes,
      status: 'completed',
      processingTimeMs: Date.now() - startTime
    });

    const storedAnalysis = await persistAnalysisRecord(analysisRecord);

    logger.info(`Analysis completed: ${storedAnalysis.id} (${formattedResumes.length} resumes processed)`);

    res.json({
      success: true,
      message: 'Resumes analyzed successfully',
      analysisId: storedAnalysis.id,
      totalProcessed: formattedResumes.length,
      suitableCount: storedAnalysis.suitableCount,
      partiallyCount: storedAnalysis.partiallyCount,
      notSuitableCount: storedAnalysis.notSuitableCount,
      averageScore: storedAnalysis.averageScore,
      processingTimeMs: storedAnalysis.processingTimeMs,
      resumes: formattedResumes
    });

  } catch (error) {
    logger.error('Batch analysis error:', error);
    
    // Cleanup uploaded files
    if (req.files) {
      await Promise.all(req.files.map(file => fs.unlink(file.path).catch(() => {})));
    }

    const failedRecord = buildAnalysisRecord({
      analysisId,
      userId: req.user?.id || 'unknown',
      jobTitle: (req.body?.jobTitle || '').trim() || 'Unknown role',
      jobDescription: (req.body?.jobDescription || '').trim() || '',
      experienceLevel: req.body?.experienceLevel || 'Any',
      resumes: [],
      status: 'failed',
      processingTimeMs: Date.now() - startTime,
      errorMessage: error.message
    });

    await persistAnalysisRecord(failedRecord).catch((persistError) => {
      logger.error('Failed to store failed analysis record:', persistError);
    });

    res.status(500).json({
      success: false,
      message: 'Error processing resumes',
      error: error.message
    });
  }
});

// GET /api/analyze/results/:id - Get analysis results
router.get('/results/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    let analysis = null;

    if (isMongoConnected()) {
      try {
        analysis = await Analysis.findOne({ _id: id, userId }).lean();
      } catch (error) {
        logger.warn('Mongo results lookup failed, using fallback storage', {
          error: error.message,
          analysisId: id
        });
      }
    }

    if (!analysis) {
      const fallbackAnalysis = dataStore.getAnalysisById(id);
      if (fallbackAnalysis && String(fallbackAnalysis.userId) === String(userId)) {
        analysis = fallbackAnalysis;
      }
    }

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    const normalizedAnalysis = toPlainAnalysis(analysis);

    res.json({
      success: true,
      analysis: {
        id: normalizedAnalysis.id,
        jobTitle: normalizedAnalysis.jobTitle,
        jobDescription: normalizedAnalysis.jobDescription,
        experienceLevel: normalizedAnalysis.experienceLevel,
        resumes: normalizedAnalysis.resumes,
        totalProcessed: normalizedAnalysis.totalProcessed,
        suitableCount: normalizedAnalysis.suitableCount,
        partiallyCount: normalizedAnalysis.partiallyCount,
        notSuitableCount: normalizedAnalysis.notSuitableCount,
        averageScore: normalizedAnalysis.averageScore,
        processingTimeMs: normalizedAnalysis.processingTimeMs,
        status: normalizedAnalysis.status,
        createdAt: normalizedAnalysis.createdAt
      }
    });

  } catch (error) {
    logger.error('Get results error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching results'
    });
  }
});

// GET /api/analyze/history - Get user's analysis history
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const allAnalyses = await getStoredAnalysesForUser(userId, status);
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedAnalyses = allAnalyses.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      analyses: paginatedAnalyses.map(a => ({
        id: a.id,
        jobTitle: a.jobTitle,
        totalProcessed: a.totalProcessed,
        suitableCount: a.suitableCount,
        partiallyCount: a.partiallyCount,
        notSuitableCount: a.notSuitableCount,
        averageScore: a.averageScore,
        status: a.status,
        classification: a.suitableCount > 0
          ? 'SUITABLE'
          : a.partiallyCount > 0
            ? 'PARTIALLY_SUITABLE'
            : 'NOT_SUITABLE',
        candidateName: a.resumes?.[0]?.candidateName || null,
        candidateScore: toNumber(a.resumes?.[0]?.matchScore, a.averageScore),
        candidateClassification: a.resumes?.[0]?.classification
          ? normalizeClassification(a.resumes[0].classification)
          : (a.suitableCount > 0
            ? 'SUITABLE'
            : a.partiallyCount > 0
              ? 'PARTIALLY_SUITABLE'
              : 'NOT_SUITABLE'),
        createdAt: a.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: allAnalyses.length,
        pages: Math.ceil(allAnalyses.length / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching history'
    });
  }
});

// GET /api/analyze/stats - Get user statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const analyses = await getStoredAnalysesForUser(req.user.id);

    const result = analyses.reduce((accumulator, analysis) => ({
      totalAnalyses: accumulator.totalAnalyses + 1,
      totalResumes: accumulator.totalResumes + toNumber(analysis.totalProcessed),
      totalSuitable: accumulator.totalSuitable + toNumber(analysis.suitableCount),
      totalPartial: accumulator.totalPartial + toNumber(analysis.partiallyCount),
      totalNotSuitable: accumulator.totalNotSuitable + toNumber(analysis.notSuitableCount),
      avgScore: accumulator.avgScore + toNumber(analysis.averageScore)
    }), {
      totalAnalyses: 0,
      totalResumes: 0,
      totalSuitable: 0,
      totalPartial: 0,
      totalNotSuitable: 0,
      avgScore: 0
    });

    res.json({
      success: true,
      stats: {
        totalAnalyses: result.totalAnalyses,
        totalResumesProcessed: result.totalResumes,
        suitableCandidates: result.totalSuitable,
        partialCandidates: result.totalPartial,
        notSuitableCandidates: result.totalNotSuitable,
        averageMatchScore: Math.round(result.totalAnalyses > 0 ? result.avgScore / result.totalAnalyses : 0)
      }
    });

  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
});

module.exports = router;
