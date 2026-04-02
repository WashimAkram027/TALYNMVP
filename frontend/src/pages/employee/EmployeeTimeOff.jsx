import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { leaveService } from '../../services/leaveService'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'

function formatLeaveType(code) {
  return code?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || code
}

function statusBadge(status) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-600'
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || ''}`}>{status?.charAt(0).toUpperCase() + status?.slice(1)}</span>
}

export default function EmployeeTimeOff() {
  const { profile, membership } = useAuthStore()
  const { notifications, dismiss: dismissNotification } = useNotificationStore()
  const rejectedLeaveNotifs = notifications.filter(n =>
    n.type === 'leave_rejected' && !n.dismissed_at
  )
  const [balances, setBalances] = useState(null)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ leaveTypeCode: 'sick_leave', startDate: '', endDate: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)

  const memberId = membership?.id

  useEffect(() => {
    if (!memberId) { setLoading(false); return }
    const fetchData = async () => {
      try {
        setLoading(true)
        const [bal, reqs] = await Promise.all([
          leaveService.getBalanceSummary(memberId),
          leaveService.listRequests({ memberId })
        ])
        setBalances(bal)
        setRequests(reqs || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [memberId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await leaveService.createRequest({ memberId, leaveTypeCode: form.leaveTypeCode, startDate: form.startDate, endDate: form.endDate, reason: form.reason })
      setShowModal(false)
      setForm({ leaveTypeCode: 'sick_leave', startDate: '', endDate: '', reason: '' })
      toast.success('Leave request submitted for approval')
      const [bal, reqs] = await Promise.all([
        leaveService.getBalanceSummary(memberId),
        leaveService.listRequests({ memberId })
      ])
      setBalances(bal)
      setRequests(reqs || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Time Off</h1>
          <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">Your leave balances and requests</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover transition flex items-center gap-2">
          <span className="material-icons-outlined text-lg">add</span>
          Request Time Off
        </button>
      </header>

      {/* Rejected leave alerts (from notification store) */}
      {rejectedLeaveNotifs.map(notif => (
        <div key={notif.id} className="mb-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
          <span className="material-icons-outlined text-red-500 mt-0.5">event_busy</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              {notif.title}
            </p>
            {notif.message && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{notif.message}</p>
            )}
          </div>
          <button
            onClick={() => dismissNotification(notif.id)}
            className="text-red-400 hover:text-red-600 transition shrink-0"
            title="Dismiss"
          >
            <span className="material-icons-outlined text-lg">close</span>
          </button>
        </div>
      ))}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
              <span className="material-icons-outlined">sick</span>
            </div>
            <div>
              <h3 className="font-semibold text-text-light dark:text-text-dark">Sick Leave</h3>
              <p className="text-xs text-subtext-light">बिरामी बिदा</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-bold text-text-light dark:text-text-dark">{balances?.sickLeave?.available ?? '—'}</span>
            <span className="text-lg text-subtext-light">/ 12 days</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(((balances?.sickLeave?.available || 0) / 12) * 100, 100)}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-2"><div className="text-subtext-light">Carry Fwd</div><div className="font-semibold">{balances?.sickLeave?.carryForward ?? 0}</div></div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-2"><div className="text-subtext-light">Accrued</div><div className="font-semibold">{balances?.sickLeave?.currentYearAccrued ?? 0}</div></div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-2"><div className="text-subtext-light">Taken</div><div className="font-semibold">{balances?.sickLeave?.taken ?? 0}</div></div>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
              <span className="material-icons-outlined">home</span>
            </div>
            <div>
              <h3 className="font-semibold text-text-light dark:text-text-dark">Home Leave</h3>
              <p className="text-xs text-subtext-light">घर बिदा</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-bold text-text-light dark:text-text-dark">{balances?.homeLeave?.available ?? '—'}</span>
            <span className="text-lg text-subtext-light">/ 18 days</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(((balances?.homeLeave?.available || 0) / 18) * 100, 100)}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-2"><div className="text-subtext-light">Carry Fwd</div><div className="font-semibold">0</div></div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-2"><div className="text-subtext-light">Accrued</div><div className="font-semibold">{balances?.homeLeave?.currentYearAccrued ?? 0}</div></div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-2"><div className="text-subtext-light">Taken</div><div className="font-semibold">{balances?.homeLeave?.taken ?? 0}</div></div>
          </div>
        </div>
      </div>

      {/* Request History */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark">
          <h3 className="font-semibold text-text-light dark:text-text-dark">Your Leave Requests</h3>
        </div>
        {requests.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-subtext-light uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-subtext-light uppercase">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-subtext-light uppercase">Days</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-subtext-light uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {requests.map(r => (
                <tr key={r.id}>
                  <td className="px-6 py-4 text-text-light dark:text-text-dark">{formatLeaveType(r.leave_type_code)}</td>
                  <td className="px-6 py-4 text-subtext-light">
                    {new Date(r.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {r.start_date !== r.end_date && ` — ${new Date(r.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-text-light dark:text-text-dark">{r.total_days}d</span>
                    {parseFloat(r.unpaid_days) > 0 && <span className="text-xs text-red-500 ml-1">({r.unpaid_days} unpaid)</span>}
                  </td>
                  <td className="px-6 py-4">
                    {statusBadge(r.status)}
                    {r.status === 'rejected' && r.rejection_reason && (
                      <p className="text-xs text-red-500 mt-1 max-w-[200px]">{r.rejection_reason}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12 text-subtext-light">No leave requests yet. Click "Request Time Off" to submit your first request.</div>
        )}
      </div>

      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-md mx-4 border border-border-light dark:border-border-dark">
            <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center">
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Request Time Off</h2>
              <button onClick={() => { setShowModal(false); setError(null) }} className="text-subtext-light hover:text-text-light"><span className="material-icons-outlined">close</span></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Leave Type</label>
                <select value={form.leaveTypeCode} onChange={e => setForm({ ...form, leaveTypeCode: e.target.value })} className="w-full border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-sm bg-surface-light dark:bg-gray-800 text-text-light dark:text-text-dark">
                  <option value="sick_leave">Sick Leave (बिरामी बिदा)</option>
                  <option value="home_leave">Home Leave (घर बिदा)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Start Date *</label>
                  <input type="date" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-sm bg-surface-light dark:bg-gray-800 text-text-light dark:text-text-dark" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">End Date *</label>
                  <input type="date" required value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="w-full border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-sm bg-surface-light dark:bg-gray-800 text-text-light dark:text-text-dark" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Reason</label>
                <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={2} className="w-full border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-sm bg-surface-light dark:bg-gray-800 text-text-light dark:text-text-dark resize-none" placeholder="Optional..." />
              </div>
              {balances && (
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-400">
                  Available: {form.leaveTypeCode === 'sick_leave' ? `${balances.sickLeave?.available ?? 0} sick days` : `${balances.homeLeave?.available ?? 0} home days`}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setError(null) }} className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
