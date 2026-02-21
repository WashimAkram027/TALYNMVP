import { useState, useEffect } from 'react'
import { payrollService } from '../services/payrollService'
import { useAuthStore } from '../store/authStore'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
]

export default function Payroll() {
  const { profile, organization } = useAuthStore()

  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedRunId, setExpandedRunId] = useState(null)
  const [expandedRunData, setExpandedRunData] = useState(null)
  const [expandLoading, setExpandLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchRuns = async () => {
    try {
      setLoading(true)
      setError(null)
      const filters = {}
      if (statusFilter) filters.status = statusFilter
      const data = await payrollService.getPayrollRuns(null, filters)
      setRuns(data || [])
    } catch (err) {
      console.error('Failed to fetch payroll runs:', err)
      setError(err.message || 'Failed to load payroll runs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRuns()
  }, [statusFilter])

  const handleExpandRun = async (runId) => {
    if (expandedRunId === runId) {
      setExpandedRunId(null)
      setExpandedRunData(null)
      return
    }
    try {
      setExpandLoading(true)
      setExpandedRunId(runId)
      const data = await payrollService.getPayrollRun(runId)
      setExpandedRunData(data)
    } catch (err) {
      console.error('Failed to fetch run details:', err)
    } finally {
      setExpandLoading(false)
    }
  }

  const handleStatusChange = async (runId, newStatus) => {
    const labels = { processing: 'process', completed: 'complete', cancelled: 'cancel' }
    if (!confirm(`Are you sure you want to ${labels[newStatus] || newStatus} this payroll run?`)) return
    try {
      setActionLoading(true)
      await payrollService.updatePayrollRunStatus(runId, newStatus)
      await fetchRuns()
      if (expandedRunId === runId) {
        const data = await payrollService.getPayrollRun(runId)
        setExpandedRunData(data)
      }
    } catch (err) {
      alert(err.message || 'Failed to update status')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (runId) => {
    if (!confirm('Are you sure you want to delete this draft payroll run?')) return
    try {
      setActionLoading(true)
      await payrollService.deletePayrollRun(runId)
      if (expandedRunId === runId) {
        setExpandedRunId(null)
        setExpandedRunData(null)
      }
      await fetchRuns()
    } catch (err) {
      alert(err.message || 'Failed to delete payroll run')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300',
      processing: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '-'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  // Stats
  const totalRuns = runs.length
  const completedThisMonth = runs.filter(r => {
    if (r.status !== 'completed') return false
    const now = new Date()
    const payDate = new Date(r.pay_date)
    return payDate.getMonth() === now.getMonth() && payDate.getFullYear() === now.getFullYear()
  }).length
  const draftRuns = runs.filter(r => r.status === 'draft').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-subtext-light dark:text-subtext-dark">Loading payroll...</p>
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
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Payroll</h1>
          <p className="text-subtext-light dark:text-subtext-dark">Manage payroll runs and payments</p>
        </div>
        {profile?.role === 'employer' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover text-sm font-medium flex items-center gap-2"
          >
            <span className="material-icons-outlined text-lg">add</span>
            Create Run
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
              <span className="material-icons-outlined">payments</span>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-text-light dark:text-text-dark">{totalRuns}</h3>
          <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">Total Runs</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400">
              <span className="material-icons-outlined">check</span>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-text-light dark:text-text-dark">{completedThisMonth}</h3>
          <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">Completed This Month</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center text-orange-600 dark:text-orange-400">
              <span className="material-icons-outlined">edit</span>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-text-light dark:text-text-dark">{draftRuns}</h3>
          <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">Draft Runs</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Payroll Runs Table */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
        <div className="p-6 border-b border-border-light dark:border-border-dark">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Payroll Runs</h2>
        </div>
        {runs.length === 0 ? (
          <div className="p-8 text-center">
            <span className="material-icons-outlined text-4xl text-subtext-light dark:text-subtext-dark mb-2">payments</span>
            <p className="text-subtext-light dark:text-subtext-dark">No payroll runs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">
                <tr>
                  <th className="px-6 py-4">Period</th>
                  <th className="px-6 py-4">Pay Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark text-sm">
                {runs.map(run => (
                  <>
                    <tr key={run.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer" onClick={() => handleExpandRun(run.id)}>
                      <td className="px-6 py-4 text-text-light dark:text-text-dark">
                        {formatDate(run.pay_period_start)} - {formatDate(run.pay_period_end)}
                      </td>
                      <td className="px-6 py-4 text-text-light dark:text-text-dark">{formatDate(run.pay_date)}</td>
                      <td className="px-6 py-4">{getStatusBadge(run.status)}</td>
                      <td className="px-6 py-4 text-text-light dark:text-text-dark font-medium">{formatCurrency(run.total_amount)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {run.status === 'draft' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(run.id, 'processing')}
                                disabled={actionLoading}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-medium"
                              >
                                Process
                              </button>
                              <button
                                onClick={() => handleDelete(run.id)}
                                disabled={actionLoading}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs font-medium"
                              >
                                Delete
                              </button>
                            </>
                          )}
                          {run.status === 'processing' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(run.id, 'completed')}
                                disabled={actionLoading}
                                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-xs font-medium"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => handleStatusChange(run.id, 'cancelled')}
                                disabled={actionLoading}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs font-medium"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleExpandRun(run.id)}
                            className="text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark"
                          >
                            <span className="material-icons-outlined text-lg">
                              {expandedRunId === run.id ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRunId === run.id && (
                      <tr key={`${run.id}-detail`}>
                        <td colSpan={5} className="px-6 py-4 bg-gray-50 dark:bg-gray-800/30">
                          {expandLoading ? (
                            <div className="text-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                            </div>
                          ) : expandedRunData?.items?.length > 0 ? (
                            <table className="w-full text-left text-xs">
                              <thead className="text-subtext-light dark:text-subtext-dark uppercase">
                                <tr>
                                  <th className="px-4 py-2">Employee</th>
                                  <th className="px-4 py-2">Base Salary</th>
                                  <th className="px-4 py-2">Bonus</th>
                                  <th className="px-4 py-2">Deductions</th>
                                  <th className="px-4 py-2">Tax</th>
                                  <th className="px-4 py-2">Net Pay</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                                {expandedRunData.items.map(item => (
                                  <tr key={item.id}>
                                    <td className="px-4 py-2 text-text-light dark:text-text-dark">{item.member_name || item.member_id}</td>
                                    <td className="px-4 py-2 text-text-light dark:text-text-dark">{formatCurrency(item.base_salary)}</td>
                                    <td className="px-4 py-2 text-text-light dark:text-text-dark">{formatCurrency(item.bonus)}</td>
                                    <td className="px-4 py-2 text-text-light dark:text-text-dark">{formatCurrency(item.deductions)}</td>
                                    <td className="px-4 py-2 text-text-light dark:text-text-dark">{formatCurrency(item.tax)}</td>
                                    <td className="px-4 py-2 text-text-light dark:text-text-dark font-medium">{formatCurrency(item.net_pay)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-center text-subtext-light dark:text-subtext-dark py-2">No payroll items in this run</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePayrollRunModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchRuns()
          }}
        />
      )}
    </div>
  )
}

function CreatePayrollRunModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    payPeriodStart: '',
    payPeriodEnd: '',
    payDate: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.payPeriodStart || !formData.payPeriodEnd || !formData.payDate) {
      setError('All fields are required')
      return
    }
    try {
      setLoading(true)
      setError(null)
      await payrollService.createPayrollRun(null, formData.payPeriodStart, formData.payPeriodEnd, formData.payDate)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to create payroll run')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Create Payroll Run</h2>
          <button onClick={onClose} className="text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Pay Period Start</label>
            <input
              type="date"
              value={formData.payPeriodStart}
              onChange={(e) => setFormData({ ...formData, payPeriodStart: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Pay Period End</label>
            <input
              type="date"
              value={formData.payPeriodEnd}
              onChange={(e) => setFormData({ ...formData, payPeriodEnd: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Pay Date</label>
            <input
              type="date"
              value={formData.payDate}
              onChange={(e) => setFormData({ ...formData, payDate: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
