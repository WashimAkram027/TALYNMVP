import { useState, useEffect } from 'react'
import { jobPostingsService } from '../services/jobPostingsService'
import { useAuthStore } from '../store/authStore'

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' }
]

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'draft', label: 'Draft' },
  { value: 'closed', label: 'Closed' }
]

const CURRENCY_OPTIONS = ['USD', 'NPR', 'EUR', 'GBP']

const getStatusBadge = (status) => {
  const s = status?.toLowerCase()
  if (s === 'open') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Open
      </span>
    )
  }
  if (s === 'draft') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span> Draft
      </span>
    )
  }
  if (s === 'closed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Closed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400">
      {status || 'Unknown'}
    </span>
  )
}

export default function JobPostings() {
  const { profile } = useAuthStore()
  const [postings, setPostings] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingPosting, setEditingPosting] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchPostings = async () => {
    try {
      setLoading(true)
      setError(null)
      const filters = {}
      if (statusFilter) filters.status = statusFilter
      if (departmentFilter) filters.department = departmentFilter
      const data = await jobPostingsService.getJobPostings(null, filters)
      setPostings(data || [])
    } catch (err) {
      console.error('Failed to fetch job postings:', err)
      setError(err.message || 'Failed to load job postings')
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const data = await jobPostingsService.getDepartments()
      setDepartments(data || [])
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }

  useEffect(() => {
    fetchPostings()
    fetchDepartments()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPostings()
    }, 300)
    return () => clearTimeout(timer)
  }, [statusFilter, departmentFilter])

  const handlePublish = async (posting) => {
    try {
      setActionLoading(true)
      await jobPostingsService.updateJobPosting(posting.id, { status: 'open' })
      await fetchPostings()
    } catch (err) {
      alert(err.message || 'Failed to publish posting')
    } finally {
      setActionLoading(false)
    }
  }

  const handleClose = async (posting) => {
    if (!window.confirm(`Close the posting "${posting.title}"? It will no longer accept applications.`)) return
    try {
      setActionLoading(true)
      await jobPostingsService.updateJobPosting(posting.id, { status: 'closed' })
      await fetchPostings()
    } catch (err) {
      alert(err.message || 'Failed to close posting')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (posting) => {
    if (!window.confirm(`Delete "${posting.title}"? This action cannot be undone.`)) return
    try {
      setActionLoading(true)
      await jobPostingsService.deleteJobPosting(posting.id)
      await fetchPostings()
    } catch (err) {
      alert(err.message || 'Failed to delete posting')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEdit = (posting) => {
    setEditingPosting(posting)
    setShowModal(true)
  }

  // Compute stats
  const totalPostings = postings.length
  const openPostings = postings.filter(p => p.status === 'open').length
  const closedPostings = postings.filter(p => p.status === 'closed').length
  const totalApplications = postings.reduce((sum, p) => sum + (p.applications_count || 0), 0)

  if (loading && postings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-subtext-light dark:text-subtext-dark">Loading job postings...</p>
        </div>
      </div>
    )
  }

  if (error && postings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <span className="material-icons-outlined text-red-500 text-4xl mb-4">error_outline</span>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => fetchPostings()}
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
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Job Postings</h1>
          <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">
            Manage your open positions and hiring pipeline
          </p>
        </div>
        <button
          onClick={() => { setEditingPosting(null); setShowModal(true) }}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium shadow-md shadow-blue-500/20 transition flex items-center gap-2"
        >
          <span className="material-icons-outlined text-lg">post_add</span>
          Create Posting
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
              <span className="material-icons-outlined">work</span>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-text-light dark:text-text-dark">{totalPostings}</h3>
          <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">Total Postings</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400">
              <span className="material-icons-outlined">check_circle</span>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-text-light dark:text-text-dark">{openPostings}</h3>
          <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">Open</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400">
              <span className="material-icons-outlined">cancel</span>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-text-light dark:text-text-dark">{closedPostings}</h3>
          <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">Closed</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400">
              <span className="material-icons-outlined">assignment</span>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-text-light dark:text-text-dark">{totalApplications}</h3>
          <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">Total Applications</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-border-dark shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2 text-subtext-light dark:text-subtext-dark">
            <span className="material-icons-outlined text-lg">filter_list</span>
            <span className="text-sm font-medium">Filters:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full md:w-48 border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Applications</th>
                <th className="px-6 py-4">Posted</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark text-sm">
              {postings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <span className="material-icons-outlined text-gray-400 text-4xl mb-2">work</span>
                      <p className="text-subtext-light dark:text-subtext-dark">No job postings yet</p>
                      <button
                        onClick={() => { setEditingPosting(null); setShowModal(true) }}
                        className="text-primary text-sm mt-2 hover:underline"
                      >
                        Create your first posting
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                postings.map((posting) => (
                  <tr key={posting.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-text-light dark:text-text-dark">{posting.title}</div>
                      {posting.is_remote && (
                        <span className="text-xs text-blue-600 dark:text-blue-400">Remote</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-text-light dark:text-text-dark">{posting.department || '-'}</td>
                    <td className="px-6 py-4 text-text-light dark:text-text-dark">{posting.location || '-'}</td>
                    <td className="px-6 py-4 text-text-light dark:text-text-dark">
                      {EMPLOYMENT_TYPE_OPTIONS.find(t => t.value === posting.employment_type)?.label || posting.employment_type || '-'}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(posting.status)}</td>
                    <td className="px-6 py-4 text-text-light dark:text-text-dark">{posting.applications_count || 0}</td>
                    <td className="px-6 py-4 text-subtext-light dark:text-subtext-dark">
                      {posting.created_at ? new Date(posting.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(posting)}
                          className="p-1.5 text-subtext-light dark:text-subtext-dark hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                          title="Edit"
                        >
                          <span className="material-icons-outlined text-base">edit</span>
                        </button>
                        {posting.status === 'draft' && (
                          <button
                            onClick={() => handlePublish(posting)}
                            disabled={actionLoading}
                            className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition"
                            title="Publish"
                          >
                            <span className="material-icons-outlined text-base">check_circle</span>
                          </button>
                        )}
                        {posting.status === 'open' && (
                          <button
                            onClick={() => handleClose(posting)}
                            disabled={actionLoading}
                            className="p-1.5 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition"
                            title="Close"
                          >
                            <span className="material-icons-outlined text-base">cancel</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(posting)}
                          disabled={actionLoading}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                          title="Delete"
                        >
                          <span className="material-icons-outlined text-base">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <JobPostingModal
          posting={editingPosting}
          departments={departments}
          onClose={() => { setShowModal(false); setEditingPosting(null) }}
          onSuccess={() => {
            setShowModal(false)
            setEditingPosting(null)
            fetchPostings()
            fetchDepartments()
          }}
        />
      )}
    </div>
  )
}

function JobPostingModal({ posting, departments, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: posting?.title || '',
    description: posting?.description || '',
    department: posting?.department || '',
    location: posting?.location || '',
    employmentType: posting?.employment_type || 'full_time',
    salaryMin: posting?.salary_min || '',
    salaryMax: posting?.salary_max || '',
    salaryCurrency: posting?.salary_currency || 'USD',
    requirements: posting?.requirements || '',
    isRemote: posting?.is_remote || false,
    status: posting?.status || 'draft'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }
    if (!formData.description.trim()) {
      setError('Description is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const payload = {
        title: formData.title,
        description: formData.description,
        department: formData.department || null,
        location: formData.location || null,
        employmentType: formData.employmentType,
        salaryMin: formData.salaryMin ? parseFloat(formData.salaryMin) : null,
        salaryMax: formData.salaryMax ? parseFloat(formData.salaryMax) : null,
        salaryCurrency: formData.salaryCurrency,
        requirements: formData.requirements || null,
        isRemote: formData.isRemote,
        status: formData.status
      }

      if (posting) {
        await jobPostingsService.updateJobPosting(posting.id, payload)
      } else {
        await jobPostingsService.createJobPosting(payload)
      }
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to save job posting')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">
              {posting ? 'Edit Job Posting' : 'Create Job Posting'}
            </h2>
            <p className="text-sm text-subtext-light dark:text-subtext-dark">
              {posting ? 'Update the posting details' : 'Fill in the details for a new position'}
            </p>
          </div>
          <button onClick={onClose} className="text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Senior Software Engineer"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              rows={4}
              placeholder="Describe the role, responsibilities, and what you're looking for..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Engineering"
                list="jp-departments"
              />
              <datalist id="jp-departments">
                {departments.map(dept => (
                  <option key={dept} value={dept} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Kathmandu, Nepal"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Employment Type</label>
              <select
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {EMPLOYMENT_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Salary Range</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={formData.salaryMin}
                onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                className="flex-1 border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Min"
              />
              <span className="self-center text-subtext-light dark:text-subtext-dark">-</span>
              <input
                type="number"
                value={formData.salaryMax}
                onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                className="flex-1 border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Max"
              />
              <select
                value={formData.salaryCurrency}
                onChange={(e) => setFormData({ ...formData, salaryCurrency: e.target.value })}
                className="w-24 border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CURRENCY_OPTIONS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Requirements</label>
            <textarea
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              placeholder="List the key requirements for this role..."
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isRemote: !formData.isRemote })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.isRemote ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.isRemote ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
            <span className="text-sm text-text-light dark:text-text-dark">Remote position</span>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <span className="material-icons-outlined text-lg">check</span>
                {posting ? 'Save Changes' : 'Create Posting'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
