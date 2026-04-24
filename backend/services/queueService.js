const Queue = require('bull');
const Redis = require('ioredis');
const { logger } = require('../middleware/logging');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const aiService = require('./aiService');

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times) => {
    if (times > 3) {
      logger.error('Redis connection failed after 3 retries');
      return null; // Stop retrying
    }
    return Math.min(times * 100, 3000); // Exponential backoff
  }
};

// Check if Redis is available
let redisAvailable = false;
let resumeQueue = null;
const queueEnabledByConfig = String(process.env.ENABLE_QUEUE || 'false').toLowerCase() === 'true';

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
  if (normalized.includes('highly suitable') || normalized === 'suitable') {
    return 'SUITABLE';
  }
  if (normalized.includes('partial')) {
    return 'PARTIALLY_SUITABLE';
  }
  if (normalized.includes('not suitable') || normalized.includes('invalid') || normalized.includes('error')) {
    return 'NOT_SUITABLE';
  }
  return 'NOT_SUITABLE';
};

const normalizeAnalysisResult = (raw = {}) => {
  const matchScore = Math.max(0, Math.min(100, Math.round(toNumber(raw.match_score, raw.matchScore, raw.score))));
  const skillMatch = Math.max(0, Math.min(100, Math.round(toNumber(raw.skill_match, raw.skillMatch, raw.skills_match))));
  const experienceMatch = Math.max(0, Math.min(100, Math.round(toNumber(raw.experience_match, raw.experienceMatch, raw.experienceRelevance))));
  const semanticMatch = Math.max(0, Math.min(100, Math.round(toNumber(raw.semantic_similarity, raw.semanticMatch, raw.qualifications_match))));

  return {
    match_score: matchScore,
    matchScore,
    skill_match: skillMatch,
    skillMatch,
    experience_match: experienceMatch,
    experienceMatch,
    semantic_similarity: semanticMatch,
    semanticMatch,
    classification: normalizeClassification(raw.classification),
    matched_skills: raw.matched_skills || raw.skillsMatched || [],
    missing_skills: raw.missing_skills || raw.skillsMissing || [],
    additional_skills: raw.additional_skills || raw.additionalSkills || [],
    years_experience: toNumber(raw.years_experience, raw.yearsOfExperience),
    education: raw.education || '',
    summary: raw.summary || '',
    candidate_name: raw.candidate_name || raw.candidateName || '',
    email: raw.email || '',
    phone: raw.phone || ''
  };
};

const extractSkillsFromText = (text = '') => {
  const source = String(text || '').toLowerCase();
  const skillLexicon = [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust',
    'react', 'node', 'node.js', 'express', 'next.js', 'vue', 'angular',
    'html', 'css', 'tailwind', 'bootstrap',
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes',
    'git', 'github', 'ci/cd', 'jenkins',
    'machine learning', 'deep learning', 'nlp', 'openai', 'tensorflow', 'pytorch'
  ];

  const detected = new Set();
  for (const skill of skillLexicon) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
    if (pattern.test(source)) {
      detected.add(skill);
    }
  }
  return Array.from(detected);
};

const estimateYearsOfExperience = (text = '') => {
  const source = String(text || '');
  const matches = [...source.matchAll(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)/gi)];
  if (!matches.length) return 0;
  const years = matches
    .map((m) => Number(m?.[1] || 0))
    .filter((v) => Number.isFinite(v) && v >= 0 && v <= 50);
  if (!years.length) return 0;
  return Math.max(...years);
};

const ROLE_SKILL_PROFILES = [
  {
    patterns: ['data scientist', 'ml engineer', 'ai engineer', 'machine learning'],
    skills: ['python', 'sql', 'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'nlp']
  },
  {
    patterns: ['frontend developer', 'front end developer', 'ui developer', 'react developer'],
    skills: ['javascript', 'typescript', 'react', 'html', 'css']
  },
  {
    patterns: ['backend developer', 'back end developer', 'api developer', 'node developer'],
    skills: ['node.js', 'express', 'sql', 'mongodb', 'redis']
  },
  {
    patterns: ['full stack developer', 'software engineer', 'software developer'],
    skills: ['javascript', 'typescript', 'react', 'node.js', 'express', 'sql', 'mongodb', 'git']
  },
  {
    patterns: ['devops engineer', 'platform engineer', 'site reliability'],
    skills: ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'ci/cd', 'jenkins']
  },
  {
    patterns: ['qa engineer', 'test engineer', 'automation engineer'],
    skills: ['javascript', 'python', 'git', 'ci/cd']
  },
  {
    patterns: ['project manager', 'product manager'],
    skills: ['agile', 'github', 'jira']
  }
];

const inferSkillsFromJobTitle = (jobTitle = '') => {
  const title = String(jobTitle || '').toLowerCase();
  const detected = new Set();

  for (const profile of ROLE_SKILL_PROFILES) {
    const matchedProfile = profile.patterns.some((pattern) => title.includes(pattern));
    if (matchedProfile) {
      for (const skill of profile.skills) {
        detected.add(skill);
      }
    }
  }

  return Array.from(detected);
};

const getTitleAlignmentScore = (resumeText = '', jobTitle = '') => {
  const titleSource = String(jobTitle || '').toLowerCase();
  const resumeSource = String(resumeText || '').toLowerCase();
  const tokens = titleSource
    .split(/[^a-z0-9+#.]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !['senior', 'junior', 'lead', 'manager'].includes(token));

  if (!tokens.length) {
    return 50;
  }

  const hits = tokens.filter((token) => resumeSource.includes(token)).length;
  return Math.round((hits / tokens.length) * 100);
};

const createHeuristicFallbackResult = ({ resumeText, resumeFile, jobDescription, jobTitle }) => {
  const resumeSkills = extractSkillsFromText(resumeText);
  const jdSource = `${jobTitle || ''} ${jobDescription || ''}`.trim();
  const requiredFromText = extractSkillsFromText(jdSource);
  const requiredFromTitle = inferSkillsFromJobTitle(jobTitle);
  const requiredSkills = Array.from(new Set([...requiredFromText, ...requiredFromTitle]));

  const matchedSet = new Set(
    resumeSkills.filter((skill) => requiredSkills.includes(skill))
  );
  const missingSkills = requiredSkills.filter((skill) => !matchedSet.has(skill));

  const titleSkillSet = new Set(requiredFromTitle);
  const titleMatchedCount = Array.from(matchedSet).filter((skill) => titleSkillSet.has(skill)).length;
  const titleSkillCoverage = requiredFromTitle.length > 0
    ? (titleMatchedCount / requiredFromTitle.length) * 100
    : 50;

  const overallSkillCoverage = requiredSkills.length > 0
    ? (matchedSet.size / requiredSkills.length) * 100
    : Math.min(100, resumeSkills.length * 8);

  const skillCoverage = Math.round((overallSkillCoverage * 0.65) + (titleSkillCoverage * 0.35));

  const yearsOfExperience = estimateYearsOfExperience(resumeText);
  const experienceScore = Math.min(100, yearsOfExperience * 12);
  const titleAlignmentScore = getTitleAlignmentScore(resumeText, jobTitle);

  const semanticHint = Math.min(
    100,
    Math.round((skillCoverage * 0.55) + (experienceScore * 0.25) + (titleAlignmentScore * 0.2))
  );

  const matchScore = Math.max(
    10,
    Math.min(100, Math.round((skillCoverage * 0.5) + (experienceScore * 0.2) + (semanticHint * 0.2) + (titleAlignmentScore * 0.1)))
  );

  const classification = matchScore >= 75
    ? 'SUITABLE'
    : matchScore >= 50
      ? 'PARTIALLY_SUITABLE'
      : 'NOT_SUITABLE';

  return normalizeAnalysisResult({
    candidate_name: path.parse(resumeFile || 'Candidate').name,
    match_score: matchScore,
    skill_match: Math.round(skillCoverage),
    experience_match: Math.round(experienceScore),
    semantic_similarity: semanticHint,
    classification,
    matched_skills: Array.from(matchedSet),
    missing_skills: missingSkills,
    additional_skills: resumeSkills.filter((skill) => !requiredSkills.includes(skill)),
    years_experience: yearsOfExperience,
    summary: `Fallback local scoring was used because AI services were unavailable. Role alignment for "${jobTitle || 'selected role'}" was included in scoring.`
  });
};

const checkRedisConnection = async () => {
  if (!queueEnabledByConfig) {
    redisAvailable = false;
    logger.info('Queue disabled via ENABLE_QUEUE=false - using direct processing');
    return false;
  }

  const client = new Redis(redisConfig);
  // Prevent ioredis from emitting noisy unhandled error events during probe.
  client.on('error', () => {});
  
  try {
    await client.ping();
    redisAvailable = true;
    logger.info('✅ Redis connected successfully - Queue enabled');
    await client.quit();
    return true;
  } catch (error) {
    redisAvailable = false;
    logger.warn('⚠️  Redis not available - Using in-memory processing (no queue)');
    logger.warn('   To enable queue: Install Redis and start the service');
    if (client) await client.quit().catch(() => {});
    return false;
  }
};

// Initialize queue only if Redis is available
const initializeQueue = async () => {
  const isConnected = await checkRedisConnection();
  
  if (isConnected) {
    try {
      resumeQueue = new Queue('resume-analysis', {
        redis: redisConfig,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 50 // Keep last 50 failed jobs
        }
      });

      // Job event handlers
      resumeQueue.on('completed', (job, result) => {
        logger.info(`✅ Job ${job.id} completed:`, {
          resumeFile: job.data.resumeFile,
          matchScore: result?.matchScore
        });
      });

      resumeQueue.on('failed', (job, err) => {
        logger.error(`❌ Job ${job.id} failed:`, {
          resumeFile: job.data.resumeFile,
          error: err.message
        });
      });

      resumeQueue.on('stalled', (job) => {
        logger.warn(`⚠️  Job ${job.id} stalled:`, {
          resumeFile: job.data.resumeFile
        });
      });

      // Process jobs with concurrency
      const concurrency = parseInt(process.env.QUEUE_CONCURRENCY || '4');
      resumeQueue.process(concurrency, async (job) => {
        return await processResumeJob(job.data);
      });

      logger.info(`🚀 Resume analysis queue initialized with concurrency: ${concurrency}`);
    } catch (error) {
      logger.error('Failed to initialize queue:', error.message);
      redisAvailable = false;
      resumeQueue = null;
    }
  }
};

/**
 * Process a single resume analysis job
 */
const processResumeJob = async (jobData) => {
  const { resumeText, resumeFile, jobDescription, jobTitle } = jobData;
  
  try {
    logger.info(`Processing resume: ${resumeFile}`);

    let result;
    try {
      // Primary scorer: Python OpenAI-first pipeline
      result = await runPythonAnalysis(resumeText, jobDescription || '', jobTitle || '');
    } catch (pythonError) {
      logger.warn(`Python scoring unavailable for ${resumeFile}, using JS OpenAI fallback: ${pythonError.message}`);

      try {
        // Fallback scorer: Node.js OpenAI service
        const fallbackResult = await aiService.analyzeResume(resumeText, jobDescription || '', jobTitle || '');
        result = normalizeAnalysisResult(fallbackResult);
      } catch (openAiError) {
        logger.warn(`OpenAI fallback unavailable for ${resumeFile}, using deterministic local scoring: ${openAiError.message}`);
        result = createHeuristicFallbackResult({
          resumeText,
          resumeFile,
          jobDescription,
          jobTitle
        });
      }
    }
    
    return {
      resumeFile,
      ...normalizeAnalysisResult(result),
      processedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Error processing resume ${resumeFile}:`, error.message);
    throw error; // Let Bull handle retry logic
  }
};

/**
 * Run Python NLP analysis script
 */
const runPythonAnalysis = (resumeText, jobDescription, jobTitle) => {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '..', '..', 'ai', 'resume_match.py');
    
    // Check if Python script exists
    if (!fs.existsSync(pythonScript)) {
      return reject(new Error('Python script not found'));
    }

    const isWindows = process.platform === 'win32';
    const pythonCommand = isWindows ? 'py' : 'python3';
    const pythonArgs = isWindows ? ['-3', pythonScript] : [pythonScript];

    const python = spawn(pythonCommand, pythonArgs);
    
    let dataString = '';
    let errorString = '';

    // Prepare input data for Python script
    const inputData = {
      resume_text: resumeText,
      job_description: jobDescription,
      job_title: jobTitle
    };

    // Send data to Python script
    python.stdin.write(JSON.stringify(inputData));
    python.stdin.end();

    python.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorString += data.toString();
    });

    python.on('close', (code) => {
      // Some scorer paths print JSON and still exit non-zero. Prefer valid JSON if present.
      if (dataString && dataString.trim().length > 0) {
        try {
          const result = JSON.parse(dataString);
          return resolve(result);
        } catch (error) {
          logger.error('Failed to parse Python output:', dataString);
        }
      }

      if (code !== 0) {
        logger.error('Python script error:', errorString);
        return reject(new Error(`Python script exited with code ${code}: ${errorString}`));
      }

      reject(new Error('Python script returned empty output'));
    });

    python.on('error', (error) => {
      logger.error('Failed to start Python process:', error.message);
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      python.kill();
      reject(new Error('Python script timeout'));
    }, 30000);
  });
};

/**
 * Add resume analysis job to queue (if Redis available) or process directly
 */
const addResumeAnalysisJob = async (resumeData) => {
  if (redisAvailable && resumeQueue) {
    // Add to Bull queue
    const job = await resumeQueue.add(resumeData, {
      priority: resumeData.priority || 5,
      timeout: 30000
    });
    
    logger.info(`Job ${job.id} added to queue for ${resumeData.resumeFile}`);
    return { jobId: job.id, queued: true };
  } else {
    // Process directly without queue (fallback)
    logger.info(`Processing ${resumeData.resumeFile} directly (no queue)`);
    const result = await processResumeJob(resumeData);
    return { result, queued: false };
  }
};

/**
 * Process batch of resumes with concurrency control
 */
const processBatchResumes = async (resumesData, jobDescription, jobTitle) => {
  const startTime = Date.now();
  const results = [];
  
  if (redisAvailable && resumeQueue) {
    // Use Bull queue for batch processing
    logger.info(`Processing ${resumesData.length} resumes with Bull queue`);
    
    const jobs = await Promise.all(
      resumesData.map(resumeData => 
        resumeQueue.add({
          ...resumeData,
          jobDescription,
          jobTitle
        })
      )
    );
    
    // Wait for all jobs to complete
    const jobResults = await Promise.all(
      jobs.map(job => job.finished())
    );
    
    results.push(...jobResults);
  } else {
    // Fallback: Manual concurrent processing without Bull queue
    logger.info(`Processing ${resumesData.length} resumes with direct concurrency`);
    
    const concurrency = parseInt(process.env.QUEUE_CONCURRENCY || '4');
    
    for (let i = 0; i < resumesData.length; i += concurrency) {
      const batch = resumesData.slice(i, i + concurrency);
      
      const batchResults = await Promise.allSettled(
        batch.map(resumeData => 
          processResumeJob({
            ...resumeData,
            jobDescription,
            jobTitle
          })
        )
      );
      
      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error(`Resume ${batch[idx].resumeFile} failed:`, result.reason);
          results.push({
            resumeFile: batch[idx].resumeFile,
            error: result.reason.message,
            matchScore: 0,
            classification: 'NOT_SUITABLE'
          });
        }
      });
    }
  }
  
  const processingTime = Date.now() - startTime;
  logger.info(`✅ Batch completed: ${results.length} resumes in ${processingTime}ms`);
  
  return {
    results,
    totalProcessed: resumesData.length,
    successful: results.filter(r => !r.error).length,
    failed: results.filter(r => r.error).length,
    processingTimeMs: processingTime
  };
};

/**
 * Get queue statistics
 */
const getQueueStats = async () => {
  if (!redisAvailable || !resumeQueue) {
    return {
      enabled: false,
      message: 'Queue not available'
    };
  }

  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      resumeQueue.getWaitingCount(),
      resumeQueue.getActiveCount(),
      resumeQueue.getCompletedCount(),
      resumeQueue.getFailedCount(),
      resumeQueue.getDelayedCount()
    ]);

    return {
      enabled: true,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  } catch (error) {
    logger.error('Error getting queue stats:', error.message);
    return { enabled: false, error: error.message };
  }
};

/**
 * Clean old completed jobs from queue
 */
const cleanQueue = async (grace = 24 * 60 * 60 * 1000) => {
  if (!redisAvailable || !resumeQueue) {
    return { message: 'Queue not available' };
  }

  try {
    const cleaned = await resumeQueue.clean(grace, 'completed');
    logger.info(`Cleaned ${cleaned.length} old jobs from queue`);
    return { cleaned: cleaned.length };
  } catch (error) {
    logger.error('Error cleaning queue:', error.message);
    throw error;
  }
};

/**
 * Close queue connection gracefully
 */
const closeQueue = async () => {
  if (resumeQueue) {
    await resumeQueue.close();
    logger.info('Queue closed successfully');
  }
};

module.exports = {
  initializeQueue,
  addResumeAnalysisJob,
  processBatchResumes,
  getQueueStats,
  cleanQueue,
  closeQueue,
  isQueueEnabled: () => redisAvailable
};
