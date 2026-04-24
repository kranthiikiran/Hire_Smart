const mongoose = require('mongoose');

const resumeResultSchema = new mongoose.Schema({
  resumeId: {
    type: String,
    required: true
  },
  candidateName: {
    type: String,
    required: true
  },
  email: {
    type: String
  },
  phone: {
    type: String
  },
  filename: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  matchScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  classification: {
    type: String,
    enum: ['SUITABLE', 'PARTIALLY_SUITABLE', 'NOT_SUITABLE'],
    required: true
  },
  skillMatch: {
    type: Number,
    min: 0,
    max: 100
  },
  experienceMatch: {
    type: Number,
    min: 0,
    max: 100
  },
  semanticMatch: {
    type: Number,
    min: 0,
    max: 100
  },
  skillsMatched: [{
    type: String
  }],
  skillsMissing: [{
    type: String
  }],
  additionalSkills: [{
    type: String
  }],
  yearsOfExperience: {
    type: Number
  },
  education: {
    type: String
  },
  summary: {
    type: String
  },
  rank: {
    type: Number
  }
}, { _id: false });

const analysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  jobTitle: {
    type: String,
    required: true,
    trim: true
  },
  jobDescription: {
    type: String,
    required: true
  },
  requiredSkills: [{
    type: String
  }],
  experienceLevel: {
    type: String,
    enum: ['Entry', 'Mid', 'Senior', 'Lead', 'Any'],
    default: 'Any'
  },
  resumes: [resumeResultSchema],
  totalProcessed: {
    type: Number,
    default: 0
  },
  suitableCount: {
    type: Number,
    default: 0
  },
  partiallyCount: {
    type: Number,
    default: 0
  },
  notSuitableCount: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  },
  processingTimeMs: {
    type: Number
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  errorMessage: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
analysisSchema.index({ userId: 1, createdAt: -1 });
analysisSchema.index({ status: 1 });

// Calculate statistics before saving
analysisSchema.pre('save', function(next) {
  if (this.resumes && this.resumes.length > 0) {
    this.totalProcessed = this.resumes.length;
    this.suitableCount = this.resumes.filter(r => r.classification === 'SUITABLE').length;
    this.partiallyCount = this.resumes.filter(r => r.classification === 'PARTIALLY_SUITABLE').length;
    this.notSuitableCount = this.resumes.filter(r => r.classification === 'NOT_SUITABLE').length;
    
    const totalScore = this.resumes.reduce((sum, r) => sum + r.matchScore, 0);
    this.averageScore = Math.round(totalScore / this.resumes.length);
  }
  next();
});

const Analysis = mongoose.model('Analysis', analysisSchema);

module.exports = Analysis;
