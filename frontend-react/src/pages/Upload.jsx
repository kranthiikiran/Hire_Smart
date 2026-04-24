import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import {
  Upload as UploadIcon,
  FileText,
  X,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react'

const Upload = () => {
  const { user } = useAuth()
  const [jobDescription, setJobDescription] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [customJobTitle, setCustomJobTitle] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingStatus, setProcessingStatus] = useState('')
  const navigate = useNavigate()

  const normalizedRole = String(user?.role || '').trim().toLowerCase()
  const isRecruiterView = normalizedRole === 'employer' || normalizedRole === 'recruiter' || normalizedRole === 'admin'
  const maxResumeFiles = isRecruiterView ? 50 : 1

  // Top job titles in 2026 - Essential Roles
  const trendingJobs = [
    // Technology & Engineering (Top 15)
    'Software Engineer',
    'Full Stack Developer',
    'Frontend Developer',
    'Backend Developer',
    'AI/ML Engineer',
    'Data Scientist',
    'Data Engineer',
    'DevOps Engineer',
    'Cloud Engineer',
    'Cybersecurity Analyst',
    'Mobile Developer',
    'QA Engineer',
    'Systems Engineer',
    'Database Administrator',
    'Network Engineer',
    
    // Business & Management (Top 10)
    'Product Manager',
    'Project Manager',
    'Business Analyst',
    'Operations Manager',
    'HR Manager',
    'Financial Analyst',
    'Account Manager',
    'Sales Manager',
    'Marketing Manager',
    'Customer Success Manager',
    
    // Design & Creative (Top 5)
    'UX/UI Designer',
    'Product Designer',
    'Graphic Designer',
    'Content Writer',
    'Technical Writer',
    
    // Other
    'Other (Custom)'
  ]

  const handleJobTitleChange = (e) => {
    const value = e.target.value
    if (value === 'Other (Custom)') {
      setShowCustomInput(true)
      setJobTitle('')
    } else {
      setShowCustomInput(false)
      setJobTitle(value)
      setCustomJobTitle('')
    }
  }

  const getEffectiveJobTitle = () => {
    return showCustomInput ? customJobTitle : jobTitle
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: maxResumeFiles,
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        setError(
          isRecruiterView
            ? 'Please upload PDF, DOCX, or TXT files under 5MB each (maximum 50 files).'
            : 'Please upload only one PDF, DOCX, or TXT file under 5MB.'
        )
        return
      }
      if (acceptedFiles.length > 0) {
        if (isRecruiterView) {
          setResumes((prev) => {
            const existingKeys = new Set(prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`))
            const uniqueNewFiles = acceptedFiles.filter(
              (file) => !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`)
            )
            const combined = [...prev, ...uniqueNewFiles]
            if (combined.length > maxResumeFiles) {
              setError(`You can upload up to ${maxResumeFiles} resumes.`)
              return combined.slice(0, maxResumeFiles)
            }
            return combined
          })
        } else {
          setResumes([acceptedFiles[0]])
        }
        setError('')
        setSuccess('')
      }
    }
  })

  const removeResume = (index) => {
    setResumes(resumes.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setUploadProgress(0)
    setProcessingStatus('')

    // Validation
    const effectiveJobTitle = getEffectiveJobTitle()
    if (!effectiveJobTitle.trim()) {
      setError('Please select or enter a job title')
      return
    }

    if (resumes.length === 0) {
      setError('Please upload a resume')
      return
    }

    if (!isRecruiterView && resumes.length > 1) {
      setError('Candidates can upload only one resume at a time')
      return
    }

    setLoading(true)
    setProcessingStatus('Uploading resumes...')

    try {
      const formData = new FormData()
      formData.append('jobTitle', effectiveJobTitle)
      formData.append('jobDescription', jobDescription || '')

      let response
      resumes.forEach((resume) => {
        formData.append('resumes', resume)
      })

      response = await api.post('/api/analyze/batch', formData, {
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || 0
          if (total > 0) {
            const percent = Math.round((progressEvent.loaded * 100) / total)
            setUploadProgress(percent)
            if (percent >= 100) {
              setProcessingStatus('Analyzing resume and calculating score...')
            }
          }
        }
      })

      const processedResumes = Array.isArray(response.data?.resumes) ? response.data.resumes : []
      const topScore = processedResumes.length > 0 ? processedResumes[0].matchScore || 0 : 0

      const successMessage = isRecruiterView
        ? `Batch analysis completed successfully! Top score: ${topScore}%`
        : `Analysis completed successfully! Your score: ${topScore}%`

      setSuccess(successMessage)
      setProcessingStatus('Score generated successfully.')

      const resultId = response.data.analysisId || response.data.analysis_id || response.data.batch_id || response.data.batchId || response.data.id

      if (!resultId || String(resultId).trim().length === 0) {
        setError('Analysis completed but result ID was not returned. Please check History.')
        return
      }

      const prefetchedResults = {
        ...response.data,
        id: resultId,
        job_title: response.data.job_title || effectiveJobTitle,
        job_description: response.data.job_description ?? jobDescription ?? ''
      }

      // Navigate to results page after a short delay
      setTimeout(() => {
        navigate(`/results/${resultId}`, {
          state: {
            analysisMessage: successMessage,
            prefetchedResults
          }
        })
      }, 900)
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Analysis failed. Please try again.')
      setProcessingStatus('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="upload-page">
      <div className="upload-header">
        <h1 className="page-title">Resume Analysis</h1>
        <p className="page-subtitle">
          Select a job title and upload resumes for AI-powered screening
        </p>
      </div>

      <form onSubmit={handleSubmit} className="upload-form">
        {/* Job Details Section */}
        <div className="form-section">
          <h2 className="section-title">Job Details</h2>
          
          <div className="form-group">
            <label htmlFor="jobTitle">Job Title *</label>
            <select
              id="jobTitle"
              className="input select-dark"
              value={showCustomInput ? 'Other (Custom)' : jobTitle}
              onChange={handleJobTitleChange}
              disabled={loading}
            >
              <option value="">-- Select a job title --</option>
              {trendingJobs.map((job) => (
                <option key={job} value={job}>
                  {job}
                </option>
              ))}
            </select>
          </div>

          {showCustomInput && (
            <div className="form-group">
              <label htmlFor="customJobTitle">Custom Job Title *</label>
              <input
                type="text"
                id="customJobTitle"
                className="input input-dark"
                placeholder="e.g., Senior Software Engineer"
                value={customJobTitle}
                onChange={(e) => setCustomJobTitle(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="jobDescription">Job Description (Optional)</label>
            <textarea
              id="jobDescription"
              className="textarea"
              rows={8}
              placeholder="Paste the complete job description including required skills, experience, and qualifications..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              disabled={loading}
            />
            <span className="input-hint">
              {jobDescription.length} characters
            </span>
          </div>
        </div>

        {/* Resume Upload Section */}
        <div className="form-section">
          <h2 className="section-title">Upload Resumes</h2>
          
          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? 'active' : ''} ${loading ? 'disabled' : ''}`}
          >
            <input {...getInputProps()} disabled={loading} />
            <UploadIcon size={48} className="dropzone-icon" />
            <h3 className="dropzone-title">
              {isDragActive ? 'Drop file here...' : 'Drag & drop your resume'}
            </h3>
            <p className="dropzone-text">
              or <span className="dropzone-link">browse for a file</span>
            </p>
            <p className="dropzone-formats">
              Supports PDF, DOCX, TXT (Max 5MB){' '}
              {isRecruiterView ? '- Upload up to 50 files' : '- Upload one file only'}
            </p>
          </div>

          {/* Uploaded File */}
          {resumes.length > 0 && (
            <div className="files-list">
              <h3 className="files-title">
                {isRecruiterView ? `Uploaded Files (${resumes.length})` : 'Uploaded File'}
              </h3>
              {resumes.map((file, index) => (
                <div key={index} className="file-item">
                  <FileText size={20} className="file-icon" />
                  <div className="file-info">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">
                      {(file.size / 1024).toFixed(2)} KB
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeResume(index)}
                    className="file-remove"
                    disabled={loading}
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <CheckCircle size={18} />
            <span>{success}</span>
          </div>
        )}

        {loading && (
          <div className="alert" style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', color: 'rgba(219, 234, 254, 0.95)' }}>
            <Loader size={18} className="spinner-icon" />
            <span>{processingStatus || 'Processing...'}</span>
            <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{uploadProgress}%</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader size={20} className="spinner-icon" />
                {isRecruiterView ? 'Analyzing Resumes...' : 'Analyzing Resume...'}
              </>
            ) : (
              <>
                <UploadIcon size={20} />
                {isRecruiterView ? 'Analyze Resumes' : 'Analyze Resume'}
              </>
            )}
          </button>
        </div>
      </form>

      <style>{`
        .upload-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem 0;
        }

        .upload-header {
          margin-bottom: 2.5rem;
          text-align: center;
        }

        .page-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 0.75rem;
          letter-spacing: -0.025em;
          text-shadow: 0 0 20px rgba(255, 215, 100, 0.15);
        }

        .page-subtitle {
          color: rgba(255, 255, 255, 0.6);
          font-size: 1.125rem;
          line-height: 1.6;
          max-width: 600px;
          margin: 0 auto;
        }

        .upload-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .form-section {
          background: rgba(35, 35, 42, 0.85);
          backdrop-filter: blur(12px);
          border-radius: var(--radius-lg);
          padding: 2rem;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 215, 100, 0.15);
          transition: all var(--transition);
        }

        .form-section:hover {
          box-shadow: 0 12px 32px rgba(255, 215, 100, 0.08);
          border-color: rgba(255, 215, 100, 0.25);
        }

        .section-title {
          font-size: 1.375rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .section-title::before {
          content: '';
          width: 4px;
          height: 24px;
          background: linear-gradient(180deg, #ffd764, #ffeb99);
          border-radius: var(--radius-full);
          box-shadow: 0 0 10px rgba(255, 215, 100, 0.5);
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          color: rgba(255, 215, 100, 0.9);
          margin-bottom: 0.625rem;
          font-size: 0.9375rem;
        }

        .textarea {
          width: 100%;
          padding: 1rem;
          border: 1px solid rgba(255, 215, 100, 0.25);
          border-radius: var(--radius);
          font-size: 0.9375rem;
          font-family: inherit;
          transition: all var(--transition);
          resize: vertical;
          line-height: 1.6;
          background: rgba(25, 25, 30, 0.7);
          color: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
        }

        .textarea:hover {
          border-color: rgba(255, 215, 100, 0.3);
        }

        .textarea:focus {
          outline: none;
          border-color: rgba(255, 215, 100, 0.5);
          box-shadow: 0 0 0 3px rgba(255, 215, 100, 0.1);
          background: rgba(20, 20, 20, 0.7);
        }

        .input-hint {
          display: block;
          margin-top: 0.625rem;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 500;
        }

        .input-dark,
        .select-dark {
          background: rgba(25, 25, 30, 0.7);
          color: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(255, 215, 100, 0.25);
          backdrop-filter: blur(8px);
          cursor: pointer;
        }

        .select-dark {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffd764' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          padding-right: 2.5rem;
        }

        .input-dark:hover,
        .select-dark:hover {
          border-color: rgba(255, 215, 100, 0.35);
        }

        .input-dark:focus,
        .select-dark:focus {
          outline: none;
          border-color: rgba(255, 215, 100, 0.5);
          box-shadow: 0 0 0 3px rgba(255, 215, 100, 0.1);
          background: rgba(20, 20, 20, 0.7);
        }

        .input-dark::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .select-dark option {
          background: rgba(25, 25, 30, 0.98);
          color: rgba(255, 255, 255, 0.95);
          padding: 0.75rem 1rem;
          border-bottom: 1px solid rgba(255, 215, 100, 0.1);
        }

        .select-dark option:hover,
        .select-dark option:checked {
          background: rgba(255, 215, 100, 0.2);
          color: #ffd764;
        }

        .dropzone {
          border: 2px dashed rgba(255, 215, 100, 0.25);
          border-radius: var(--radius-lg);
          padding: 4rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all var(--transition);
          background: rgba(28, 28, 32, 0.6);
          backdrop-filter: blur(8px);
          position: relative;
          overflow: hidden;
        }

        .dropzone::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at center, rgba(255, 215, 100, 0.1), transparent);
          opacity: 0;
          transition: opacity var(--transition);
        }

        .dropzone:hover:not(.disabled) {
          border-color: rgba(255, 215, 100, 0.3);
          transform: scale(1.01);
          box-shadow: 0 8px 24px rgba(255, 215, 100, 0.08);
        }

        .dropzone:hover:not(.disabled)::before {
          opacity: 1;
        }

        .dropzone.active {
          border-color: rgba(255, 215, 100, 0.6);
          border-width: 2px;
          background: rgba(255, 215, 100, 0.1);
          transform: scale(1.02);
        }

        .dropzone.active::before {
          opacity: 1;
        }

        .dropzone.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .dropzone > * {
          position: relative;
          z-index: 1;
        }

        .dropzone-icon {
          color: #ffd764;
          margin-bottom: 1.5rem;
          animation: bounce 2s infinite;
          filter: drop-shadow(0 0 6px rgba(255, 215, 100, 0.2));
        }

        .dropzone-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 0.75rem;
        }

        .dropzone-text {
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 0.75rem;
          font-size: 1rem;
        }

        .dropzone-link {
          color: #ffd764;
          font-weight: 700;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .dropzone-formats {
          font-size: 0.875rem;
          color: rgba(255, 215, 100, 0.8);
          font-weight: 500;
          margin-top: 1rem;
          padding: 0.75rem;
          background: rgba(255, 215, 100, 0.1);
          border: 1px solid rgba(255, 215, 100, 0.2);
          border-radius: var(--radius);
          display: inline-block;
        }

        .files-list {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 215, 100, 0.15);
          animation: fadeIn 0.3s ease;
        }

        .files-title {
          font-size: 1.0625rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .files-title::after {
          content: '';
          height: 1px;
          flex: 1;
          background: linear-gradient(90deg, rgba(255, 215, 100, 0.3), transparent);
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: rgba(30, 30, 35, 0.7);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 215, 100, 0.15);
          border-radius: var(--radius-lg);
          margin-bottom: 0.75rem;
          transition: all var(--transition);
          animation: slideIn 0.3s ease;
        }

        .file-item:hover {
          background: rgba(30, 30, 30, 0.7);
          border-color: rgba(255, 215, 100, 0.25);
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(255, 215, 100, 0.1);
        }

        .file-icon {
          color: #ffd764;
          flex-shrink: 0;
        }

        .file-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .file-name {
          font-size: 0.9375rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
        }

        .file-size {
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 500;
        }

        .file-remove {
          padding: 0.625rem;
          background: rgba(30, 30, 30, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: var(--radius);
          cursor: pointer;
          color: rgba(255, 255, 255, 0.7);
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
        }

        .file-remove:hover:not(:disabled) {
          background: rgba(220, 38, 38, 0.9);
          border-color: rgba(220, 38, 38, 0.5);
          color: white;
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
        }

        .file-remove:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .form-actions {
          display: flex;
          justify-content: center;
          margin-top: 1rem;
        }

        .btn-large {
          padding: 1.125rem 2.5rem;
          font-size: 1.125rem;
          font-weight: 700;
          box-shadow: var(--shadow-md);
        }

        .btn-large.btn-primary {
          background: linear-gradient(135deg, #ffd764 0%, #ffb347 100%);
          color: #111827;
          border: 1px solid rgba(255, 215, 100, 0.55);
          text-shadow: none;
        }

        .btn-large.btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #ffdf7f 0%, #ffc060 100%);
          color: #111827;
        }

        .btn-large:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: var(--shadow-xl);
        }

        .spinner-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .upload-page {
            padding: 1.5rem 0;
          }

          .page-title {
            font-size: 2rem;
          }

          .form-section {
            padding: 1.5rem;
          }

          .dropzone {
            padding: 3rem 1.5rem;
          }

          .btn-large {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

export default Upload
