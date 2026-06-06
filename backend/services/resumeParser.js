const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');

class ResumeParser {
  /**
   * Extract text from resume file based on file type
   * @param {string} filePath - Path to the resume file
   * @returns {Promise<string>} Extracted text content
   */
  async extractText(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    try {
      // If file has extension, use it to determine parser
      if (ext) {
        switch (ext) {
          case '.pdf':
            return await this.extractFromPDF(filePath);
          case '.docx':
            return await this.extractFromDOCX(filePath);
          case '.txt':
            return await this.extractFromTXT(filePath);
          default:
            throw new Error(`Unsupported file type: ${ext}`);
        }
      }

      // If no extension, try to detect file type from content
      const dataBuffer = await fs.readFile(filePath);
      
      // Check for PDF signature
      if (dataBuffer.length >= 4 && dataBuffer.toString('latin1', 0, 4) === '%PDF') {
        return await this.extractFromPDF(filePath);
      }
      
      // Check for DOCX signature (ZIP file with PK header)
      if (dataBuffer.length >= 4 && dataBuffer[0] === 0x50 && dataBuffer[1] === 0x4B) {
        try {
          return await this.extractFromDOCX(filePath);
        } catch (docxError) {
          // If DOCX parsing fails, it might not be a valid DOCX file
          console.log('DOCX parsing failed, trying as text...');
        }
      }
      
      // Default to text file parsing
      return await this.extractFromTXT(filePath);
      
    } catch (error) {
      console.error(`Failed to extract text from file:`, error.message);
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF file with fallback
   */
  async extractFromPDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      if (dataBuffer.length === 0) {
        throw new Error('PDF file is empty');
      }
      const data = await pdfParse(dataBuffer);
      const text = this.cleanText(data.text);
      if (!text || text.length < 10) {
        throw new Error('PDF contains no readable text');
      }
      return text;
    } catch (error) {
      throw new Error(`PDF parsing error: ${error.message}`);
    }
  }

  /**
   * Extract text from DOCX file with fallback
   */
  async extractFromDOCX(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = this.cleanText(result.value);
      if (!text || text.length < 10) {
        throw new Error('DOCX contains no readable text');
      }
      return text;
    } catch (error) {
      throw new Error(`DOCX parsing error: ${error.message}`);
    }
  }

  /**
   * Extract text from TXT file with fallback
   */
  async extractFromTXT(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const text = this.cleanText(content);
      if (!text || text.length < 10) {
        throw new Error('TXT file is empty or too small');
      }
      return text;
    } catch (error) {
      throw new Error(`TXT parsing error: ${error.message}`);
    }
  }

  /**
   * Clean and normalize extracted text
   */
  cleanText(text) {
    return text
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')  // Remove excessive line breaks
      .replace(/\t/g, ' ')  // Replace tabs with spaces
      .replace(/[ ]{2,}/g, ' ')  // Remove multiple spaces
      .trim();
  }

  /**
   * Extract basic metadata from resume text
   */
  extractMetadata(text) {
    const metadata = {
      length: text.length,
      wordCount: text.split(/\s+/).length,
      hasEmail: /[\w.-]+@[\w.-]+\.\w+/.test(text),
      hasPhone: /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text),
      hasLinkedIn: /linkedin\.com/i.test(text),
      hasGitHub: /github\.com/i.test(text)
    };

    // Extract email
    const emailMatch = text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
    if (emailMatch) {
      metadata.email = emailMatch[0];
    }

    // Extract name (first few words before email or in first line)
    const lines = text.split('\n');
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine.length < 50 && firstLine.split(' ').length <= 4) {
        metadata.name = firstLine;
      }
    }

    return metadata;
  }

  /**
   * Process multiple resume files
   */
  async processMultiple(filePaths) {
    const results = [];

    for (const filePath of filePaths) {
      try {
        const text = await this.extractText(filePath);
        const metadata = this.extractMetadata(text);
        
        results.push({
          filePath,
          fileName: path.basename(filePath),
          text,
          metadata,
          success: true
        });
      } catch (error) {
        console.error(`Resume parsing error for ${path.basename(filePath)}:`, error.message);
        
        // Fallback: try to extract at least file metadata
        results.push({
          filePath,
          fileName: path.basename(filePath),
          error: error.message,
          success: false
        });
      }
    }

    return results;
  }
}

module.exports = new ResumeParser();
