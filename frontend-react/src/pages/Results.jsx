import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import api from '../utils/api'
import {
  ArrowLeft,
  Trophy,
  CheckCircle,
  XCircle,
  TrendingUp,
  Briefcase,
  Download,
  Star,
  User,
  Users
} from 'lucide-react'

const Results = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [analysisMessage, setAnalysisMessage] = useState(location.state?.analysisMessage || '')
  const prefetchedResults = location.state?.prefetchedResults

  const normalizeClassification = (value) => {
    const normalized = String(value || '').trim().toLowerCase()
    if (normalized === 'suitable') return 'suitable'
    if (normalized === 'partial' || normalized === 'partially suitable' || normalized === 'partially_suitable' || normalized === 'partially-suitable') return 'partial'
    if (normalized === 'not suitable' || normalized === 'not_suitable' || normalized === 'not-suitable') return 'not-suitable'
    return 'partial'
  }

  const normalizeResultsData = (input, fallbackId) => {
    let data = { ...(input || {}) }

    if (Array.isArray(data.resumes) && (!Array.isArray(data.candidates) || data.candidates.length === 0)) {
      data = {
        id: data.analysisId || data.analysis_id || data.id || fallbackId,
        jobTitle: data.jobTitle || data.job_title,
        jobDescription: data.jobDescription || data.job_description,
        candidates: data.resumes.map((resume, index) => ({
          id: resume.resumeId || `${fallbackId}-${index}`,
          name: resume.candidateName || `Candidate ${index + 1}`,
          email: resume.email,
          matchScore: resume.matchScore || 0,
          classification: normalizeClassification(resume.classification),
          skillsMatched: resume.skillsMatched || [],
          skillsMissing: resume.skillsMissing || [],
          skillMatch: resume.skillMatch || 0,
          experienceMatch: resume.experienceMatch || 0,
          semanticMatch: resume.semanticMatch || 0,
          summary: resume.summary || ''
        }))
      }
    } else if (data.analysis && (!Array.isArray(data.candidates) || data.candidates.length === 0)) {
      const analysis = data.analysis
      data = {
        id: analysis.id || analysis._id || fallbackId,
        jobTitle: analysis.jobTitle,
        jobDescription: analysis.jobDescription,
        candidates: (analysis.resumes || []).map((resume, index) => ({
          id: resume.resumeId || `${analysis.id || fallbackId}-${index}`,
          name: resume.candidateName || `Candidate ${index + 1}`,
          email: resume.email,
          matchScore: resume.matchScore || 0,
          classification: normalizeClassification(resume.classification),
          skillsMatched: resume.skillsMatched || [],
          skillsMissing: resume.skillsMissing || [],
          skillMatch: resume.skillMatch || 0,
          experienceMatch: resume.experienceMatch || 0,
          semanticMatch: resume.semanticMatch || 0,
          summary: resume.summary || ''
        })),
        createdAt: analysis.createdAt
      }
    } else if (data.result && (!Array.isArray(data.candidates) || data.candidates.length === 0)) {
      data = {
        id: data.id || fallbackId,
        jobTitle: data.jobTitle || data.job_title,
        jobDescription: data.jobDescription || data.job_description,
        candidates: [{
          id: data.id || fallbackId,
          name: data.result.candidate_name || 'Candidate',
          matchScore: data.score || data.result.score,
          classification: normalizeClassification(data.classification || data.result.classification),
          skillsMatched: data.result.matched_skills || [],
          skillsMissing: data.result.missing_skills || [],
          experienceRelevance: data.result.experience_match,
          summary: data.result.summary || data.result.explanation
        }],
        requiredSkills: data.result.required_skills || [],
        createdAt: data.timestamp
      }
    } else if (data.analysis_id && data.score !== undefined && !Array.isArray(data.candidates)) {
      data = {
        id: data.analysis_id || fallbackId,
        jobTitle: data.jobTitle || data.job_title,
        jobDescription: data.jobDescription || data.job_description,
        candidates: [{
          id: data.analysis_id || fallbackId,
          name: data.candidate_name || 'Candidate',
          matchScore: data.score || 0,
          classification: normalizeClassification(data.classification),
          skillsMatched: data.matched_skills || [],
          skillsMissing: data.missing_skills || [],
          experienceRelevance: data.experience_match,
          semanticSimilarity: data.semantic_similarity || 0,
          summary: data.summary || data.explanation
        }],
        requiredSkills: data.required_skills || [],
        createdAt: data.timestamp
      }
    } else if (data.job_title) {
      data.jobTitle = data.jobTitle || data.job_title
      data.jobDescription = data.jobDescription || data.job_description
    }

    if (!Array.isArray(data.candidates)) {
      data.candidates = []
    }

    return data
  }

  useEffect(() => {
    if (!analysisMessage) return
    const timer = setTimeout(() => setAnalysisMessage(''), 5000)
    return () => clearTimeout(timer)
  }, [analysisMessage])

  useEffect(() => {
    if (!id || id === 'undefined' || id === 'null') {
      setError('Invalid analysis ID. Please run analysis again or open from History.')
      setLoading(false)
      return
    }

    if (prefetchedResults) {
      const normalizedPrefetched = normalizeResultsData(prefetchedResults, id)
      setResults(normalizedPrefetched)
      setLoading(false)
      fetchResults({ silentOnError: true })
      return
    }

    fetchResults()
  }, [id])

  const fetchResults = async ({ silentOnError = false } = {}) => {
    try {
      const response = await api.get(`/api/analyze/results/${id}`)
      const data = normalizeResultsData(response.data, id)
      
      setResults(data)
      setError('')
    } catch (err) {
      const status = err.response?.status

      if (silentOnError) {
        return
      }

      if (status === 404) {
        try {
          const historyResponse = await api.get('/api/analyze/history?limit=1')
          const latest = Array.isArray(historyResponse.data?.analyses) ? historyResponse.data.analyses[0] : null

          if (latest?.id && latest.id !== id) {
            navigate(`/results/${latest.id}`, {
              replace: true,
              state: {
                analysisMessage: 'Requested result was unavailable. Showing your latest available result.'
              }
            })
            return
          }
        } catch (_) {
        }

        setError('Results not found for this analysis')
      } else if (status === 403) {
        setError('You do not have access to these results')
      } else if (!err.response) {
        setError('Unable to reach server. Please ensure backend is running.')
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load results')
      }
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 75) return '#10b981'
    if (score >= 50) return '#f59e0b'
    return '#ef4444'
  }

  const getClassificationBadge = (classification) => {
    const badges = {
      suitable: { label: 'Suitable', color: '#10b981', icon: CheckCircle },
      partial: { label: 'Partially Suitable', color: '#f59e0b', icon: TrendingUp },
      'not-suitable': { label: 'Not Suitable', color: '#ef4444', icon: XCircle }
    }
    return badges[classification] || badges.partial
  }

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const exportResults = () => {
    const dataStr = JSON.stringify(results, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `hiresmart-results-${id}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const candidates = Array.isArray(results?.candidates) ? results.candidates : []
  const suitableCandidates = candidates.filter((candidate) => candidate.classification === 'suitable').length
  const partialCandidates = candidates.filter((candidate) => candidate.classification === 'partial').length
  const averageScore = candidates.length > 0
    ? Math.round(candidates.reduce((total, candidate) => total + Number(candidate.matchScore || 0), 0) / candidates.length)
    : 0
  const topCandidate = candidates[0] || null

  if (loading) {
    return (
      <div className="results-loading">
        <div className="spinner"></div>
        <p>Analyzing resumes...</p>
      </div>
    )
  }

  if (error || !results) {
    return (
      <div className="results-error">
        <XCircle size={48} />
        <h2>{error || 'Results not found'}</h2>
        <button onClick={() => navigate('/history')} className="btn btn-primary mt-4">
          View History
        </button>
      </div>
    )
  }

  return (
    <div className="results-page">
      {analysisMessage && (
        <div className="analysis-success-banner" role="status" aria-live="polite">
          <CheckCircle size={18} />
          <span>{analysisMessage}</span>
        </div>
      )}

      <div className="results-header">
        <button onClick={() => navigate(-1)} className="btn-back">
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="results-info">
          <h1 className="results-title">{results.jobTitle}</h1>
          <p className="results-subtitle">
            {results.candidates?.length || 0} candidates analyzed
          </p>
        </div>
        <button onClick={exportResults} className="btn btn-secondary">
          <Download size={18} />
          Export
        </button>
      </div>

      {/* Results Overview */}
      {candidates.length > 0 && (
        <div className="section-card">
          <div className="section-header">
            <Users size={24} />
            <h2 className="section-title">Results Overview</h2>
          </div>
          <div className="results-overview-grid">
            <div className="overview-card">
              <span className="overview-label">Candidates Analyzed</span>
              <strong className="overview-value">{candidates.length}</strong>
            </div>
            <div className="overview-card">
              <span className="overview-label">Average Match Score</span>
              <strong className="overview-value">{averageScore}%</strong>
            </div>
            <div className="overview-card">
              <span className="overview-label">Suitable Matches</span>
              <strong className="overview-value">{suitableCandidates}</strong>
            </div>
            <div className="overview-card">
              <span className="overview-label">Partial Matches</span>
              <strong className="overview-value">{partialCandidates}</strong>
            </div>
          </div>
          {topCandidate && (
            <div className="top-candidate-banner">
              <span className="top-candidate-label">Top Candidate</span>
              <strong>{topCandidate.name || 'Candidate 1'}</strong>
              <span className="top-candidate-score" style={{ color: getScoreColor(topCandidate.matchScore || 0) }}>
                {Math.round(topCandidate.matchScore || 0)}%
              </span>
            </div>
          )}
          <p className="results-overview-note">
            Detailed results appear once below in ranked order.
          </p>
        </div>
      )}

      {/* Job Description Summary */}
      <div className="section-card">
        <div className="section-header">
          <Briefcase size={24} />
          <h2 className="section-title">Job Description</h2>
        </div>
        {results.jobDescription ? (
          <p className="job-description">{results.jobDescription}</p>
        ) : (
          <p className="job-description" style={{ color: 'rgba(226, 232, 240, 0.82)', fontStyle: 'italic' }}>
            No job description provided. Analysis performed based on job title.
          </p>
        )}
        {results.requiredSkills && results.requiredSkills.length > 0 && (
          <div className="skills-required">
            <h3>Required Skills:</h3>
            <div className="skills-list">
              {results.requiredSkills.map((skill, index) => (
                <span key={index} className="skill-tag required">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Candidates Ranking */}
      <div className="section-card">
        <div className="section-header">
          <Trophy size={24} />
          <h2 className="section-title">Candidate Rankings</h2>
        </div>

        <div className="candidates-list">
          {candidates.map((candidate, index) => {
            const badge = getClassificationBadge(candidate.classification)
            const Icon = badge.icon
            const experienceScore = candidate.experienceMatch ?? candidate.experienceRelevance ?? 0
            const semanticScore = candidate.semanticMatch ?? candidate.semanticSimilarity ?? 0
            const missingSkills = Array.isArray(candidate.skillsMissing) ? candidate.skillsMissing : []
            const notSelected = candidate.classification === 'partial' || candidate.classification === 'not-suitable'

            return (
              <div key={candidate.id} id={`candidate-${candidate.id}`} className="candidate-card">
                <div className="candidate-rank">
                  <span className="rank-badge">{getRankIcon(index + 1)}</span>
                </div>

                <div className="candidate-content">
                  <div className="candidate-header">
                    <div className="candidate-info-section">
                      <User size={24} className="candidate-user-icon" />
                      <div>
                        <h3 className="candidate-name">
                          {candidate.name || `Candidate ${index + 1}`}
                        </h3>
                        {candidate.email && (
                          <p className="candidate-email">{candidate.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="candidate-score-section">
                      <div
                        className="score-circle"
                        style={{ background: getScoreColor(candidate.matchScore || 0) }}
                      >
                        {candidate.matchScore !== undefined && candidate.matchScore !== null 
                          ? Math.round(candidate.matchScore) 
                          : 0}%
                      </div>
                      <div
                        className="classification-badge"
                        style={{ color: badge.color }}
                      >
                        <Icon size={16} />
                        {badge.label}
                      </div>
                    </div>
                  </div>

                  <div className="candidate-details">
                    {/* Score Breakdown */}
                    <div className="score-breakdown">
                      <div className="score-item">
                        <span className="score-label">Skills Match</span>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${candidate.skillMatch || 0}%`,
                              background: getScoreColor(candidate.skillMatch || 0)
                            }}
                          ></div>
                        </div>
                        <span className="score-value">{candidate.skillMatch || 0}%</span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">Experience</span>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${experienceScore}%`,
                              background: getScoreColor(experienceScore)
                            }}
                          ></div>
                        </div>
                        <span className="score-value">{experienceScore}%</span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">Semantic Match</span>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${semanticScore}%`,
                              background: getScoreColor(semanticScore)
                            }}
                          ></div>
                        </div>
                        <span className="score-value">{semanticScore}%</span>
                      </div>
                    </div>

                    {/* Skills Comparison */}
                    <div className="skills-comparison">
                      {candidate.skillsMatched && candidate.skillsMatched.length > 0 && (
                        <div className="skills-section">
                          <h4 className="skills-heading matched">
                            <CheckCircle size={16} />
                            Matched Skills ({candidate.skillsMatched.length})
                          </h4>
                          <div className="skills-list">
                            {candidate.skillsMatched.map((skill, i) => (
                              <span key={i} className="skill-tag matched">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {candidate.skillsMissing && candidate.skillsMissing.length > 0 && (
                        <div className="skills-section">
                          <h4 className="skills-heading missing">
                            <XCircle size={16} />
                            Missing Skills ({candidate.skillsMissing.length})
                          </h4>
                          <div className="skills-list">
                            {candidate.skillsMissing.map((skill, i) => (
                              <span key={i} className="skill-tag missing">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {notSelected && (
                      <div className="not-selected-reason">
                        <h4 className="reason-heading">
                          <XCircle size={16} />
                          Not Selected Reason
                        </h4>
                        {missingSkills.length > 0 ? (
                          <p className="reason-text">
                            Missing key skills for this role: {missingSkills.join(', ')}.
                          </p>
                        ) : (
                          <p className="reason-text">
                            Candidate did not meet the required match threshold for this role.
                          </p>
                        )}
                      </div>
                    )}

                    {/* AI Summary */}
                    {candidate.summary && (
                      <div className="candidate-summary">
                        <h4 className="summary-heading">
                          <Star size={16} />
                          AI Analysis
                        </h4>
                        <p className="summary-text">{candidate.summary}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        .results-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1.5rem 1rem;
          position: relative;
        }

        @keyframes highlight-pulse {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          }
          50% { 
            transform: scale(1.02);
            box-shadow: 0 15px 40px rgba(255, 215, 100, 0.4);
          }
        }

        .results-overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .overview-card {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem 1.125rem;
          border-radius: 12px;
          background: rgba(20, 20, 24, 0.82);
          border: 1px solid rgba(255, 215, 100, 0.16);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.24);
        }

        .overview-label {
          font-size: 0.8125rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.62);
        }

        .overview-value {
          font-size: 1.75rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.97);
        }

        .top-candidate-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-top: 1.25rem;
          padding: 1rem 1.125rem;
          border-radius: 12px;
          background: rgba(255, 215, 100, 0.08);
          border: 1px solid rgba(255, 215, 100, 0.18);
          color: rgba(255, 255, 255, 0.94);
        }

        .top-candidate-label {
          font-size: 0.8125rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: rgba(255, 215, 100, 0.88);
        }

        .top-candidate-score {
          font-size: 1rem;
          font-weight: 800;
        }

        .results-overview-note {
          margin-top: 1rem;
          color: rgba(255, 255, 255, 0.65);
          font-size: 0.9375rem;
        }

        .analysis-success-banner {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-bottom: 1.25rem;
          padding: 0.875rem 1rem;
          border-radius: var(--radius);
          border: 1px solid rgba(34, 197, 94, 0.35);
          background: rgba(34, 197, 94, 0.12);
          color: rgba(220, 252, 231, 0.98);
          box-shadow: 0 4px 14px rgba(34, 197, 94, 0.12);
          font-weight: 600;
        }

        .results-loading,
        .results-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 1.25rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .results-loading p {
          font-size: 1.125rem;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 600;
        }

        .results-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 2.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(255, 215, 100, 0.15);
        }

        .btn-back {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: rgba(25, 25, 25, 0.8);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 215, 100, 0.2);
          border-radius: var(--radius);
          cursor: pointer;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 600;
          transition: all var(--transition);
          font-size: 0.9375rem;
        }

        .btn-back:hover {
          background: rgba(255, 215, 100, 0.1);
          border-color: rgba(255, 215, 100, 0.25);
          color: #ffd764;
          transform: translateX(-4px);
          box-shadow: 0 4px 12px rgba(255, 215, 100, 0.1);
        }

        .results-info {
          flex: 1;
        }

        .results-title {
          font-size: 2.25rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 0.5rem;
          letter-spacing: -0.025em;
          text-shadow: 0 0 20px rgba(255, 215, 100, 0.15);
        }

        .results-subtitle {
          color: rgba(255, 255, 255, 0.78);
          font-size: 1.0625rem;
          font-weight: 500;
        }

        .section-card {
          background: rgba(18, 18, 18, 0.85);
          backdrop-filter: blur(10px);
          border-radius: var(--radius-lg);
          padding: 1.75rem;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 215, 100, 0.15);
          margin-bottom: 1.75rem;
          animation: fadeIn 0.3s ease;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .section-header svg {
          color: #ffd764;
          flex-shrink: 0;
          filter: drop-shadow(0 0 6px rgba(255, 215, 100, 0.2));
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
        }

        .job-description {
          color: rgba(255, 255, 255, 0.88);
          line-height: 1.7;
          margin-bottom: 1.5rem;
          font-size: 1rem;
        }

        .skills-required h3 {
          font-size: 1.0625rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 1rem;
        }

        .skills-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.625rem;
        }

        .skill-tag {
          padding: 0.5rem 1rem;
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          font-weight: 700;
          transition: all var(--transition-fast);
          animation: scaleIn 0.2s ease;
        }

        .skill-tag:hover {
          transform: scale(1.05);
        }

        .skill-tag.required {
          background: rgba(255, 215, 100, 0.15);
          color: #ffd764;
          border: 1px solid rgba(255, 215, 100, 0.3);
        }

        .skill-tag.matched {
          background: rgba(34, 197, 94, 0.2);
          color: #4ade80;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .skill-tag.missing {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .candidates-list {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        .candidate-card {
          display: flex;
          gap: 1.25rem;
          padding: 1.75rem;
          border: 1px solid rgba(255, 215, 100, 0.15);
          border-radius: var(--radius-lg);
          transition: all 0.25s ease;
          background: rgba(18, 18, 18, 0.7);
          backdrop-filter: blur(8px);
          position: relative;
          overflow: hidden;
          animation: slideIn 0.3s ease;
        }

        .candidate-card::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(180deg, #ffd764, #ffeb99);
          transform: scaleY(0);
          transition: transform var(--transition);
          box-shadow: 0 0 8px rgba(255, 215, 100, 0.25);
        }

        .candidate-card:hover {
          border-color: rgba(255, 215, 100, 0.25);
          box-shadow: 0 8px 24px rgba(255, 215, 100, 0.08);
          transform: translateX(4px);
          background: rgba(20, 20, 20, 0.8);
        }

        .candidate-card:hover::before {
          transform: scaleY(1);
        }

        .candidate-rank {
          display: flex;
          align-items: flex-start;
          flex-shrink: 0;
        }

        .rank-badge {
          font-size: 2.5rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 70px;
          height: 70px;
          background: rgba(255, 215, 100, 0.15);
          border: 1px solid rgba(255, 215, 100, 0.25);
          border-radius: var(--radius-lg);
          box-shadow: 0 4px 12px rgba(255, 215, 100, 0.1);
          color: #ffd764;
        }

        .candidate-content {
          flex: 1;
          min-width: 0;
        }

        .candidate-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.75rem;
          gap: 1.5rem;
        }

        .candidate-info-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .candidate-user-icon {
          width: 48px;
          height: 48px;
          padding: 10px;
          background: linear-gradient(135deg, rgba(255, 215, 100, 0.2), rgba(255, 215, 100, 0.05));
          border: 2px solid rgba(255, 215, 100, 0.3);
          border-radius: 50%;
          color: rgba(255, 215, 100, 0.9);
          flex-shrink: 0;
        }

        .candidate-name {
          font-size: 1.75rem;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.98);
          margin-bottom: 0.375rem;
          letter-spacing: -0.025em;
          line-height: 1.2;
        }

        .candidate-email {
          font-size: 0.9375rem;
          color: rgba(255, 215, 100, 0.7);
          font-weight: 500;
        }

        .candidate-score-section {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .score-circle {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          font-weight: 800;
          color: white;
          box-shadow: var(--shadow-lg);
          position: relative;
        }

        .score-circle::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: inherit;
          opacity: 0.2;
          z-index: -1;
        }

        .classification-badge {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.9375rem;
          font-weight: 700;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-full);
          background: rgba(255, 215, 100, 0.1);
          border: 1px solid rgba(255, 215, 100, 0.2);
          color: rgba(255, 255, 255, 0.9);
        }

        .candidate-details {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        .score-breakdown {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 1.5rem;
          background: rgba(25, 25, 30, 0.6);
          border: 1px solid rgba(255, 215, 100, 0.15);
          border-radius: var(--radius-lg);
        }

        .score-item {
          display: grid;
          grid-template-columns: 140px 1fr 70px;
          align-items: center;
          gap: 1.25rem;
        }

        .score-label {
          font-size: 0.9375rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }

        .progress-bar {
          height: 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-full);
          overflow: hidden;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .progress-fill {
          height: 100%;
          transition: width 0.6s ease;
          border-radius: var(--radius-full);
          position: relative;
          background: linear-gradient(90deg, currentColor, currentColor);
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          animation: shimmer 1.5s infinite;
        }

        .score-value {
          text-align: right;
          font-size: 1.0625rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.95);
        }

        .skills-comparison {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: 1.5rem;
          background: rgba(25, 25, 30, 0.6);
          border: 1px solid rgba(255, 215, 100, 0.2);
          border-radius: var(--radius-lg);
        }

        .skills-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .skills-heading {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          font-size: 0.9375rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .skills-heading.matched {
          color: #4ade80;
        }

        .skills-heading.missing {
          color: #f87171;
        }

        .not-selected-reason {
          padding: 1rem;
          background: rgba(239, 68, 68, 0.1);
          border-left: 4px solid rgba(239, 68, 68, 0.85);
          border-radius: var(--radius-lg);
        }

        .reason-heading {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          font-size: 0.95rem;
          font-weight: 700;
          color: rgba(254, 202, 202, 0.96);
          margin-bottom: 0.625rem;
        }

        .reason-text {
          margin: 0;
          color: rgba(254, 226, 226, 0.94);
          line-height: 1.6;
          font-size: 0.9375rem;
        }

        .candidate-summary {
          padding: 1.5rem;
          background: rgba(255, 215, 100, 0.1);
          border-left: 4px solid #ffd764;
          border-radius: var(--radius-lg);
          box-shadow: 0 4px 12px rgba(255, 215, 100, 0.15);
        }

        .summary-heading {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          font-size: 1rem;
          font-weight: 700;
          color: #ffd764;
          margin-bottom: 0.75rem;
        }

        .summary-text {
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.7;
          font-size: 0.9375rem;
        }

        @media (max-width: 768px) {
          .results-page {
            padding: 1rem;
          }

          .results-title {
            font-size: 1.875rem;
          }

          .results-header {
            flex-wrap: wrap;
          }

          .candidate-card {
            flex-direction: column;
            gap: 1rem;
          }

          .candidate-header {
            flex-direction: column;
            gap: 1rem;
          }

          .candidate-info-section {
            gap: 0.75rem;
          }

          .candidate-user-icon {
            width: 40px;
            height: 40px;
            padding: 8px;
          }

          .candidate-name {
            font-size: 1.25rem;
          }

          .candidate-score-section {
            flex-direction: row;
            align-items: center;
            width: 100%;
            justify-content: space-between;
          }

          .score-item {
            grid-template-columns: 100px 1fr 55px;
            gap: 0.75rem;
          }

          .rank-badge {
            font-size: 2rem;
            min-width: 60px;
            height: 60px;
          }

          .score-circle {
            width: 75px;
            height: 75px;
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  )
}

export default Results
