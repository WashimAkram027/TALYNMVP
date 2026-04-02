import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { leaveService } from '../services/leaveService'
import { membersService } from '../services/membersService'
import { useAuthStore } from '../store/authStore'

const TABS = [
  { id: 'requests', label: 'Requests', icon: 'event_available' },
  { id: 'leave_types', label: 'Leave Types', icon: 'gavel' },
  { id: 'balances', label: 'Balances', icon: 'account_balance' }
]

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' }
]

const LEAVE_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'sick_leave', label: 'Sick Leave' },
  { value: 'home_leave', label: 'Home Leave' },
  { value: 'maternity_leave', label: 'Maternity Leave' },
  { value: 'paternity_leave', label: 'Paternity Leave' },
  { value: 'mourning_leave', label: 'Mourning Leave' },
  { value: 'special_leave', label: 'Special Leave' },
  { value: 'compensatory_leave', label: 'Compensatory Leave' }
]

const LEAVE_TYPES_INFO = [
  { code: 'sick_leave', name: 'Sick Leave', nameNe: 'बिरामी बिदा', days: '12/yr', accrual: '1/BS month', carryForward: 'Yes (max 45)', encashable: 'Yes', section: '§44', color: 'blue' },
  { code: 'home_leave', name: 'Home Leave', nameNe: 'घर बिदा', days: '18/yr', accrual: '1.5/BS month', carryForward: 'No', encashable: 'No', section: '§43', color: 'green' },
  { code: 'maternity_leave', name: 'Maternity Leave', nameNe: 'प्रसुति बिदा', days: '98 total', accrual: 'Event', carryForward: 'No', encashable: 'No', section: '§45', color: 'pink' },
  { code: 'paternity_leave', name: 'Paternity Leave', nameNe: 'पितृत्व बिदा', days: '15', accrual: 'Event', carryForward: 'No', encashable: 'No', section: '§45', color: 'indigo' },
  { code: 'mourning_leave', name: 'Mourning Leave', nameNe: 'किरिया बिदा', days: '13', accrual: 'Event', carryForward: 'No', encashable: 'No', section: '§46', color: 'gray' },
  { code: 'special_leave', name: 'Special Leave', nameNe: 'विशेष बिदा', days: '30/yr', accrual: 'On request', carryForward: 'No', encashable: 'No', section: '§47', color: 'amber' },
  { code: 'compensatory_leave', name: 'Compensatory Leave', nameNe: 'प्रतिपूरक बिदा', days: 'Earned', accrual: 'Per holiday worked', carryForward: 'No', encashable: 'No', section: '§42', color: 'purple' }
]

function formatLeaveType(code) {
  return code?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || code
}

function statusBadge(status) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  )
}

export default function TimeOff() {
  const { profile } = useAuthStore()
  const isEmployer = profile?.role === 'employer'

  const [activeTab, setActiveTab] = useState('requests')
  const [requests, setRequests] = useState([])
  const [members, setMembers] = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  const [balances, setBalances] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // Modal
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestForm, setRequestForm] = useState({
    memberId: '', leaveTypeCode: 'sick_leave', startDate: '', endDate: '', reason: '',
    // Event-specific
    expectedDeliveryDate: '', childBirthDate: '', deceasedName: '', relationship: '', deathDate: ''
  })
  const [submitting, setSubmitting] = useState(false)

  // Rejection modal
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  // Fetch requests
  const fetchRequests = async () => {
    try {
      setLoading(true)
      const filters = {}
      if (statusFilter) filters.status = statusFilter
      if (typeFilter) filters.leaveType = typeFilter
      const data = await leaveService.listRequests(filters)
      setRequests(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch members (for employer)
  const fetchMembers = async () => {
    try {
      const data = await membersService.getMembers({})
      setMembers((data || []).filter(m => m.member_role !== 'owner'))
    } catch { /* ignore */ }
  }

  // Fetch balance for selected member
  const fetchBalance = async (memberId) => {
    if (!memberId) { setBalances(null); return }
    try {
      const data = await leaveService.getBalanceSummary(memberId)
      setBalances(data)
    } catch {
      setBalances(null)
    }
  }

  useEffect(() => {
    fetchRequests()
    if (isEmployer) fetchMembers()
  }, [statusFilter, typeFilter])

  const handleApprove = async (id) => {
    try {
      await leaveService.approveRequest(id)
      toast.success('Leave request approved')
      fetchRequests()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleReject = (req) => {
    setRejectModal(req)
    setRejectReason('')
  }

  const submitReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return
    try {
      setRejecting(true)
      await leaveService.rejectRequest(rejectModal.id, rejectReason.trim())
      toast.success('Leave request rejected')
      setRejectModal(null)
      setRejectReason('')
      fetchRequests()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRejecting(false)
    }
  }

  const handleSubmitRequest = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const type = requestForm.leaveTypeCode
      if (type === 'maternity_leave') {
        await leaveService.createMaternityRequest({
          memberId: requestForm.memberId || undefined,
          expectedDeliveryDate: requestForm.expectedDeliveryDate,
          leaveStartDate: requestForm.startDate,
          coverWithAccumulated: true
        })
      } else if (type === 'paternity_leave') {
        await leaveService.createPaternityRequest({
          memberId: requestForm.memberId || undefined,
          childBirthDate: requestForm.childBirthDate,
          leaveStartDate: requestForm.startDate
        })
      } else if (type === 'mourning_leave') {
        await leaveService.createMourningRequest({
          memberId: requestForm.memberId || undefined,
          deceasedName: requestForm.deceasedName,
          relationship: requestForm.relationship,
          deathDate: requestForm.deathDate,
          leaveStartDate: requestForm.startDate
        })
      } else if (type === 'special_leave') {
        await leaveService.createSpecialRequest({
          memberId: requestForm.memberId || undefined,
          startDate: requestForm.startDate,
          endDate: requestForm.endDate,
          reason: requestForm.reason
        })
      } else {
        await leaveService.createRequest({
          memberId: requestForm.memberId || undefined,
          leaveTypeCode: type,
          startDate: requestForm.startDate,
          endDate: requestForm.endDate,
          reason: requestForm.reason
        })
      }
      setShowRequestModal(false)
      toast.success('Leave request submitted')
      fetchRequests()
      setRequestForm({ memberId: '', leaveTypeCode: 'sick_leave', startDate: '', endDate: '', reason: '', expectedDeliveryDate: '', childBirthDate: '', deceasedName: '', relationship: '', deathDate: '' })
    } catch (err) {
      setError(err.message || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  const getEmployeeName = (req) => {
    const emp = req.employee
    if (!emp) return 'Unknown'
    return emp.profile?.full_name
      || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
      || emp.invitation_email
      || 'Unknown'
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Time Off</h1>
          <p className="text-subtext-light dark:text-subtext-dark text-sm">Nepal Labour Act 2074 Leave Management</p>
        </div>
        <button
          onClick={() => setShowRequestModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover transition flex items-center gap-2"
        >
          <span className="material-icons-outlined text-lg">add</span>
          New Request
        </button>
      </div>

      {/* Feedback */}

      {/* Tabs */}
      <div className="flex border-b border-border-light dark:border-border-dark mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-subtext-light dark:text-subtext-dark hover:text-text-light'}`}
          >
            <span className="material-icons-outlined text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab: Requests ─── */}
      {activeTab === 'requests' && (
        <div>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-sm bg-surface-light dark:bg-gray-800 text-text-light dark:text-text-dark">
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-sm bg-surface-light dark:bg-gray-800 text-text-light dark:text-text-dark">
              {LEAVE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-subtext-light dark:text-subtext-dark">No leave requests found</div>
          ) : (
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-subtext-light uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-subtext-light uppercase">Leave Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-subtext-light uppercase">Dates</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-subtext-light uppercase">Days</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-subtext-light uppercase">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-subtext-light uppercase">Status</th>
                    {isEmployer && <th className="px-4 py-3 text-left text-xs font-medium text-subtext-light uppercase">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {requests.map(req => (
                    <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-text-light dark:text-text-dark font-medium">{getEmployeeName(req)}</td>
                      <td className="px-4 py-3 text-subtext-light dark:text-subtext-dark">{formatLeaveType(req.leave_type_code)}</td>
                      <td className="px-4 py-3 text-subtext-light dark:text-subtext-dark">
                        {new Date(req.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {req.start_date !== req.end_date && ` — ${new Date(req.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-text-light dark:text-text-dark font-medium">{req.total_days}d</span>
                        {parseFloat(req.unpaid_days) > 0 && (
                          <span className="text-xs text-red-500 ml-1">({req.unpaid_days} unpaid)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-subtext-light dark:text-subtext-dark text-xs max-w-[200px] truncate" title={req.reason || ''}>
                        {req.reason || '—'}
                        {req.status === 'rejected' && req.rejection_reason && (
                          <p className="text-red-500 mt-0.5 truncate" title={req.rejection_reason}>Rejected: {req.rejection_reason}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">{statusBadge(req.status)}</td>
                      {isEmployer && (
                        <td className="px-4 py-3">
                          {req.status === 'pending' && (
                            <div className="flex gap-2">
                              <button onClick={() => handleApprove(req.id)} className="text-green-600 hover:text-green-800 text-xs font-medium">Approve</button>
                              <button onClick={() => handleReject(req)} className="text-red-600 hover:text-red-800 text-xs font-medium">Reject</button>
                            </div>
                          )}
                          {req.medical_certificate_required && (
                            <span className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                              <span className="material-icons-outlined text-xs">assignment</span>
                              Med cert required
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Leave Types ─── */}
      {activeTab === 'leave_types' && (
        <div>
          <p className="text-sm text-subtext-light dark:text-subtext-dark mb-4">
            Statutory leave entitlements under Nepal Labour Act 2074. These are mandatory and cannot be modified.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LEAVE_TYPES_INFO.map(lt => (
              <div key={lt.code} className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-text-light dark:text-text-dark">{lt.name}</h3>
                    <p className="text-xs text-subtext-light dark:text-subtext-dark">{lt.nameNe} &middot; Labour Act {lt.section}</p>
                  </div>
                  <span className="text-lg font-bold text-primary">{lt.days}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-subtext-light dark:text-subtext-dark block">Accrual</span>
                    <span className="font-medium text-text-light dark:text-text-dark">{lt.accrual}</span>
                  </div>
                  <div>
                    <span className="text-subtext-light dark:text-subtext-dark block">Carry Forward</span>
                    <span className="font-medium text-text-light dark:text-text-dark">{lt.carryForward}</span>
                  </div>
                  <div>
                    <span className="text-subtext-light dark:text-subtext-dark block">Encashable</span>
                    <span className="font-medium text-text-light dark:text-text-dark">{lt.encashable}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Tab: Balances ─── */}
      {activeTab === 'balances' && (
        <div>
          {isEmployer && (
            <div className="mb-4">
              <select
                value={selectedMember || ''}
                onChange={e => { setSelectedMember(e.target.value); fetchBalance(e.target.value) }}
                className="border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-sm bg-surface-light dark:bg-gray-800 text-text-light dark:text-text-dark min-w-[250px]"
              >
                <option value="">Select employee...</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.profile?.full_name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.invitation_email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {balances ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sick Leave */}
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                    <span className="material-icons-outlined text-lg">sick</span>
                  </div>
                  <h3 className="font-semibold text-text-light dark:text-text-dark">Sick Leave</h3>
                </div>
                <div className="text-3xl font-bold text-text-light dark:text-text-dark mb-1">
                  {balances.sickLeave?.available ?? 0} <span className="text-lg font-normal text-subtext-light">/ 12 days</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <span className="block text-subtext-light">Carry Fwd</span>
                    <span className="font-semibold text-text-light dark:text-text-dark">{balances.sickLeave?.carryForward ?? 0}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <span className="block text-subtext-light">Accrued</span>
                    <span className="font-semibold text-text-light dark:text-text-dark">{balances.sickLeave?.currentYearAccrued ?? 0}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <span className="block text-subtext-light">Taken</span>
                    <span className="font-semibold text-text-light dark:text-text-dark">{balances.sickLeave?.taken ?? 0}</span>
                  </div>
                </div>
                <p className="text-xs text-subtext-light mt-3">FY {balances.sickLeave?.fiscalYear} &middot; Max accumulation: 45 days</p>
              </div>

              {/* Home Leave */}
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                    <span className="material-icons-outlined text-lg">home</span>
                  </div>
                  <h3 className="font-semibold text-text-light dark:text-text-dark">Home Leave</h3>
                </div>
                <div className="text-3xl font-bold text-text-light dark:text-text-dark mb-1">
                  {balances.homeLeave?.available ?? 0} <span className="text-lg font-normal text-subtext-light">/ 18 days</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <span className="block text-subtext-light">Carry Fwd</span>
                    <span className="font-semibold text-text-light dark:text-text-dark">0</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <span className="block text-subtext-light">Accrued</span>
                    <span className="font-semibold text-text-light dark:text-text-dark">{balances.homeLeave?.currentYearAccrued ?? 0}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <span className="block text-subtext-light">Taken</span>
                    <span className="font-semibold text-text-light dark:text-text-dark">{balances.homeLeave?.taken ?? 0}</span>
                  </div>
                </div>
                <p className="text-xs text-subtext-light mt-3">FY {balances.homeLeave?.fiscalYear} &middot; No carry-forward</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-subtext-light dark:text-subtext-dark">
              {isEmployer ? 'Select an employee to view their leave balance' : 'No balance data available'}
            </div>
          )}
        </div>
      )}

      {/* ─── New Request Modal ─── */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-md mx-4 border border-border-light dark:border-border-dark">
            <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center">
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">New Leave Request</h2>
              <button onClick={() => { setShowRequestModal(false); setError(null) }} className="text-subtext-light hover:text-text-light">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmitRequest} className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}

              {/* Employee selector (employer only) */}
              {isEmployer && (
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Employee</label>
                  <select value={requestForm.memberId} onChange={e => setRequestForm({ ...requestForm, memberId: e.target.value })} className="w-full border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-sm bg-surface-light dark:bg-gray-800 text-text-light dark:text-text-dark" required>
                    <option value="">Select employee...</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.profile?.full_name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.invitation_email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Leave Type */}
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Leave Type</label>
                <select value={requestForm.leaveTypeCode} onChange={e => setRequestForm({ ...requestForm, leaveTypeCode: e.target.value })} className="w-full border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-sm bg-surface-light dark:bg-gray-800 text-text-light dark:text-text-dark">
                  {LEAVE_TYPE_OPTIONS.filter(o => o.value).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Conditional fields based on leave type */}
              {requestForm.leaveTypeCode === 'maternity_leave' && (
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Expected Delivery Date *</label>
                  <input type="date" required value={requestForm.expectedDeliveryDate} onChange={e => setRequestForm({ ...requestForm, expectedDeliveryDate: e.target.value })} className="w-full border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-sm bg-surface-light dark:bg-gray-800 text-text-light dark:text-text-dark" />
                </div>
              )}

              {requestForm.leaveTypeCode === 'paternity_leave' && (
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Child Birth Date *</label>
                  <input type="date" required value={requestForm.childBirthDate} onChange={e => setRequestForm({ ...requestForm, childBirthDate: e.target.value })} className="w-full border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-sm bg-surface-light dark:bg-gray-800 text-text-light dark:text-text-dark" />
                </div>
              )}

              {requestForm.leaveTypeCode === 'mourning_leave' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Deceased Name *</label>
                      <input type="text" required value={requestForm.deceasedName} onChange={e => setRequestForm({ ...requestForm, deceasedName: e.target.value })} className="w-full border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-sm bg-surface-light dark:bg-gray-800 text-text-light dark:text-text-dark" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Relationship *</label>
                      <select required value={requestForm.relationship} onChange={e => setRequestForm({ ...requestForm, relationship: e.target.value })} className="w-full border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-sm bg-surface-light dark:bg-gray-800 text-text-light dark:text-text-dark">
                        <option value="">Select...</option>
                        <option value="parent">Parent</option>
                        <option value="spouse">Spouse</option>
                        <option value="child">Child</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Date of Death *</label>
                    <input type="date" required value={requestForm.deathDate} onChange={e => setRequestForm({ ...requestForm, deathDate: e.target.value })} className="w-full border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-sm bg-surface-light dark:bg-gray-800 text-text-light dark:text-text-dark" />
                  </div>
                </>
              )}

              {/* Start Date (all types) */}
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                  {['maternity_leave', 'paternity_leave', 'mourning_leave'].includes(requestForm.leaveTypeCode) ? 'Leave Start Date *' : 'Start Date *'}
                </label>
                <input type="date" required value={requestForm.startDate} onChange={e => setRequestForm({ ...requestForm, startDate: e.target.value })} className="w-full border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-sm bg-surface-light dark:bg-gray-800 text-text-light dark:text-text-dark" />
              </div>

              {/* End Date (only for sick, home, special, compensatory) */}
              {!['maternity_leave', 'paternity_leave', 'mourning_leave'].includes(requestForm.leaveTypeCode) && (
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">End Date *</label>
                  <input type="date" required value={requestForm.endDate} onChange={e => setRequestForm({ ...requestForm, endDate: e.target.value })} className="w-full border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-sm bg-surface-light dark:bg-gray-800 text-text-light dark:text-text-dark" />
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Reason</label>
                <textarea value={requestForm.reason} onChange={e => setRequestForm({ ...requestForm, reason: e.target.value })} rows={2} className="w-full border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-sm bg-surface-light dark:bg-gray-800 text-text-light dark:text-text-dark resize-none" placeholder="Optional reason..." />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowRequestModal(false); setError(null) }} className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover disabled:opacity-50 transition">
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-border-light dark:border-border-dark">
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Reject Leave Request</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-sm">
                <p className="font-medium text-text-light dark:text-text-dark">{getEmployeeName(rejectModal)}</p>
                <p className="text-subtext-light dark:text-subtext-dark">
                  {formatLeaveType(rejectModal.leave_type_code)} &middot;{' '}
                  {new Date(rejectModal.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {rejectModal.start_date !== rejectModal.end_date && ` — ${new Date(rejectModal.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                  {' '}&middot; {rejectModal.total_days}d
                </p>
                {rejectModal.reason && (
                  <p className="text-subtext-light dark:text-subtext-dark mt-1">Employee's reason: {rejectModal.reason}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Reason for rejection</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-sm bg-surface-light dark:bg-gray-800 text-text-light dark:text-text-dark resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="Please provide a reason for rejecting this request..."
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => { setRejectModal(null); setRejectReason('') }}
                  className="px-4 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReject}
                  disabled={!rejectReason.trim() || rejecting}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {rejecting ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
