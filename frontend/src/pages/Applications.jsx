import { useState, useEffect } from 'react'
import { applicationsService } from '../services/applicationsService'
import { jobPostingsService } from '../services/jobPostingsService'
import { useAuthStore } from '../store/authStore'

const STAGES = [
  { value: 'applied', label: 'Applied', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  { value: 'screening', label: 'Screening', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500' },
  { value: 'interview', label: 'Interview', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400', dot: 'bg-purple-500' },
  { value: 'assessment', label: 'Assessment', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  { value: 'offer', label: 'Offer', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  { value: 'hired', label: 'Hired', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', dot: 'bg-red-500' }
]

const getStageBadge = (stage) => {
  const config = STAGES.find(s => s.value === stage) || STAGES[0]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
      {config.label}
    </span>
  )
}

export default function Applications() {
  const { profile } = useAuthStore()
  const [pipeline, setPipeline] = useState(null)
  const [jobs, setJobs] = useState([])
  const [selectedJobId, setSelectedJobId] = useState('')
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [appsLoading, setAppsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Detail modal
  const [selectedApp, setSelectedApp] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [activityHistory, setActivityHistory] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [pipelineData, jobsData] = await Promise.all([
        applicationsService.getPipelineSummary().catch(() => null),
        jobPostingsService.getJobPostings(null, { status: 'open' }).catch(() => [])
      ])
      setPipeline(pipelineData)
      setJobs(jobsData || [])
      if (jobsData?.length > 0 && !selectedJobId) {
        setSelectedJobId(jobsData[0].id)
      }
    } catch (err) {
      console.error('Failed to fetch initial data:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const fetchApplications = async (jobId) => {
    if (!jobId) return
    try {
      setAppsLoading(true)
      const data = await applicationsService.getApplicationsByJob(jobId)
      setApplications(data || [])
    } catch (err) {
      console.error('Failed to fetch applications:', err)
      setApplications([])
    } finally {
      setAppsLoading(false)
    }
  }

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (selectedJobId) {
      fetchApplications(selectedJobId)
    }
  }, [selectedJobId])

  const handleMoveStage = async (applicationId, newStage) => {
    try {
      setActionLoading(true)
      await applicationsService.moveStage(applicationId, newStage)
      await fetchApplications(selectedJobId)
      const pipelineData = await applicationsService.getPipelineSummary().catch(() => null)
      setPipeline(pipelineData)
    } catch (err) {
      alert(err.message || 'Failed to update stage')
    } finally {
      setActionLoading(false)
    }
  }

  const handleViewDetail = async (app) => {
    setSelectedApp(app)
    setShowDetailModal(true)
    try {
      setActivityLoading(true)
      const history = await applicationsService.getActivityHistory(app.id)
      setActivityHistory(history || [])
    } catch (err) {
      console.error('Failed to fetch activity:', err)
      setActivityHistory([])
    } finally {
      setActivityLoading(false)
    }
  }

  const pipelineCards = [
    { key: 'applied', label: 'Applied', icon: 'assignment', bgIcon: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
    { key: 'screening', label: 'Screening', icon: 'person_search', bgIcon: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' },
    { key: 'interview', label: 'Interview', icon: 'groups', bgIcon: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
    { key: 'assessment', label: 'Assessment', icon: 'quiz', bgIcon: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' },
    { key: 'offer', label: 'Offer', icon: 'local_offer', bgIcon: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
    { key: 'hired', label: 'Hired', icon: 'check_circle', bgIcon: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
    { key: 'rejected', label: 'Rejected', icon: 'cancel', bgIcon: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-subtext-light dark:text-subtext-dark">Loading applications...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <span className="material-icons-outlined text-red-500 text-4xl mb-4">error_outline</span>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => fetchInitialData()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Applications</h1>
          <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">
            Track and manage candidate applications across your pipeline
          </p>
        </div>
      </div>

      {/* Pipeline Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-8">
        {pipelineCards.map(card => (
          <div key={card.key} className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-border-dark shadow-sm text-center">
            <div className={`h-8 w-8 ${card.bgIcon} rounded-lg flex items-center justify-center mx-auto mb-2`}>
              <span className="material-icons-outlined text-base">{card.icon}</span>
            </div>
            <h3 className="text-2xl font-bold text-text-light dark:text-text-dark">{pipeline?.[card.key] || 0}</h3>
            <p className="text-xs text-subtext-light dark:text-subtext-dark mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Job Selector */}
      <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-border-dark shadow-sm mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center gap-2 text-subtext-light dark:text-subtext-dark">
            <span className="material-icons-outlined text-lg">work</span>
            <span className="text-sm font-medium">Filter by Job:</span>
          </div>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full md:w-96 border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {jobs.length === 0 ? (
              <option value="">No open positions</option>
            ) : (
              jobs.map(job => (
                <option key={job.id} value={job.id}>{job.title} ({job.applications_count || 0} applications)</option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">
              <tr>
                <th className="px-6 py-4">Candidate</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Stage</th>
                <th className="px-6 py-4">Applied</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark text-sm">
              {appsLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-subtext-light dark:text-subtext-dark">Loading applications...</p>
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <span className="material-icons-outlined text-gray-400 text-4xl mb-2">person_search</span>
                      <p className="text-subtext-light dark:text-subtext-dark">No applications for this position yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {app.candidate_name?.charAt(0)?.toUpperCase() || app.candidate_email?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span className="font-medium text-text-light dark:text-text-dark">
                          {app.candidate_name || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-subtext-light dark:text-subtext-dark">{app.candidate_email || '-'}</td>
                    <td className="px-6 py-4">{getStageBadge(app.stage)}</td>
                    <td className="px-6 py-4 text-subtext-light dark:text-subtext-dark">
                      {app.created_at ? new Date(app.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewDetail(app)}
                          className="p-1.5 text-subtext-light dark:text-subtext-dark hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                          title="View Details"
                        >
                          <span className="material-icons-outlined text-base">visibility</span>
                        </button>
                        {app.stage !== 'hired' && app.stage !== 'rejected' && (
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) handleMoveStage(app.id, e.target.value)
                            }}
                            disabled={actionLoading}
                            className="text-xs border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded px-2 py-1 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">Move to...</option>
                            {STAGES.filter(s => s.value !== app.stage).map(s => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Application Detail Modal */}
      {showDetailModal && selectedApp && (
        <ApplicationDetailModal
          application={selectedApp}
          activityHistory={activityHistory}
          activityLoading={activityLoading}
          onClose={() => { setShowDetailModal(false); setSelectedApp(null); setActivityHistory([]) }}
          onMoveStage={(stage) => {
            handleMoveStage(selectedApp.id, stage)
            setShowDetailModal(false)
            setSelectedApp(null)
          }}
        />
      )}
    </div>
  )
}

function ApplicationDetailModal({ application, activityHistory, activityLoading, onClose, onMoveStage }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Application Details</h2>
            <p className="text-sm text-subtext-light dark:text-subtext-dark">
              {application.candidate_name || application.candidate_email}
            </p>
          </div>
          <button onClick={onClose} className="text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Candidate Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase">Name</label>
              <p className="text-sm text-text-light dark:text-text-dark mt-1">{application.candidate_name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase">Email</label>
              <p className="text-sm text-text-light dark:text-text-dark mt-1">{application.candidate_email || 'N/A'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase">Current Stage</label>
              <div className="mt-1">{getStageBadge(application.stage)}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase">Applied On</label>
              <p className="text-sm text-text-light dark:text-text-dark mt-1">
                {application.created_at ? new Date(application.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>

          {/* Cover Letter */}
          {application.cover_letter && (
            <div>
              <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase">Cover Letter</label>
              <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm text-text-light dark:text-text-dark whitespace-pre-wrap">
                {application.cover_letter}
              </div>
            </div>
          )}

          {/* Resume Link */}
          {application.resume_url && (
            <div>
              <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase">Resume</label>
              <a
                href={application.resume_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <span className="material-icons-outlined text-base">description</span>
                View Resume
              </a>
            </div>
          )}

          {/* Notes */}
          {application.notes && (
            <div>
              <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase">Notes</label>
              <p className="mt-2 text-sm text-text-light dark:text-text-dark">{application.notes}</p>
            </div>
          )}

          {/* Stage Progression */}
          {application.stage !== 'hired' && application.stage !== 'rejected' && (
            <div>
              <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase mb-2 block">Move Stage</label>
              <div className="flex flex-wrap gap-2">
                {STAGES.filter(s => s.value !== application.stage).map(s => (
                  <button
                    key={s.value}
                    onClick={() => onMoveStage(s.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      s.value === 'rejected'
                        ? 'border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Activity History */}
          <div>
            <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase mb-2 block">Activity History</label>
            {activityLoading ? (
              <div className="flex items-center gap-2 text-sm text-subtext-light dark:text-subtext-dark">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Loading activity...
              </div>
            ) : activityHistory.length === 0 ? (
              <p className="text-sm text-subtext-light dark:text-subtext-dark">No activity recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {activityHistory.map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0"></div>
                    <div>
                      <p className="text-sm text-text-light dark:text-text-dark">{item.description || item.action}</p>
                      <p className="text-xs text-subtext-light dark:text-subtext-dark mt-0.5">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                        {item.performed_by && ` by ${item.performed_by}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
