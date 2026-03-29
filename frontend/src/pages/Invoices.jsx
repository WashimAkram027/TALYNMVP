import { useState, useEffect } from 'react'
import { payrollService } from '../services/payrollService'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
]

const RUN_STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  processing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
}

export default function Invoices() {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedRunId, setExpandedRunId] = useState(null)
  const [expandedRunData, setExpandedRunData] = useState(null)
  const [expandLoading, setExpandLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

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
      setError(err.message || 'Failed to load payslips')
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

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '-'
    return `NPR ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatPeriod = (start, end) => {
    if (!start) return '-'
    const s = new Date(start)
    const e = end ? new Date(end) : null
    const startStr = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endStr = e ? e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
    return e ? `${startStr} - ${endStr}` : startStr
  }

  // Stats derived from runs
  const totalPayslips = runs.reduce((sum, r) => sum + (r.employee_count || 0), 0)
  const completedRuns = runs.filter(r => r.status === 'completed').length
  const totalPaid = runs.filter(r => r.status === 'completed').reduce((sum, r) => sum + Number(r.total_amount || 0), 0)
  const pendingRuns = runs.filter(r => r.status === 'draft' || r.status === 'processing').length

  // Filter items in expanded view by search
  const getFilteredItems = (items) => {
    if (!searchTerm || !items) return items
    const term = searchTerm.toLowerCase()
    return items.filter(item => {
      const name = item.member?.profile?.full_name
        || `${item.member?.first_name || ''} ${item.member?.last_name || ''}`.trim()
        || item.member_name || ''
      return name.toLowerCase().includes(term)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-subtext-light dark:text-subtext-dark">Loading payslips...</p>
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
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Payslips</h1>
          <p className="text-subtext-light dark:text-subtext-dark">Employee pay records by payroll period</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-4 rounded-xl">
          <p className="text-xs text-subtext-light dark:text-subtext-dark uppercase font-semibold">Payroll Periods</p>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark mt-1">{runs.length}</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-4 rounded-xl">
          <p className="text-xs text-subtext-light dark:text-subtext-dark uppercase font-semibold">Completed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{completedRuns}</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-4 rounded-xl">
          <p className="text-xs text-subtext-light dark:text-subtext-dark uppercase font-semibold">Total Paid</p>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark mt-1">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-4 rounded-xl">
          <p className="text-xs text-subtext-light dark:text-subtext-dark uppercase font-semibold">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{pendingRuns}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-4 rounded-xl mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-subtext-light dark:text-subtext-dark text-lg">search</span>
            <input
              type="text"
              placeholder="Search by employee name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg pl-10 pr-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Payroll Runs with Employee Payslips */}
      {runs.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-8 text-center">
          <span className="material-icons-outlined text-4xl text-subtext-light dark:text-subtext-dark mb-2">receipt_long</span>
          <p className="text-subtext-light dark:text-subtext-dark">No payslips found</p>
        </div>
      ) : (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-border-light dark:divide-border-dark">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Pay Period</th>
                <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Pay Date</th>
                <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Total Amount</th>
                <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Status</th>
                <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {runs.map((run) => (
                <>
                  <tr key={run.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer" onClick={() => handleExpandRun(run.id)}>
                    <td className="px-6 py-4 text-sm font-medium text-text-light dark:text-text-dark">
                      {formatPeriod(run.pay_period_start, run.pay_period_end)}
                    </td>
                    <td className="px-6 py-4 text-sm text-subtext-light dark:text-subtext-dark">
                      {formatDate(run.pay_date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-text-light dark:text-text-dark">
                      {formatCurrency(run.total_amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${RUN_STATUS_STYLES[run.status] || RUN_STATUS_STYLES.draft}`}>
                        {run.status?.charAt(0).toUpperCase() + run.status?.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleExpandRun(run.id) }}
                        className="text-primary hover:text-primary-hover flex items-center gap-1 text-xs font-medium"
                      >
                        <span className="material-icons-outlined text-lg">
                          {expandedRunId === run.id ? 'expand_less' : 'expand_more'}
                        </span>
                        {expandedRunId === run.id ? 'Hide' : 'View'} Payslips
                      </button>
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
                          <>
                            <div className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase mb-3">
                              Employee Payslips for {formatPeriod(run.pay_period_start, run.pay_period_end)}
                            </div>
                            <table className="w-full text-left">
                              <thead className="text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark bg-gray-100 dark:bg-gray-700/50">
                                <tr>
                                  <th className="px-4 py-2">Employee</th>
                                  <th className="px-4 py-2">Base Salary</th>
                                  <th className="px-4 py-2">Days</th>
                                  <th className="px-4 py-2">Leave</th>
                                  <th className="px-4 py-2">Deductions</th>
                                  <th className="px-4 py-2">Net Pay</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border-light dark:divide-border-dark text-sm">
                                {getFilteredItems(expandedRunData.items).map(item => (
                                  <tr key={item.id}>
                                    <td className="px-4 py-3 text-text-light dark:text-text-dark font-medium">
                                      {item.member?.profile?.full_name || `${item.member?.first_name || ''} ${item.member?.last_name || ''}`.trim() || item.member_name || item.member_id}
                                    </td>
                                    <td className="px-4 py-3 text-text-light dark:text-text-dark">{formatCurrency(item.base_salary)}</td>
                                    <td className="px-4 py-3 text-text-light dark:text-text-dark">
                                      {item.payable_days != null ? (
                                        <span>{item.payable_days}/{item.calendar_days || 30}</span>
                                      ) : <span className="text-subtext-light dark:text-subtext-dark">-</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                      {(item.paid_leave_days > 0 || item.unpaid_leave_days > 0) ? (
                                        <div>
                                          {item.paid_leave_days > 0 && <span className="text-green-600 dark:text-green-400">{item.paid_leave_days}d paid</span>}
                                          {item.paid_leave_days > 0 && item.unpaid_leave_days > 0 && <span className="text-subtext-light dark:text-subtext-dark"> / </span>}
                                          {item.unpaid_leave_days > 0 && <span className="text-red-500 dark:text-red-400">{item.unpaid_leave_days}d unpaid</span>}
                                        </div>
                                      ) : <span className="text-subtext-light dark:text-subtext-dark">-</span>}
                                    </td>
                                    <td className="px-4 py-3 text-text-light dark:text-text-dark">{formatCurrency(item.deductions)}</td>
                                    <td className="px-4 py-3 text-text-light dark:text-text-dark font-semibold">{formatCurrency(item.net_pay)}</td>
                                  </tr>
                                ))}
                                {getFilteredItems(expandedRunData.items).length === 0 && (
                                  <tr>
                                    <td colSpan={6} className="px-4 py-3 text-center text-subtext-light dark:text-subtext-dark">
                                      No employees match your search
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </>
                        ) : (
                          <p className="text-center text-subtext-light dark:text-subtext-dark py-2">No payslips in this period</p>
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
  )
}
