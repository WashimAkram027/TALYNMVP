import { useState, useEffect } from 'react'
import { benefitsService } from '../services/benefitsService'
import { membersService } from '../services/membersService'
import { useAuthStore } from '../store/authStore'

export default function Benefits() {
  const { profile } = useAuthStore()
  const isEmployer = profile?.role === 'employer'

  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedPlanId, setExpandedPlanId] = useState(null)
  const [enrollees, setEnrollees] = useState([])
  const [enrolleesLoading, setEnrolleesLoading] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [enrollPlanId, setEnrollPlanId] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchPlans = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await benefitsService.getPlans(null, false)
      setPlans(data || [])
    } catch (err) {
      console.error('Failed to fetch plans:', err)
      setError(err.message || 'Failed to load benefits plans')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const handleExpandPlan = async (planId) => {
    if (expandedPlanId === planId) {
      setExpandedPlanId(null)
      setEnrollees([])
      return
    }
    try {
      setEnrolleesLoading(true)
      setExpandedPlanId(planId)
      const data = await benefitsService.getPlanEnrollments(planId)
      setEnrollees(data || [])
    } catch (err) {
      console.error('Failed to fetch enrollees:', err)
    } finally {
      setEnrolleesLoading(false)
    }
  }

  const handleDeletePlan = async (planId) => {
    if (!confirm('Are you sure you want to delete this plan?')) return
    try {
      setActionLoading(true)
      await benefitsService.deletePlan(planId)
      if (expandedPlanId === planId) {
        setExpandedPlanId(null)
        setEnrollees([])
      }
      await fetchPlans()
    } catch (err) {
      alert(err.message || 'Failed to delete plan')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelEnrollment = async (enrollmentId) => {
    if (!confirm('Are you sure you want to cancel this enrollment?')) return
    try {
      setActionLoading(true)
      await benefitsService.cancelEnrollment(enrollmentId)
      if (expandedPlanId) {
        const data = await benefitsService.getPlanEnrollments(expandedPlanId)
        setEnrollees(data || [])
      }
    } catch (err) {
      alert(err.message || 'Failed to cancel enrollment')
    } finally {
      setActionLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '-'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      inactive: 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300',
      cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.active}`}>
        {(status || 'active').charAt(0).toUpperCase() + (status || 'active').slice(1)}
      </span>
    )
  }

  // Stats
  const activePlans = plans.filter(p => p.status === 'active' || !p.status).length
  const totalPlans = plans.length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-subtext-light dark:text-subtext-dark">Loading benefits...</p>
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
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Benefits</h1>
          <p className="text-subtext-light dark:text-subtext-dark">Manage employee benefit plans and enrollments</p>
        </div>
        {isEmployer && (
          <button
            onClick={() => { setEditingPlan(null); setShowPlanModal(true) }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover text-sm font-medium flex items-center gap-2"
          >
            <span className="material-icons-outlined text-lg">add</span>
            Add Plan
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
              <span className="material-icons-outlined">health_and_safety</span>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-text-light dark:text-text-dark">{totalPlans}</h3>
          <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">Total Plans</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400">
              <span className="material-icons-outlined">check</span>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-text-light dark:text-text-dark">{activePlans}</h3>
          <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">Active Plans</p>
        </div>
      </div>

      {/* Plans Table */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
        <div className="p-6 border-b border-border-light dark:border-border-dark">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Benefit Plans</h2>
        </div>
        {plans.length === 0 ? (
          <div className="p-8 text-center">
            <span className="material-icons-outlined text-4xl text-subtext-light dark:text-subtext-dark mb-2">health_and_safety</span>
            <p className="text-subtext-light dark:text-subtext-dark">No benefit plans found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Provider</th>
                  <th className="px-6 py-4">Premium</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark text-sm">
                {plans.map(plan => (
                  <>
                    <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer" onClick={() => handleExpandPlan(plan.id)}>
                      <td className="px-6 py-4 text-text-light dark:text-text-dark font-medium">{plan.name}</td>
                      <td className="px-6 py-4 text-text-light dark:text-text-dark">{plan.type || '-'}</td>
                      <td className="px-6 py-4 text-text-light dark:text-text-dark">{plan.provider || '-'}</td>
                      <td className="px-6 py-4 text-text-light dark:text-text-dark">{formatCurrency(plan.premium)}</td>
                      <td className="px-6 py-4">{getStatusBadge(plan.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {isEmployer && (
                            <>
                              <button
                                onClick={() => { setEnrollPlanId(plan.id); setShowEnrollModal(true) }}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-xs font-medium"
                              >
                                Enroll
                              </button>
                              <button
                                onClick={() => { setEditingPlan(plan); setShowPlanModal(true) }}
                                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 text-xs font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeletePlan(plan.id)}
                                disabled={actionLoading}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 text-xs font-medium"
                              >
                                Delete
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleExpandPlan(plan.id)}
                            className="text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark"
                          >
                            <span className="material-icons-outlined text-lg">
                              {expandedPlanId === plan.id ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedPlanId === plan.id && (
                      <tr key={`${plan.id}-enrollees`}>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50 dark:bg-gray-800/30">
                          <h4 className="text-sm font-semibold text-text-light dark:text-text-dark mb-3">Enrollees</h4>
                          {enrolleesLoading ? (
                            <div className="text-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                            </div>
                          ) : enrollees.length > 0 ? (
                            <table className="w-full text-left text-xs">
                              <thead className="text-subtext-light dark:text-subtext-dark uppercase">
                                <tr>
                                  <th className="px-4 py-2">Member</th>
                                  <th className="px-4 py-2">Coverage Start</th>
                                  <th className="px-4 py-2">Coverage End</th>
                                  <th className="px-4 py-2">Status</th>
                                  {isEmployer && <th className="px-4 py-2">Actions</th>}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                                {enrollees.map(e => (
                                  <tr key={e.id}>
                                    <td className="px-4 py-2 text-text-light dark:text-text-dark">{e.member_name || e.member_id}</td>
                                    <td className="px-4 py-2 text-text-light dark:text-text-dark">{formatDate(e.coverage_start_date)}</td>
                                    <td className="px-4 py-2 text-text-light dark:text-text-dark">{formatDate(e.coverage_end_date)}</td>
                                    <td className="px-4 py-2">{getStatusBadge(e.status)}</td>
                                    {isEmployer && (
                                      <td className="px-4 py-2">
                                        {e.status !== 'cancelled' && (
                                          <button
                                            onClick={() => handleCancelEnrollment(e.id)}
                                            disabled={actionLoading}
                                            className="text-red-600 dark:text-red-400 hover:text-red-800 text-xs font-medium"
                                          >
                                            Cancel
                                          </button>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-center text-subtext-light dark:text-subtext-dark py-2">No enrollees in this plan</p>
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

      {/* Plan Modal */}
      {showPlanModal && (
        <PlanModal
          plan={editingPlan}
          onClose={() => { setShowPlanModal(false); setEditingPlan(null) }}
          onSuccess={() => {
            setShowPlanModal(false)
            setEditingPlan(null)
            fetchPlans()
          }}
        />
      )}

      {/* Enroll Modal */}
      {showEnrollModal && (
        <EnrollModal
          planId={enrollPlanId}
          onClose={() => { setShowEnrollModal(false); setEnrollPlanId(null) }}
          onSuccess={async () => {
            setShowEnrollModal(false)
            setEnrollPlanId(null)
            if (expandedPlanId) {
              const data = await benefitsService.getPlanEnrollments(expandedPlanId)
              setEnrollees(data || [])
            }
          }}
        />
      )}
    </div>
  )
}

function PlanModal({ plan, onClose, onSuccess }) {
  const isEdit = !!plan
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    type: plan?.type || '',
    provider: plan?.provider || '',
    premium: plan?.premium ?? '',
    description: plan?.description || '',
    status: plan?.status || 'active'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name) {
      setError('Plan name is required')
      return
    }
    try {
      setLoading(true)
      setError(null)
      const payload = {
        name: formData.name,
        type: formData.type || null,
        provider: formData.provider || null,
        premium: formData.premium ? Number(formData.premium) : null,
        description: formData.description || null,
        status: formData.status
      }
      if (isEdit) {
        await benefitsService.updatePlan(plan.id, payload)
      } else {
        await benefitsService.createPlan(payload)
      }
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to save plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{isEdit ? 'Edit Plan' : 'Add Plan'}</h2>
          <button onClick={onClose} className="text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Plan Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Health Insurance"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select type</option>
                <option value="health">Health</option>
                <option value="dental">Dental</option>
                <option value="vision">Vision</option>
                <option value="life">Life Insurance</option>
                <option value="retirement">Retirement</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Provider</label>
            <input
              type="text"
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Blue Cross"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Monthly Premium</label>
            <input
              type="number"
              step="0.01"
              value={formData.premium}
              onChange={(e) => setFormData({ ...formData, premium: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              placeholder="Plan details..."
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50">
              {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Plan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EnrollModal({ planId, onClose, onSuccess }) {
  const [members, setMembers] = useState([])
  const [memberId, setMemberId] = useState('')
  const [coverageStartDate, setCoverageStartDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [membersLoading, setMembersLoading] = useState(true)

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const data = await membersService.getMembers({ status: 'active' })
        setMembers(data || [])
      } catch (err) {
        console.error('Failed to fetch members:', err)
      } finally {
        setMembersLoading(false)
      }
    }
    fetchMembers()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!memberId || !coverageStartDate) {
      setError('Member and coverage start date are required')
      return
    }
    try {
      setLoading(true)
      setError(null)
      await benefitsService.enrollMember(memberId, planId, coverageStartDate)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to enroll member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Enroll Member</h2>
          <button onClick={onClose} className="text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Employee</label>
            {membersLoading ? (
              <p className="text-sm text-subtext-light dark:text-subtext-dark">Loading members...</p>
            ) : (
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Select employee</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.profile?.full_name || m.profile?.email || m.id}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Coverage Start Date</label>
            <input
              type="date"
              value={coverageStartDate}
              onChange={(e) => setCoverageStartDate(e.target.value)}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50">
              {loading ? 'Enrolling...' : 'Enroll'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
