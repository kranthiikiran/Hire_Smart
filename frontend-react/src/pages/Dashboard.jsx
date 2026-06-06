import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import {
  FileText,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  Upload as UploadIcon,
  ArrowRight
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

// Shared styles for both candidate and recruiter dashboards - Dark Theme
const dashboardStyles = `
  .dashboard {
    padding: 2rem 0;
  }

  .dashboard-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
    color: rgba(255, 255, 255, 0.7);
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2.5rem;
    gap: 2rem;
  }

  .dashboard-title {
    font-size: 2.25rem;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.95);
    margin-bottom: 0.5rem;
    letter-spacing: -0.025em;
    text-shadow: 0 0 20px rgba(255, 215, 100, 0.15);
  }

  .dashboard-subtitle {
    color: rgba(255, 255, 255, 0.6);
    font-size: 1.0625rem;
    line-height: 1.5;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2.5rem;
  }

  .stat-card {
    background: rgba(35, 35, 42, 0.85);
    backdrop-filter: blur(12px);
    border-radius: var(--radius-lg);
    padding: 1.75rem;
    display: flex;
    gap: 1.25rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 215, 100, 0.15);
    transition: all var(--transition);
    position: relative;
    overflow: hidden;
  }

  .stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #ffd764, #ffeb99);
    transform: scaleX(0);
    transition: transform var(--transition-slow);
  }

  .stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(255, 215, 100, 0.12);
    border-color: rgba(255, 215, 100, 0.3);
    background: rgba(40, 40, 48, 0.9);
  }

  .stat-card:hover::before {
    transform: scaleX(1);
  }

  .stat-card-button {
    width: 100%;
    border: 1px solid rgba(255, 215, 100, 0.15);
    cursor: pointer;
    text-align: left;
  }

  .stat-card-button:focus-visible {
    outline: 2px solid rgba(255, 215, 100, 0.6);
    outline-offset: 3px;
  }

  .stat-card-active {
    border-color: rgba(255, 215, 100, 0.45);
    background: rgba(45, 45, 52, 0.95);
    box-shadow: 0 12px 32px rgba(255, 215, 100, 0.16);
  }

  .dashboard-hint {
    margin: -1rem 0 2rem;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9375rem;
  }

  .results-toolbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.875rem;
    border-radius: var(--radius-full);
    border: 1px solid rgba(255, 215, 100, 0.2);
    background: rgba(255, 215, 100, 0.12);
    color: rgba(255, 255, 255, 0.92);
    font-size: 0.875rem;
    font-weight: 600;
  }

  .stat-icon {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(255, 215, 100, 0.2);
  }

  .stat-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .stat-value {
    font-size: 2.25rem;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.95);
    line-height: 1;
    margin-bottom: 0.5rem;
    text-shadow: 0 0 10px rgba(255, 215, 100, 0.2);
  }

  .stat-label {
    font-size: 0.9375rem;
    color: rgba(255, 255, 255, 0.6);
    font-weight: 500;
  }

  .charts-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2.5rem;
  }

  .chart-card {
    background: rgba(35, 35, 42, 0.85);
    backdrop-filter: blur(12px);
    border-radius: var(--radius-lg);
    padding: 2rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 215, 100, 0.15);
    transition: all var(--transition);
  }

  .chart-card:hover {
    box-shadow: 0 12px 32px rgba(255, 215, 100, 0.08);
    border-color: rgba(255, 215, 100, 0.25);
  }

  /* Chart Styling for Dark Theme */
  .recharts-cartesian-grid-horizontal line,
  .recharts-cartesian-grid-vertical line {
    stroke: rgba(255, 255, 255, 0.08);
  }

  .recharts-text {
    fill: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
  }

  .recharts-tooltip-wrapper {
    outline: none;
  }

  .recharts-default-tooltip {
    background: rgba(20, 20, 25, 0.95) !important;
    border: 1px solid rgba(255, 215, 100, 0.25) !important;
    border-radius: 8px !important;
    padding: 12px !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5) !important;
  }

  .recharts-tooltip-label {
    color: rgba(255, 255, 255, 0.95) !important;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .recharts-tooltip-item {
    color: rgba(255, 255, 255, 0.85) !important;
  }

  .chart-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.95);
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .recent-section {
    background: rgba(35, 35, 42, 0.85);
    backdrop-filter: blur(12px);
    border-radius: var(--radius-lg);
    padding: 2rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 215, 100, 0.15);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .section-title {
    font-size: 1.375rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.95);
  }

  .section-link {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: #ffd764;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.9375rem;
    transition: all var(--transition-fast);
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
    background: rgba(255, 215, 100, 0.1);
    border: 1px solid rgba(255, 215, 100, 0.2);
  }

  .section-link:hover {
    gap: 0.625rem;
    background: rgba(255, 215, 100, 0.2);
    border-color: rgba(255, 215, 100, 0.4);
    box-shadow: 0 4px 12px rgba(255, 215, 100, 0.2);
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    background: rgba(20, 20, 20, 0.5);
    border-radius: var(--radius-lg);
    border: 2px dashed rgba(255, 215, 100, 0.2);
  }

  .empty-icon {
    color: rgba(255, 215, 100, 0.6);
    margin-bottom: 1.5rem;
    animation: pulse 2s infinite;
  }

  .empty-state h3 {
    font-size: 1.375rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.95);
    margin-bottom: 0.75rem;
  }

  .empty-state p {
    color: rgba(255, 255, 255, 0.6);
    font-size: 1.0625rem;
    max-width: 400px;
    margin: 0 auto 1.5rem;
  }

  .analyses-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .analysis-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem;
    border: 1px solid rgba(255, 215, 100, 0.15);
    border-radius: var(--radius-lg);
    text-decoration: none;
    transition: all var(--transition);
    background: rgba(30, 30, 35, 0.7);
    backdrop-filter: blur(8px);
    position: relative;
    overflow: hidden;
  }

  .analysis-card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, #ffd764, #ffeb99);
    transform: scaleY(0);
    transition: transform var(--transition);
  }

  .analysis-card:hover {
    border-color: rgba(255, 215, 100, 0.3);
    background: rgba(38, 38, 45, 0.85);
    transform: translateX(8px);
    box-shadow: 0 8px 24px rgba(255, 215, 100, 0.1);
  }

  .analysis-card:hover::before {
    transform: scaleY(1);
  }

  .analysis-info {
    flex: 1;
  }

  .analysis-title {
    font-size: 1.0625rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.95);
    margin-bottom: 0.375rem;
  }

  .analysis-job {
    font-size: 0.9375rem;
    color: rgba(255, 215, 100, 0.8);
    margin-bottom: 0.375rem;
    font-weight: 500;
  }

  .analysis-date {
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 500;
  }

  .analysis-score {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.625rem;
  }

  .score-badge {
    font-size: 1.5rem;
    font-weight: 800;
    color: white;
    padding: 0.625rem 1.25rem;
    border-radius: var(--radius);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    min-width: 80px;
    text-align: center;
  }

  .badge {
    font-size: 0.8125rem;
    font-weight: 700;
    padding: 0.375rem 0.875rem;
    border-radius: var(--radius-full);
  }

  .badge-success {
    background: rgba(34, 197, 94, 0.2);
    color: #4ade80;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .badge-warning {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }

  .badge-danger {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  @media (max-width: 768px) {
    .dashboard {
      padding: 1.5rem 0;
    }

    .dashboard-header {
      flex-direction: column;
    }

    .dashboard-title {
      font-size: 1.875rem;
    }

    .charts-section {
      grid-template-columns: 1fr;
    }

    .analysis-card {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .analysis-score {
      width: 100%;
      align-items: flex-start;
      flex-direction: row;
      justify-content: space-between;
    }
  }
`

const Dashboard = () => {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    averageScore: 0,
    recentScores: [],
    classifications: { suitable: 0, partial: 0, notSuitable: 0 }
  })
  const [recentAnalyses, setRecentAnalyses] = useState([])
  const [loading, setLoading] = useState(true)

  const normalizeClassification = (value, fallbackScore = 0) => {
    const normalized = String(value || '').trim().toLowerCase()
    if (normalized === 'suitable') return 'suitable'
    if (normalized === 'partial' || normalized === 'partially suitable' || normalized === 'partially_suitable' || normalized === 'partially-suitable') return 'partial'
    if (normalized === 'not suitable' || normalized === 'not_suitable' || normalized === 'not-suitable') return 'not-suitable'
    if (fallbackScore >= 75) return 'suitable'
    if (fallbackScore >= 50) return 'partial'
    return 'not-suitable'
  }
  
  // Determine view based on user role from JWT token
  const isCandidate = user?.role === 'candidate'
  const activeFilter = searchParams.get('classification') || 'all'

  const setClassificationFilter = (classification) => {
    const nextParams = new URLSearchParams(searchParams)

    if (!classification || classification === 'all') {
      nextParams.delete('classification')
    } else {
      nextParams.set('classification', classification)
    }

    setSearchParams(nextParams, { replace: true })
  }

  const deriveClassificationFromCounts = (analysis) => {
    if (Number(analysis?.suitableCount || 0) > 0) return 'suitable'
    if (Number(analysis?.partiallyCount || 0) > 0) return 'partial'
    if (Number(analysis?.notSuitableCount || 0) > 0) return 'not-suitable'
    return null
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsRes, historyRes] = await Promise.all([
        api.get('/api/analyze/stats'),
        api.get('/api/analyze/history?limit=50')
      ])

      const statsPayload = statsRes.data?.stats || {}
      const normalizedStats = {
        totalAnalyses: Number(statsPayload.totalAnalyses || 0),
        averageScore: Number(statsPayload.averageMatchScore || 0),
        recentScores: [],
        classifications: {
          suitable: Number(statsPayload.suitableCandidates || 0),
          partial: Number(statsPayload.partialCandidates || 0),
          notSuitable: Number(statsPayload.notSuitableCandidates || 0)
        }
      }

      const historyList = Array.isArray(historyRes.data?.analyses)
        ? historyRes.data.analyses
        : []

      const normalizedRecentAnalyses = historyList.map((analysis) => {
        const matchScore = Number(analysis.averageScore || 0)
        const classificationFromCounts = deriveClassificationFromCounts(analysis)

        return {
          id: analysis.id,
          jobTitle: analysis.jobTitle,
          createdAt: analysis.createdAt,
          candidateName: analysis.candidateName || null,
          suitableCount: Number(analysis.suitableCount || 0),
          partiallyCount: Number(analysis.partiallyCount || 0),
          notSuitableCount: Number(analysis.notSuitableCount || 0),
          totalProcessed: Number(analysis.totalProcessed || 0),
          matchScore,
          classification: classificationFromCounts || normalizeClassification(analysis.classification, matchScore)
        }
      })

      normalizedStats.recentScores = normalizedRecentAnalyses
        .filter((item) => Number.isFinite(item.matchScore))
        .slice(0, 6)
        .reverse()
        .map((item, index) => ({
          name: item.jobTitle || `Analysis ${index + 1}`,
          score: item.matchScore
        }))

      const statsAreEmpty =
        normalizedStats.totalAnalyses === 0 &&
        normalizedStats.averageScore === 0 &&
        normalizedStats.classifications.suitable === 0 &&
        normalizedStats.classifications.partial === 0 &&
        normalizedStats.classifications.notSuitable === 0

      const derivedStats = normalizedRecentAnalyses.reduce((accumulator, analysis) => {
        accumulator.totalAnalyses += 1
        accumulator.scoreTotal += analysis.matchScore
        accumulator.classifications.suitable += analysis.suitableCount
        accumulator.classifications.partial += analysis.partiallyCount
        accumulator.classifications.notSuitable += analysis.notSuitableCount
        return accumulator
      }, {
        totalAnalyses: 0,
        scoreTotal: 0,
        classifications: { suitable: 0, partial: 0, notSuitable: 0 }
      })

      const fallbackStats = {
        totalAnalyses: derivedStats.totalAnalyses,
        averageScore: derivedStats.totalAnalyses > 0
          ? derivedStats.scoreTotal / derivedStats.totalAnalyses
          : 0,
        recentScores: normalizedStats.recentScores,
        classifications: derivedStats.classifications
      }

      setStats(statsAreEmpty && normalizedRecentAnalyses.length > 0 ? fallbackStats : normalizedStats)
      setRecentAnalyses(normalizedRecentAnalyses)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const chartData = [
    { name: 'Suitable', value: stats.classifications.suitable, color: '#10b981' },
    { name: 'Partial', value: stats.classifications.partial, color: '#f59e0b' },
    { name: 'Not Suitable', value: stats.classifications.notSuitable, color: '#ef4444' }
  ]

  const recentScoresData = stats.recentScores

  const filteredAnalyses = activeFilter === 'all'
    ? recentAnalyses
    : recentAnalyses.filter((analysis) => analysis.classification === activeFilter)

  const visibleAnalyses = activeFilter === 'all'
    ? filteredAnalyses.slice(0, 5)
    : filteredAnalyses

  const filterTitles = {
    all: 'Recent Analyses',
    suitable: 'Suitable Match Results',
    partial: 'Partial Match Results',
    'not-suitable': 'Not Suitable Results'
  }

  const getScoreColor = (score) => {
    if (score >= 75) return 'var(--success)'
    if (score >= 50) return 'var(--warning)'
    return 'var(--danger)'
  }

  const getClassificationBadge = (classification) => {
    const badges = {
      suitable: { label: 'Suitable', class: 'badge-success' },
      partial: { label: 'Partially Suitable', class: 'badge-warning' },
      'not-suitable': { label: 'Not Suitable', class: 'badge-danger' }
    }
    return badges[classification] || badges.partial
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
      </div>
    )
  }

  // Candidate Dashboard View
  if (isCandidate) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">
              Welcome, {user?.email?.split('@')[0]}!
            </h1>
            <p className="dashboard-subtitle">
              Upload your resume to get AI-powered feedback and match scores
            </p>
          </div>
          <Link to="/upload" className="btn btn-primary">
            <UploadIcon size={20} />
            Upload Resume
          </Link>
        </div>

        {/* Candidate Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
              <FileText size={24} style={{ color: 'var(--primary)' }} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalAnalyses || 0}</div>
              <div className="stat-label">Resumes Analyzed</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
              <TrendingUp size={24} style={{ color: 'var(--success)' }} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.averageScore?.toFixed(1) || 0}%</div>
              <div className="stat-label">Average Match Score</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
              <CheckCircle size={24} style={{ color: 'var(--success)' }} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.classifications?.suitable || 0}</div>
              <div className="stat-label">Strong Matches</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
              <Users size={24} style={{ color: 'var(--warning)' }} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{recentAnalyses.length}</div>
              <div className="stat-label">Recent Submissions</div>
            </div>
          </div>
        </div>

        {/* Candidate Recent Activity */}
        <div className="recent-section">
          <div className="section-header">
            <h2 className="section-title">Your Resume Analyses</h2>
            <Link to="/history" className="section-link">
              View All <ArrowRight size={16} />
            </Link>
          </div>

          {recentAnalyses.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} className="empty-icon" />
              <h3>No resume analyses yet</h3>
              <p>Upload your resume and a job description to get personalized feedback</p>
              <Link to="/upload" className="btn btn-primary mt-4">
                <UploadIcon size={18} />
                Upload Resume
              </Link>
            </div>
          ) : (
            <div className="analyses-list">
              {recentAnalyses.map((analysis) => (
                <Link
                  key={analysis.id}
                  to={`/results/${analysis.id}`}
                  className="analysis-card"
                >
                  <div className="analysis-info">
                    <h4 className="analysis-title">{analysis.jobTitle || 'Job Position'}</h4>
                    <p className="analysis-job">
                      Resume: {analysis.candidateName || 'Your Resume'}
                    </p>
                    <span className="analysis-date">
                      {new Date(analysis.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="analysis-score">
                    <div
                      className="score-badge"
                      style={{ background: getScoreColor(analysis.matchScore) }}
                    >
                      {analysis.matchScore}%
                    </div>
                    <span className={`badge ${getClassificationBadge(analysis.classification).class}`}>
                      {getClassificationBadge(analysis.classification).label}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <style>{`${dashboardStyles}`}</style>
      </div>
    )
  }

  // Recruiter Dashboard View (existing functionality)
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            Welcome back, {user?.email?.split('@')[0]}!
          </h1>
          <p className="dashboard-subtitle">
            Manage your candidate screenings and track performance
          </p>
        </div>
        <Link to="/upload" className="btn btn-primary">
          <UploadIcon size={20} />
          New Analysis
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <button type="button" className={`stat-card stat-card-button ${activeFilter === 'all' ? 'stat-card-active' : ''}`} onClick={() => setClassificationFilter('all')}>
          <div className="stat-icon" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
            <FileText size={24} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalAnalyses}</div>
            <div className="stat-label">Total Analyses</div>
          </div>
        </button>

        <button type="button" className={`stat-card stat-card-button ${activeFilter === 'all' ? 'stat-card-active' : ''}`} onClick={() => setClassificationFilter('all')}>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
            <TrendingUp size={24} style={{ color: 'var(--success)' }} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.averageScore.toFixed(1)}%</div>
            <div className="stat-label">Average Score</div>
          </div>
        </button>

        <button type="button" className={`stat-card stat-card-button ${activeFilter === 'suitable' ? 'stat-card-active' : ''}`} onClick={() => setClassificationFilter('suitable')}>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
            <CheckCircle size={24} style={{ color: 'var(--success)' }} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.classifications.suitable}</div>
            <div className="stat-label">Suitable Matches</div>
          </div>
        </button>

        <button type="button" className={`stat-card stat-card-button ${activeFilter === 'partial' ? 'stat-card-active' : ''}`} onClick={() => setClassificationFilter('partial')}>
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
            <Clock size={24} style={{ color: 'var(--warning)' }} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.classifications.partial}</div>
            <div className="stat-label">Partial Matches</div>
          </div>
        </button>
      </div>

      <div className="dashboard-hint">Select a dashboard card to filter the visible result list below.</div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-card">
          <h3 className="chart-title">Recent Score Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={recentScoresData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
              <XAxis dataKey="name" tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(20, 20, 25, 0.98)',
                  border: '1px solid rgba(255, 215, 100, 0.3)',
                  borderRadius: '8px',
                  padding: '12px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
                }}
                wrapperStyle={{
                  backgroundColor: 'transparent',
                  outline: 'none',
                  boxShadow: 'none'
                }}
                cursor={{ fill: 'rgba(255, 215, 100, 0.1)' }}
                labelStyle={{ color: 'rgba(255, 255, 255, 0.95)', fontWeight: 600 }}
                contentProps={{
                  style: {
                    outline: 'none',
                    backgroundColor: 'rgba(20, 20, 25, 0.98)'
                  }
                }}
              />
              <Bar 
                dataKey="score" 
                fill="#ffd764" 
                stroke="rgba(255, 215, 100, 0.3)" 
                strokeWidth={2}
                radius={[8, 8, 0, 0]}
                isAnimationActive={true}
                animationDuration={300}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Classification Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                style={{ fontSize: '0.875rem', fontWeight: 600 }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(20, 20, 25, 0.98)',
                  border: '1px solid rgba(255, 215, 100, 0.3)',
                  borderRadius: '8px',
                  padding: '12px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
                }}
                wrapperStyle={{
                  backgroundColor: 'transparent',
                  outline: 'none',
                  boxShadow: 'none'
                }}
                labelStyle={{ color: 'rgba(255, 255, 255, 0.95)', fontWeight: 600 }}
                contentProps={{
                  style: {
                    outline: 'none',
                    backgroundColor: 'rgba(20, 20, 25, 0.98)'
                  }
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Analyses */}
      <div className="recent-section">
        <div className="section-header">
          <h2 className="section-title">{filterTitles[activeFilter] || filterTitles.all}</h2>
          <div className="results-toolbar">
            {activeFilter !== 'all' && (
              <button type="button" className="filter-chip" onClick={() => setClassificationFilter('all')}>
                Clear Filter
              </button>
            )}
            <Link to="/history" className="section-link">
              View All <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {visibleAnalyses.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} className="empty-icon" />
            <h3>{activeFilter === 'all' ? 'No analyses yet' : 'No results in this category yet'}</h3>
            <p>
              {activeFilter === 'all'
                ? 'Upload a resume and job description to get started'
                : 'Run more analyses or switch filters to review other result groups.'}
            </p>
            <Link to="/upload" className="btn btn-primary mt-4">
              <UploadIcon size={18} />
              Start Analysis
            </Link>
          </div>
        ) : (
          <div className="analyses-list">
            {visibleAnalyses.map((analysis) => (
              <Link
                key={analysis.id}
                to={`/results/${analysis.id}`}
                className="analysis-card"
              >
                <div className="analysis-info">
                  <h4 className="analysis-title">{analysis.candidateName || 'Resume Analysis'}</h4>
                  <p className="analysis-job">{analysis.jobTitle || 'Job Position'}</p>
                  <span className="analysis-date">
                    {new Date(analysis.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="analysis-score">
                  <div
                    className="score-badge"
                    style={{ background: getScoreColor(analysis.matchScore) }}
                  >
                    {analysis.matchScore}%
                  </div>
                  <span className={`badge ${getClassificationBadge(analysis.classification).class}`}>
                    {getClassificationBadge(analysis.classification).label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style>{`${dashboardStyles}`}</style>
    </div>
  )
}

export default Dashboard
