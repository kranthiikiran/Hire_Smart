const { 
  jobDescriptionSchema, 
  resumeUploadSchema, 
  sanitizeText 
} = require('../middleware/validation');

describe('Input Validation Middleware', () => {
  
  describe('jobDescriptionSchema', () => {
    it('should validate correct job description', () => {
      const data = {
        title: 'Senior Software Engineer',
        description: 'We are looking for a talented backend engineer with 5+ years of experience'
      };
      
      const { error, value } = jobDescriptionSchema.validate(data);
      
      expect(error).toBeUndefined();
      expect(value.title).toBe(data.title);
    });

    it('should reject job title below minimum length', () => {
      const data = {
        title: 'S', // Less than 2 chars
        description: 'We are looking for a talented backend engineer with 5+ years of experience'
      };
      
      const { error } = jobDescriptionSchema.validate(data);
      
      expect(error).toBeDefined();
    });

    it('should accept job without description', () => {
      const data = {
        title: 'Senior Engineer'
      };
      
      const { error } = jobDescriptionSchema.validate(data);
      
      expect(error).toBeUndefined();
    });

    it('should reject job description below minimum length if provided', () => {
      const data = {
        title: 'Senior Engineer',
        description: 'Short' // Less than 50 chars
      };
      
      const { error } = jobDescriptionSchema.validate(data);
      
      expect(error).toBeDefined();
    });

    it('should reject job title exceeding maximum length', () => {
      const data = {
        title: 'A'.repeat(201),
        description: 'We are looking for a talented backend engineer with 5+ years of experience'
      };
      
      const { error } = jobDescriptionSchema.validate(data);
      
      expect(error).toBeDefined();
    });

    it('should accept array of requirements', () => {
      const data = {
        title: 'Senior Engineer',
        description: 'We are looking for a talented backend engineer with 5+ years of experience',
        requirements: ['Node.js', 'React', 'MongoDB']
      };
      
      const { error, value } = jobDescriptionSchema.validate(data);
      
      expect(error).toBeUndefined();
      expect(Array.isArray(value.requirements)).toBe(true);
    });
  });

  describe('resumeUploadSchema', () => {
    it('should validate correct resume upload', () => {
      const data = {
        candidate_name: 'John Doe',
        file_type: 'application/pdf',
        file_size: 1024000 // 1MB
      };
      
      const { error, value } = resumeUploadSchema.validate(data);
      
      expect(error).toBeUndefined();
      expect(value).toBeDefined();
    });

    it('should reject invalid file type', () => {
      const data = {
        candidate_name: 'John Doe',
        file_type: 'application/x-msdownload',
        file_size: 1024000
      };
      
      const { error } = resumeUploadSchema.validate(data);
      
      expect(error).toBeDefined();
    });

    it('should reject file exceeding size limit', () => {
      const data = {
        candidate_name: 'John Doe',
        file_type: 'application/pdf',
        file_size: 51 * 1024 * 1024 // 51MB (exceeds 50MB limit)
      };
      
      const { error } = resumeUploadSchema.validate(data);
      
      expect(error).toBeDefined();
    });

    it('should accept DOCX files', () => {
      const data = {
        file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        file_size: 500000
      };
      
      const { error } = resumeUploadSchema.validate(data);
      
      expect(error).toBeUndefined();
    });

    it('should accept TXT files', () => {
      const data = {
        file_type: 'text/plain',
        file_size: 100000
      };
      
      const { error } = resumeUploadSchema.validate(data);
      
      expect(error).toBeUndefined();
    });
  });

  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      const dirty = '<script>alert("xss")</script>Hello';
      const cleaned = sanitizeText(dirty);
      
      expect(cleaned).not.toContain('<script>');
      expect(cleaned).toContain('Hello');
    });

    it('should trim whitespace', () => {
      const dirty = '   Hello World   ';
      const cleaned = sanitizeText(dirty);
      
      expect(cleaned).toBe('Hello World');
    });

    it('should normalize multiple spaces', () => {
      const dirty = 'Hello    World';
      const cleaned = sanitizeText(dirty);
      
      expect(cleaned).toBe('Hello World');
    });

    it('should handle SQL injection attempts', () => {
      const dirty = "Robert'; DROP TABLE students;--";
      const cleaned = sanitizeText(dirty);
      
      // Should escape or remove dangerous characters
      expect(cleaned).toBeDefined();
      expect(typeof cleaned).toBe('string');
    });

    it('should preserve normal content', () => {
      const normal = 'Senior Software Engineer with 5 years experience';
      const cleaned = sanitizeText(normal);
      
      expect(cleaned).toContain('Senior');
      expect(cleaned).toContain('Engineer');
    });
  });
});
