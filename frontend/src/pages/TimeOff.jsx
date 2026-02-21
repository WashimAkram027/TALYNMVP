import { useState, useEffect } from 'react'
import { timeOffService } from '../services/timeOffService'
import { membersService } from '../services/membersService'
import { useAuthStore } from '../store/authStore'

const TABS = [
  { id: 'requests', label: 'Requests', icon: 'event_available' },
  { id: 'policies', label: 'Policies', icon: 'description' },
  { id: 'balances', label: 'Balances', icon: 'account_balance' }
]

const REQUEST_STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' }
]

export default function TimeOff() {
  const { profile } = useAuthStore()
  const isEmployer = profile?.role === 'employer'

  const [activeTab, setActiveTab] = useState('requests')

  // Requests state
  const [requests, setRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [requestsError, setRequestsError] = useState(null)
  const [requestStatusFilter, setRequestStatusFilter] = useState('')
  const [showRequestModal, setShowRequestModal] = useState(false)

  // Policies state
  const [policies, setPolicies] = useState([])
  const [policiesLoading, setPoliciesLoading] = useState(false)
  const [policiesError, setPoliciesError] = useState(null)
  const [showPolicyModal, setShowPolicyModal] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState(null)

  // Balances state
  const [members, setMembers] = useState([])
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [balances, setBalances] = useState([])
  const [balancesLoading, setBalancesLoading] = useState(false)

  const [actionLoading, setActionLoading] = useState(false)

  const fetchRequests = async () => {
    try {
      setRequestsLoading(true)
      setRequestsError(null)
      const filters = {}
      if (requestStatusFilter) filters.status = requestStatusFilter
      const data = await timeOffService.getRequests(filters)
      setRequests(data || [])
    } catch (err) {
      console.error('Failed to fetch requests:', err)
      setRequestsError(err.message || 'Failed to load time off requests')
    } finally {
      setRequestsLoading(false)
    }
  }

  const fetchPolicies = async () => {
    try {
      setPoliciesLoading(true)
      setPoliciesError(null)
      const data = await timeOffService.getPolicies()
      setPolicies(data || [])
    } catch (err) {
      console.error('Failed to fetch policies:', err)
      setPoliciesError(err.message || 'Failed to load policies')
    } finally {
      setPoliciesLoading(false)
    }
  }

  const fetchMembers = async () => {
    try {
      const data = await membersService.getMembers({ status: 'active' })
      setMembers(data || [])
    } catch (err) {
      console.error('Failed to fetch members:', err)
    }
  }

  const fetchBalances = async (memberId) => {
    if (!memberId) { setBalances([]); return }
    try {
      setBalancesLoading(true)
      const data = await timeOffService.getBalances(memberId)
      setBalances(data || [])
    } catch (err) {
      console.error('Failed to fetch balances:', err)
    } finally {
      setBalancesLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
    fetchPolicies()
    if (isEmployer) fetchMembers()
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [requestStatusFilter])

  useEffect(() => {
    if (selectedMemberId) fetchBalances(selectedMemberId)
  }, [selectedMemberId])

  const handleReview = async (requestId, approved) => {
    const action = approved ? 'approve' : 'reject'
    if (!confirm(`Are you sure you want to ${action} this request?`)) return
    try {
      setActionLoading(true)
      await timeOffService.reviewRequest(requestId, approved)
      await fetchRequests()
    } catch (err) {
      alert(err.message || `Failed to ${action} request`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelRequest = async (requestId) => {
    if (!confirm('Are you sure you want to cancel this request?')) return
    try {
      setActionLoading(true)
      await timeOffService.cancelRequest(requestId)
      await fetchRequests()
    } catch (err) {
      alert(err.message || 'Failed to cancel request')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeletePolicy = async (policyId) => {
    if (!confirm('Are you sure you want to delete this policy?')) return
    try {
      setActionLoading(true)
      await timeOffService.deletePolicy(policyId)
      await fetchPolicies()
    } catch (err) {
      alert(err.message || 'Failed to delete policy')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      approved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      cancelled: 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
    }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const calcDays = (start, end) => {
    if (!start || !end) return '-'
    const diff = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)
    return Math.max(1, Math.ceil(diff) + 1)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Time Off</h1>
          <p className="text-subtext-light dark:text-subtext-dark">Manage leave requests and policies</p>
        </div>
        {activeTab === 'requests' && (
          <button
            onClick={() => setShowRequestModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover text-sm font-medium flex items-center gap-2"
          >
            <span className="material-icons-outlined text-lg">add</span>
            New Request
          </button>
        )}
        {activeTab === 'policies' && isEmployer && (
          <button
            onClick={() => { setEditingPolicy(null); setShowPolicyModal(true) }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover text-sm font-medium flex items-center gap-2"
          >
            <span className="material-icons-outlined text-lg">add</span>
            Add Policy
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-light dark:bg-surface-dark rounded-lg p-1 border border-border-light dark:border-border-dark w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-primary text-white'
                : 'text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark'
            }`}
          >
            <span className="material-icons-outlined text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <>
          <div className="mb-4">
            <select
              value={requestStatusFilter}
              onChange={(e) => setRequestStatusFilter(e.target.value)}
              className="border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {REQUEST_STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
            <div className="p-6 border-b border-border-light dark:border-border-dark">
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Time Off Requests</h2>
            </div>
            {requestsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-subtext-light dark:text-subtext-dark">Loading requests...</p>
              </div>
            ) : requestsError ? (
              <div className="p-8 text-center text-red-600 dark:text-red-400">{requestsError}</div>
            ) : requests.length === 0 ? (
              <div className="p-8 text-center">
                <span className="material-icons-outlined text-4xl text-subtext-light dark:text-subtext-dark mb-2">event_available</span>
                <p className="text-subtext-light dark:text-subtext-dark">No time off requests found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">
                    <tr>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Start</th>
                      <th className="px-6 py-4">End</th>
                      <th className="px-6 py-4">Days</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark text-sm">
                    {requests.map(req => (
                      <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                        <td className="px-6 py-4 text-text-light dark:text-text-dark">{req.member_name || req.member_id || '-'}</td>
                        <td className="px-6 py-4 text-text-light dark:text-text-dark">{req.policy_name || req.policy_id || '-'}</td>
                        <td className="px-6 py-4 text-text-light dark:text-text-dark">{formatDate(req.start_date)}</td>
                        <td className="px-6 py-4 text-text-light dark:text-text-dark">{formatDate(req.end_date)}</td>
                        <td className="px-6 py-4 text-text-light dark:text-text-dark">{calcDays(req.start_date, req.end_date)}</td>
                        <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {req.status === 'pending' && isEmployer && (
                              <>
                                <button
                                  onClick={() => handleReview(req.id, true)}
                                  disabled={actionLoading}
                                  className="text-green-600 dark:text-green-400 hover:text-green-800 text-xs font-medium"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReview(req.id, false)}
                                  disabled={actionLoading}
                                  className="text-red-600 dark:text-red-400 hover:text-red-800 text-xs font-medium"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {req.status === 'pending' && (
                              <button
                                onClick={() => handleCancelRequest(req.id)}
                                disabled={actionLoading}
                                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 text-xs font-medium"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Policies Tab */}
      {activeTab === 'policies' && (
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
          <div className="p-6 border-b border-border-light dark:border-border-dark">
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Time Off Policies</h2>
          </div>
          {policiesLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-subtext-light dark:text-subtext-dark">Loading policies...</p>
            </div>
          ) : policiesError ? (
            <div className="p-8 text-center text-red-600 dark:text-red-400">{policiesError}</div>
          ) : policies.length === 0 ? (
            <div className="p-8 text-center">
              <span className="material-icons-outlined text-4xl text-subtext-light dark:text-subtext-dark mb-2">description</span>
              <p className="text-subtext-light dark:text-subtext-dark">No policies configured</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Days / Year</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Accrual Rate</th>
                    <th className="px-6 py-4">Max Carryover</th>
                    {isEmployer && <th className="px-6 py-4">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark text-sm">
                  {policies.map(policy => (
                    <tr key={policy.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="px-6 py-4 text-text-light dark:text-text-dark font-medium">{policy.name}</td>
                      <td className="px-6 py-4 text-text-light dark:text-text-dark">{policy.days_per_year ?? '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          policy.is_paid !== false
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                        }`}>
                          {policy.is_paid !== false ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-text-light dark:text-text-dark">{policy.accrual_rate ?? '-'}</td>
                      <td className="px-6 py-4 text-text-light dark:text-text-dark">{policy.max_carryover ?? '-'}</td>
                      {isEmployer && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setEditingPolicy(policy); setShowPolicyModal(true) }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-xs font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePolicy(policy.id)}
                              disabled={actionLoading}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 text-xs font-medium"
                            >
                              Delete
                            </button>
                          </div>
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

      {/* Balances Tab */}
      {activeTab === 'balances' && (
        <div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Select Employee</label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary w-full max-w-xs"
            >
              <option value="">-- Select Employee --</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.profile?.full_name || m.profile?.email || m.id}</option>
              ))}
            </select>
          </div>

          {balancesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-subtext-light dark:text-subtext-dark">Loading balances...</p>
            </div>
          ) : !selectedMemberId ? (
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-8 text-center">
              <span className="material-icons-outlined text-4xl text-subtext-light dark:text-subtext-dark mb-2">account_balance</span>
              <p className="text-subtext-light dark:text-subtext-dark">Select an employee to view their time off balances</p>
            </div>
          ) : balances.length === 0 ? (
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-8 text-center">
              <p className="text-subtext-light dark:text-subtext-dark">No balance records found for this employee</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {balances.map(bal => (
                <div key={bal.id} className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <span className="material-icons-outlined">calendar_today</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">{bal.policy_name || 'Policy'}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-subtext-light dark:text-subtext-dark">Total Entitled</span>
                      <span className="text-text-light dark:text-text-dark font-medium">{bal.total_days ?? '-'} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtext-light dark:text-subtext-dark">Used</span>
                      <span className="text-text-light dark:text-text-dark font-medium">{bal.used_days ?? 0} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtext-light dark:text-subtext-dark">Remaining</span>
                      <span className="text-green-600 dark:text-green-400 font-bold">{bal.remaining_days ?? '-'} days</span>
                    </div>
                    {bal.carried_over != null && bal.carried_over > 0 && (
                      <div className="flex justify-between">
                        <span className="text-subtext-light dark:text-subtext-dark">Carried Over</span>
                        <span className="text-text-light dark:text-text-dark font-medium">{bal.carried_over} days</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <CreateRequestModal
          policies={policies}
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            setShowRequestModal(false)
            fetchRequests()
          }}
        />
      )}

      {/* Policy Modal */}
      {showPolicyModal && (
        <PolicyModal
          policy={editingPolicy}
          onClose={() => { setShowPolicyModal(false); setEditingPolicy(null) }}
          onSuccess={() => {
            setShowPolicyModal(false)
            setEditingPolicy(null)
            fetchPolicies()
          }}
        />
      )}
    </div>
  )
}

function CreateRequestModal({ policies, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    policyId: '',
    startDate: '',
    endDate: '',
    reason: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.policyId || !formData.startDate || !formData.endDate) {
      setError('Policy, start date, and end date are required')
      return
    }
    try {
      setLoading(true)
      setError(null)
      await timeOffService.requestTimeOff(formData.policyId, formData.startDate, formData.endDate, formData.reason || null)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Request Time Off</h2>
          <button onClick={onClose} className="text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Leave Type</label>
            <select
              value={formData.policyId}
              onChange={(e) => setFormData({ ...formData, policyId: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">Select policy</option>
              {policies.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Reason</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              placeholder="Optional reason..."
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50">
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PolicyModal({ policy, onClose, onSuccess }) {
  const isEdit = !!policy
  const [formData, setFormData] = useState({
    name: policy?.name || '',
    days_per_year: policy?.days_per_year ?? '',
    is_paid: policy?.is_paid !== false,
    accrual_rate: policy?.accrual_rate ?? '',
    max_carryover: policy?.max_carryover ?? ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name) {
      setError('Policy name is required')
      return
    }
    try {
      setLoading(true)
      setError(null)
      const payload = {
        name: formData.name,
        days_per_year: formData.days_per_year ? Number(formData.days_per_year) : null,
        is_paid: formData.is_paid,
        accrual_rate: formData.accrual_rate ? Number(formData.accrual_rate) : null,
        max_carryover: formData.max_carryover ? Number(formData.max_carryover) : null
      }
      if (isEdit) {
        await timeOffService.updatePolicy(policy.id, payload)
      } else {
        await timeOffService.createPolicy(payload)
      }
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to save policy')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{isEdit ? 'Edit Policy' : 'Create Policy'}</h2>
          <button onClick={onClose} className="text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Policy Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Annual Leave"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Days Per Year</label>
              <input
                type="number"
                value={formData.days_per_year}
                onChange={(e) => setFormData({ ...formData, days_per_year: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Type</label>
              <select
                value={formData.is_paid ? 'paid' : 'unpaid'}
                onChange={(e) => setFormData({ ...formData, is_paid: e.target.value === 'paid' })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Accrual Rate</label>
              <input
                type="number"
                step="0.01"
                value={formData.accrual_rate}
                onChange={(e) => setFormData({ ...formData, accrual_rate: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. 1.25"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Max Carryover</label>
              <input
                type="number"
                value={formData.max_carryover}
                onChange={(e) => setFormData({ ...formData, max_carryover: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                min="0"
                placeholder="e.g. 5"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50">
              {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Policy')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
