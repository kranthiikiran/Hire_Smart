import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import {
  History as HistoryIcon,
  FileText,
  Calendar,
  TrendingUp,
  Search,
  Filter
} from 'lucide-react'

const History = () => {
  const [analyses, setAnalyses] = useState([])
  const [filteredAnalyses, setFilteredAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterClassification, setFilterClassification] = useState('all')

  const normalizeClassification = (value, fallbackScore = 0) => {
    const normalized = String(value || '').trim().toLowerCase()
    if (normalized === 'suitable') return 'suitable'
    if (normalized === 'partial' || normalized === 'partially suitable' || normalized === 'partially_suitable' || normalized === 'partially-suitable') return 'partial'
    if (normalized === 'not suitable' || normalized === 'not_suitable' || normalized === 'not-suitable') return 'not-suitable'
    if (fallbackScore >= 75) return 'suitable'
    if (fallbackScore >= 50) return 'partial'
    return 'not-suitable'
  }

  const deriveClassificationFromCounts = (analysis) => {
    if (Number(analysis?.suitableCount || 0) > 0) return 'suitable'
    if (Number(analysis?.partiallyCount || 0) > 0) return 'partial'
    if (Number(analysis?.notSuitableCount || 0) > 0) return 'not-suitable'
    return null
  }

  const fetchHistory = useCallback(async () => {
    try {
      const response = await api.get('/api/analyze/history')
      const analysesList = Array.isArray(response.data?.analyses)
        ? response.data.analyses.map((analysis) => {
            const matchScore = Number(analysis.averageScore || 0)
            return {
              id: analysis.id,
              jobTitle: analysis.jobTitle,
              createdAt: analysis.createdAt,
              matchScore,
              candidateName: analysis.candidateName || null,
              candidateCount: analysis.totalProcessed || 0,
              classification: deriveClassificationFromCounts(analysis) || normalizeClassification(analysis.classification, matchScore)
            }
          })
        : []

      setAnalyses(analysesList)
      setFilteredAnalyses(analysesList)
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const filterAnalyses = useCallback(() => {
    let filtered = [...analyses]

    // Search filter
    if (searchQuery) {
      const normalizedQuery = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (analysis) =>
          analysis.jobTitle?.toLowerCase().includes(normalizedQuery) ||
          analysis.candidateName?.toLowerCase().includes(normalizedQuery)
      )
    }

    // Classification filter
    if (filterClassification !== 'all') {
      filtered = filtered.filter(
        (analysis) => analysis.classification === filterClassification
      )
    }

    setFilteredAnalyses(filtered)
  }, [analyses, filterClassification, searchQuery])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  useEffect(() => {
    if (!loading) {
      filterAnalyses()
    }
  }, [filterAnalyses, loading])

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
      <div className="history-loading">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="history-page">
      <div className="history-header">
        <div>
          <h1 className="page-title">Analysis History</h1>
          <p className="page-subtitle">
            View all your previous resume screenings
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by job title or candidate name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter size={18} />
          <select
            className="filter-select"
            value={filterClassification}
            onChange={(e) => setFilterClassification(e.target.value)}
          >
            <option value="all">All Classifications</option>
            <option value="suitable">Suitable</option>
            <option value="partial">Partially Suitable</option>
            <option value="not-suitable">Not Suitable</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="results-count">
        Showing {filteredAnalyses.length} of {analyses.length} analyses
      </div>

      {/* History List */}
      {filteredAnalyses.length === 0 ? (
        <div className="empty-state">
          <HistoryIcon size={48} className="empty-icon" />
          <h3>No analyses found</h3>
          <p>
            {searchQuery || filterClassification !== 'all'
              ? 'Try adjusting your filters'
              : 'Start by uploading resumes to analyze'}
          </p>
        </div>
      ) : (
        <div className="history-list">
          {filteredAnalyses.map((analysis) => {
            const badge = getClassificationBadge(analysis.classification)

            return (
              <Link
                key={analysis.id}
                to={`/results/${analysis.id}`}
                className="history-card"
              >
                <div className="history-card-icon">
                  <FileText size={24} />
                </div>

                <div className="history-card-content">
                  <div className="history-card-header">
                    <h3 className="history-title">
                      {analysis.jobTitle || 'Resume Analysis'}
                    </h3>
                    <div className="history-meta">
                      <span className="history-date">
                        <Calendar size={14} />
                        {new Date(analysis.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      {analysis.candidateCount && (
                        <span className="history-candidates">
                          {analysis.candidateCount} candidate{analysis.candidateCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {analysis.candidateName && (
                    <p className="history-candidate">
                      Candidate: {analysis.candidateName}
                    </p>
                  )}
                </div>

                <div className="history-card-score">
                  <div
                    className="score-badge"
                    style={{ background: getScoreColor(analysis.matchScore) }}
                  >
                    {analysis.matchScore}%
                  </div>
                  <span className={`badge ${badge.class}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="history-card-arrow">
                  <TrendingUp size={20} />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <style>{`
        .history-page {
          max-width: 1000px;
          margin: 0 auto;
        }

        .history-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          color: rgba(255, 255, 255, 0.82);
        }

        .history-header {
          margin-bottom: 2rem;
        }

        .page-title {
          font-size: 2rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 0.5rem;
          text-shadow: 0 0 20px rgba(255, 215, 100, 0.15);
        }

        .page-subtitle {
          color: rgba(255, 255, 255, 0.78);
        }

        .filters-section {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .search-box {
          flex: 1;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 215, 100, 0.5);
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 0.75rem 0.75rem 2.75rem;
          border: 1px solid rgba(255, 215, 100, 0.25);
          border-radius: 0.5rem;
          font-size: 1rem;
          transition: all 0.2s ease;
          background: rgba(25, 25, 30, 0.7);
          color: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
        }

        .search-input:focus {
          outline: none;
          border-color: rgba(255, 215, 100, 0.5);
          box-shadow: 0 0 0 3px rgba(255, 215, 100, 0.1);
          background: rgba(20, 20, 20, 0.7);
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0 0.75rem;
          background: rgba(25, 25, 25, 0.8);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 215, 100, 0.15);
          border-radius: 0.5rem;
          color: rgba(255, 215, 100, 0.8);
        }

        .filter-select {
          padding: 0.75rem 0.5rem;
          border: none;
          background: none;
          font-size: 1rem;
          cursor: pointer;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 500;
        }

        .filter-select:focus {
          outline: none;
        }

        .results-count {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.78);
          margin-bottom: 1rem;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 1rem;
          background: rgba(35, 35, 42, 0.85);
          backdrop-filter: blur(12px);
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 215, 100, 0.2);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .empty-icon {
          color: rgba(255, 215, 100, 0.6);
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          color: rgba(255, 255, 255, 0.6);
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .history-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: rgba(35, 35, 42, 0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 215, 100, 0.15);
          border-radius: 0.75rem;
          text-decoration: none;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }

        .history-card:hover {
          border-color: rgba(255, 215, 100, 0.3);
          box-shadow: 0 8px 24px rgba(255, 215, 100, 0.1);
          transform: translateY(-2px);
          background: rgba(40, 40, 48, 0.9);
        }

        .history-card-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 215, 100, 0.15);
          border-radius: 0.5rem;
          color: #ffd764;
          flex-shrink: 0;
          border: 1px solid rgba(255, 215, 100, 0.3);
        }

        .history-card-content {
          flex: 1;
          min-width: 0;
        }

        .history-card-header {
          margin-bottom: 0.5rem;
        }

        .history-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 0.25rem;
        }

        .history-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .history-date {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .history-candidates {
          font-weight: 500;
        }

        .history-candidate {
          font-size: 0.875rem;
          color: rgba(255, 215, 100, 0.7);
        }

        .history-card-score {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .score-badge {
          font-size: 1.125rem;
          font-weight: 700;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
        }

        .badge {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.25rem 0.75rem;
          border-radius: 0.375rem;
          white-space: nowrap;
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

        .history-card-arrow {
          color: rgba(255, 215, 100, 0.5);
          flex-shrink: 0;
          transition: transform 0.2s ease;
        }

        .history-card:hover .history-card-arrow {
          transform: translateX(4px);
          color: #ffd764;
        }

        @media (max-width: 768px) {
          .filters-section {
            flex-direction: column;
          }

          .history-card {
            flex-direction: column;
            align-items: flex-start;
          }

          .history-card-score {
            align-items: flex-start;
            flex-direction: row;
          }

          .history-card-arrow {
            align-self: flex-end;
          }
        }
      `}</style>
    </div>
  )
}

export default History
