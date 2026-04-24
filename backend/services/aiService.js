const axios = require('axios');

class AIService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.openaiApiUrl = 'https://api.openai.com/v1/chat/completions';
    this.openaiEmbeddingsUrl = 'https://api.openai.com/v1/embeddings';
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  }

  isConfigured() {
    return Boolean(this.openaiApiKey && this.openaiApiKey.startsWith('sk-'));
  }

  clamp(value, min = 0, max = 100) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return min;
    return Math.max(min, Math.min(max, Math.round(parsed)));
  }

  normalizeClassification(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('suitable') && !normalized.includes('partial') && !normalized.includes('not')) {
      return 'suitable';
    }
    if (normalized.includes('partial')) {
      return 'partial';
    }
    if (normalized.includes('not')) {
      return 'not-suitable';
    }
    return 'partial';
  }

  buildPrompt(resumeText, jobDescription, jobTitle) {
    const effectiveJobDescription = (jobDescription || '').trim().length > 0
      ? jobDescription
      : `Role: ${jobTitle || 'General position'}`;

    return `You are an expert resume screening system. Analyze the resume against the job context and return strict JSON only.

JOB TITLE:\n${jobTitle || 'N/A'}\n\nJOB DESCRIPTION:\n${effectiveJobDescription.slice(0, 3500)}\n\nRESUME:\n${(resumeText || '').slice(0, 4500)}\n
Return valid JSON object with this exact shape and types:
{
  "relevanceScore": number,          // 0-100 integer
  "skillMatch": number,              // 0-100 integer
  "experienceRelevance": number,     // 0-100 integer
  "classification": string,          // suitable | partial | not-suitable
  "skillsMatched": string[],
  "skillsMissing": string[],
  "requiredSkills": string[],
  "candidateProfile": {
    "skills": string[],
    "tools": string[],
    "experienceLevel": string,       // Entry | Mid | Senior | Lead
    "yearsOfExperience": number,
    "qualifications": string[]
  },
  "strengths": string[],
  "weaknesses": string[],
  "education": number,               // 0-100 integer
  "reasoning": string,
  "summary": string                  // concise 2-4 sentence analytical summary
}

Scoring rules:
- Favor objective alignment to required skills and responsibilities.
- Penalize missing critical skills.
- Keep scores realistic and avoid score inflation.
- Classification rules: >=75 suitable, 55-74 partial, <55 not-suitable.`;
  }

  cosineSimilarity(vecA, vecB) {
    if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length || vecA.length === 0) {
      return 0;
    }

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i += 1) {
      const a = Number(vecA[i]) || 0;
      const b = Number(vecB[i]) || 0;
      dot += a * b;
      normA += a * a;
      normB += b * b;
    }

    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async calculateEmbeddingSemanticScore(resumeText, jobDescription, jobTitle) {
    const effectiveJobDescription = (jobDescription || '').trim().length > 0
      ? jobDescription
      : `Role: ${jobTitle || 'General position'}`;

    const response = await axios.post(
      this.openaiEmbeddingsUrl,
      {
        model: this.embeddingModel,
        input: [effectiveJobDescription.slice(0, 6000), String(resumeText || '').slice(0, 6000)]
      },
      {
        headers: {
          Authorization: `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 45000
      }
    );

    const jdEmbedding = response?.data?.data?.[0]?.embedding || [];
    const resumeEmbedding = response?.data?.data?.[1]?.embedding || [];
    const similarity = this.cosineSimilarity(jdEmbedding, resumeEmbedding);
    return this.clamp(similarity * 100);
  }

  parseResponse(content) {
    const raw = String(content || '').trim();
    const cleaned = raw.startsWith('```')
      ? raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
      : raw;
    return JSON.parse(cleaned);
  }

  async analyzeWithOpenAI(resumeText, jobDescription, jobTitle) {
    const response = await axios.post(
      this.openaiApiUrl,
      {
        model: this.model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are a strict JSON resume scorer. Return only valid JSON.'
          },
          {
            role: 'user',
            content: this.buildPrompt(resumeText, jobDescription, jobTitle)
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 45000
      }
    );

    const content = response?.data?.choices?.[0]?.message?.content || '{}';
    const parsed = this.parseResponse(content);

    const semanticSimilarity = await this.calculateEmbeddingSemanticScore(resumeText, jobDescription, jobTitle);

    const relevanceScore = this.clamp(parsed.relevanceScore ?? parsed.matchScore);
    const skillMatch = this.clamp(parsed.skillMatch);
    const experienceRelevance = this.clamp(parsed.experienceRelevance);
    const matchScore = this.clamp((relevanceScore * 0.7) + (semanticSimilarity * 0.3));

    const candidateProfile = parsed.candidateProfile && typeof parsed.candidateProfile === 'object'
      ? parsed.candidateProfile
      : {};

    return {
      matchScore,
      skillMatch,
      experienceRelevance,
      semanticSimilarity,
      education: this.clamp(parsed.education),
      skillsMatched: Array.isArray(parsed.skillsMatched) ? parsed.skillsMatched : [],
      skillsMissing: Array.isArray(parsed.skillsMissing) ? parsed.skillsMissing : [],
      requiredSkills: Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills : [],
      candidateProfile: {
        skills: Array.isArray(candidateProfile.skills) ? candidateProfile.skills : [],
        tools: Array.isArray(candidateProfile.tools) ? candidateProfile.tools : [],
        experienceLevel: String(candidateProfile.experienceLevel || ''),
        yearsOfExperience: Number(candidateProfile.yearsOfExperience || 0),
        qualifications: Array.isArray(candidateProfile.qualifications) ? candidateProfile.qualifications : []
      },
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      reasoning: String(parsed.reasoning || ''),
      classification: this.normalizeClassification(parsed.classification),
      summary: String(parsed.summary || 'OpenAI analysis completed.'),
      scoringEngine: 'openai_gpt'
    };
  }

  async analyzeResume(resumeText, jobDescription, jobTitle) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI is not configured. Set OPENAI_API_KEY to run analysis.');
    }

    return this.analyzeWithOpenAI(resumeText, jobDescription, jobTitle);
  }
}

module.exports = new AIService();
