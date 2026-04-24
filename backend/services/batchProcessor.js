const Bull = require('bull');
const axios = require('axios');

// Create job queue
const analysisQueue = new Bull('resume-analysis', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

analysisQueue.on('active', (job) => {
  console.log(`[Job ${job.id}] Active`);
});

analysisQueue.on('completed', (job, result) => {
  console.log(`[Job ${job.id}] Completed`);
});

analysisQueue.on('failed', (job, error) => {
  console.log(`[Job ${job.id}] Failed:`, error.message);
});

// Process jobs with concurrency
analysisQueue.process(5, async (job) => {
  const { batchId, resumes, jobDescription, weights } = job.data;

  const progress = {
    processed: 0,
    total: resumes.length,
    success: 0,
    failed: 0
  };

  const results = [];

  try {
    for (let i = 0; i < resumes.length; i++) {
      const resume = resumes[i];

      try {
        // Get job description from cache or database
        const jobDescData = jobDescription;

        // Read resume file content (in real implementation, reads from storage)
        const resumeContent = resume.content || '';

        // Call analysis endpoint
        const analysis = await axios.post(
          `${process.env.NLP_SERVICE_URL || 'http://localhost:5000'}/analyze`,
          {
            resume_text: resumeContent,
            job_description: jobDescData.description,
            job_title: jobDescData.title,
            candidate_name: resume.candidate_name
          },
          { timeout: 30000 }
        );

        // Extract result
        const analysisResult = analysis.data;

        results.push({
          resume_id: resume.id,
          candidate_name: resume.candidate_name,
          match_score: analysisResult.score || 0,
          classification: analysisResult.classification || 'Error',
          analysis_data: analysisResult
        });

        progress.success++;
      } catch (error) {
        console.error(`Error processing resume ${i}:`, error.message);
        progress.failed++;

        results.push({
          resume_id: resume.id,
          candidate_name: resume.candidate_name,
          match_score: 0,
          classification: 'Error',
          error: error.message
        });
      }

      progress.processed++;
      job.progress(Math.round((progress.processed / progress.total) * 100));
    }

    // Sort results by match score (descending)
    results.sort((a, b) => b.match_score - a.match_score);

    // Add ranks and badges
    const rankedResults = results.map((r, idx) => ({
      ...r,
      rank: idx + 1,
      badge: ['🥇', '🥈', '🥉', '⭐'][Math.min(idx, 3)] || '✓'
    }));

    return {
      batchId,
      results: rankedResults,
      statistics: progress,
      summary: generateBatchSummary(rankedResults)
    };

  } catch (error) {
    throw new Error(`Batch processing failed: ${error.message}`);
  }
});

// Generate batch summary
function generateBatchSummary(results) {
  const scores = results.map(r => r.match_score).filter(s => s > 0);

  if (scores.length === 0) {
    return {
      avg_score: 0,
      distribution: { suitable: 0, partial: 0, unsuitable: 0 }
    };
  }

  return {
    avg_score: Math.round(scores.reduce((s, a) => s + a, 0) / scores.length * 10) / 10,
    median_score: scores.length > 0 ? scores[Math.floor(scores.length / 2)] : 0,
    distribution: {
      suitable: results.filter(r => r.classification === 'Suitable').length,
      partial: results.filter(r => r.classification === 'Partially Suitable').length,
      unsuitable: results.filter(r => r.classification === 'Not Suitable').length
    },
    total_processed: results.length
  };
}

// Enqueue batch job
async function enqueueBatchAnalysis(batchData) {
  try {
    const job = await analysisQueue.add(
      {
        batchId: batchData.batch_id,
        resumes: batchData.resumes,
        jobDescription: batchData.job_description,
        weights: batchData.weights || {}
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    );

    return job;
  } catch (error) {
    console.error('Failed to enqueue batch:', error);
    throw error;
  }
}

// Get job status
async function getBatchStatus(jobId) {
  try {
    const job = await analysisQueue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      id: job.id,
      state,
      progress,
      data: job.data
    };
  } catch (error) {
    console.error('Error getting job status:', error);
    throw error;
  }
}

module.exports = {
  analysisQueue,
  enqueueBatchAnalysis,
  getBatchStatus
};
