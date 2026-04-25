const Joi = require('joi');
const validator = require('validator');
const fs = require('fs');

// Sanitization helper
const sanitizeText = (text) => {
  if (typeof text !== 'string') return text;
  return validator.escape(text)
    .trim()
    .replace(/\s+/g, ' ');
};

// Job Description Schema
const jobDescriptionSchema = Joi.object({
  title: Joi.string()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Job title is required',
      'string.min': 'Job title must be at least 2 characters',
      'string.max': 'Job title cannot exceed 200 characters'
    }),

  description: Joi.string()
    .min(50)
    .max(50000)
    .optional()
    .allow('')
    .messages({
      'string.min': 'Description must be at least 50 characters if provided'
    }),

  requirements: Joi.array()
    .items(Joi.string().max(1000))
    .max(50)
    .optional()
});

// Resume Upload Schema
const resumeUploadSchema = Joi.object({
  candidate_name: Joi.string()
    .min(3)
    .max(100)
    .optional(),

  file_size: Joi.number()
    .max(50 * 1024 * 1024)
    .required(),

  file_type: Joi.string()
    .valid('application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain')
    .required()
});

// Validation Middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Sanitize string fields
    Object.keys(value).forEach(key => {
      if (typeof value[key] === 'string') {
        value[key] = sanitizeText(value[key]);
      }
    });

    req.validatedData = value;
    next();
  };
};

// File validation
const validateFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const file = req.file;
  const MAX_SIZE = 50 * 1024 * 1024;

  if (file.size > MAX_SIZE) {
    return res.status(400).json({
      error: 'File too large',
      max_size: MAX_SIZE
    });
  }

  const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return res.status(400).json({
      error: 'Invalid file type',
      allowed_types: ALLOWED_TYPES
    });
  }

  // Verify magic bytes
  const magicNumbers = {
    'application/pdf': Buffer.from([0x25, 0x50, 0x44, 0x46]),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      Buffer.from([0x50, 0x4B, 0x03, 0x04])
  };

  const expectedMagic = magicNumbers[file.mimetype];
  if (expectedMagic) {
    try {
      let fileMagic;

      if (file.buffer && Buffer.isBuffer(file.buffer)) {
        fileMagic = file.buffer.slice(0, expectedMagic.length);
      } else if (file.path) {
        const fd = fs.openSync(file.path, 'r');
        const headerBuffer = Buffer.alloc(expectedMagic.length);
        fs.readSync(fd, headerBuffer, 0, expectedMagic.length, 0);
        fs.closeSync(fd);
        fileMagic = headerBuffer;
      }

      if (!fileMagic || !fileMagic.equals(expectedMagic)) {
        return res.status(400).json({
          error: 'File signature does not match MIME type'
        });
      }
    } catch (error) {
      return res.status(400).json({
        error: 'Unable to validate uploaded file signature'
      });
    }
  }

  next();
};

// Middleware to validate job description in request body
const validateJobDescription = (req, res, next) => {
  const { jobTitle, jobDescription } = req.body;

  if (!jobTitle || typeof jobTitle !== 'string' || jobTitle.trim().length < 2) {
    return res.status(400).json({
      error: 'Job title is required and must be at least 2 characters'
    });
  }

  if (jobDescription && typeof jobDescription === 'string' && jobDescription.trim().length > 0 && jobDescription.trim().length < 50) {
    return res.status(400).json({
      error: 'Job description must be at least 10 characters if provided'
    });
  }

  next();
};

module.exports = {
  validateRequest,
  validateFile,
  validateJobDescription,
  sanitizeText,
  jobDescriptionSchema,
  resumeUploadSchema
};
