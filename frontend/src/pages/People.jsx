import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { membersService } from '../services/membersService'
import { useAuthStore } from '../store/authStore'
import InviteMemberModal from '../components/features/InviteMemberModal'
import { StatusBadge, STATUS_FILTER_OPTIONS, formatStartDate } from '../utils/statusUtils'

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' },
  { value: 'contractor', label: 'Contractor' }
]

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' }
]

export default function People() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()

  const [members, setMembers] = useState([])
  const [departments, setDepartments] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('')

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)

  // Fetch members
  const fetchMembers = async () => {
    try {
      setLoading(true)
      setError(null)

      const filters = {}
      if (search) filters.search = search
      if (statusFilter) filters.status = statusFilter
      if (roleFilter) filters.memberRole = roleFilter
      if (departmentFilter) filters.department = departmentFilter
      if (employmentTypeFilter) filters.employmentType = employmentTypeFilter

      const data = await membersService.getMembers(filters)
      setMembers(data || [])
    } catch (err) {
      console.error('Failed to fetch members:', err)
      setError(err.message || 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const data = await membersService.getDepartments()
      setDepartments(data || [])
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }

  // Fetch stats
  const fetchStats = async () => {
    try {
      const data = await membersService.getMemberStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  useEffect(() => {
    fetchDepartments()
    fetchStats()
  }, [])

  // Debounced search and filter
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers()
    }, 300)
    return () => clearTimeout(timer)
  }, [search, statusFilter, roleFilter, departmentFilter, employmentTypeFilter])

  // Handle member actions
  const handleActivate = async (memberId) => {
    try {
      setActionLoading(true)
      await membersService.activateMember(memberId)
      await fetchMembers()
      await fetchStats()
    } catch (err) {
      alert(err.message || 'Failed to activate member')
    } finally {
      setActionLoading(false)
    }
  }

  const handleOffboard = (memberId) => {
    setConfirmModal({
      title: 'Offboard Member',
      message: 'Are you sure you want to offboard this member? They will lose access to the organization.',
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          setActionLoading(true)
          await membersService.offboardMember(memberId)
          await fetchMembers()
          await fetchStats()
        } catch (err) {
          alert(err.message || 'Failed to offboard member')
        } finally {
          setActionLoading(false)
        }
      }
    })
  }

  const handleDelete = (memberId) => {
    setConfirmModal({
      title: 'Remove Invitation',
      message: 'Are you sure you want to remove this invitation? This action cannot be undone.',
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          setActionLoading(true)
          await membersService.deleteMember(memberId)
          await fetchMembers()
          await fetchStats()
        } catch (err) {
          alert(err.message || 'Failed to delete member')
        } finally {
          setActionLoading(false)
        }
      }
    })
  }

  const handleResendInvite = async (memberId) => {
    try {
      setActionLoading(true)
      await membersService.resendInvitation(memberId)
      setFeedback({ type: 'success', message: 'Invitation resent successfully' })
      setTimeout(() => setFeedback(null), 3000)
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to resend invitation' })
      setTimeout(() => setFeedback(null), 3000)
    } finally {
      setActionLoading(false)
    }
  }

  const getRoleBadge = (role) => {
    const styles = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      manager: 'bg-indigo-100 text-indigo-800',
      employee: 'bg-gray-100 text-gray-800',
      contractor: 'bg-orange-100 text-orange-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[role] || styles.employee}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">People</h1>
          <p className="text-gray-600">Manage your organization members</p>
        </div>
        {profile?.role === 'employer' && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Invite Member
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Total Members</p>
            <p className="text-2xl font-bold">{stats.total || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-600">{stats.byStatus?.active || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Invited</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.byStatus?.invited || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Inactive</p>
            <p className="text-2xl font-bold text-red-600">{(stats.byStatus?.inactive || 0) + (stats.byStatus?.offboarded || 0)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search by name, email, or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_FILTER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ROLE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={employmentTypeFilter}
            onChange={(e) => setEmploymentTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Employment Types</option>
            {EMPLOYMENT_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Feedback Message */}
      {feedback && (
        <div className={`px-4 py-3 rounded-lg mb-6 ${feedback.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {feedback.message}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading members...</p>
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No members found</p>
          {profile?.role === 'employer' && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="mt-4 text-blue-600 hover:underline"
            >
              Invite your first team member
            </button>
          )}
        </div>
      ) : (
        /* Members Table */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        {member.profile?.avatar_url ? (
                          <img
                            src={member.profile.avatar_url}
                            alt=""
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <span className="text-gray-500 font-medium">
                            {member.profile?.first_name?.[0] || member.profile?.email?.[0]?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {member.profile?.full_name || member.profile?.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          {member.job_title || 'No title'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(member.member_role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.department || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatStartDate(member.start_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={member.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/people-info?id=${member.id}`)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View
                      </button>
                      {profile?.role === 'employer' && (
                        <>
                          {(member.status === 'invited' || member.status === 'in_review') && (
                            <>
                              <button
                                onClick={() => handleResendInvite(member.id)}
                                disabled={actionLoading}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Resend Invite
                              </button>
                              <button
                                onClick={() => handleActivate(member.id)}
                                disabled={actionLoading}
                                className="text-green-600 hover:text-green-800"
                              >
                                Activate
                              </button>
                              <button
                                onClick={() => handleDelete(member.id)}
                                disabled={actionLoading}
                                className="text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            </>
                          )}
                          {member.status === 'active' && member.member_role !== 'owner' && (
                            <button
                              onClick={() => handleOffboard(member.id)}
                              disabled={actionLoading}
                              className="text-red-600 hover:text-red-800"
                            >
                              Offboard
                            </button>
                          )}
                          {member.status !== 'offboarded' && member.status !== 'inactive' && (
                            <button
                              onClick={() => {
                                setSelectedMember(member)
                                setShowEditModal(true)
                              }}
                              className="text-gray-600 hover:text-gray-800"
                            >
                              Edit
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteMemberModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false)
            fetchMembers()
            fetchStats()
          }}
          departments={departments}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedMember && (
        <EditMemberModal
          member={selectedMember}
          onClose={() => {
            setShowEditModal(false)
            setSelectedMember(null)
          }}
          onSuccess={() => {
            setShowEditModal(false)
            setSelectedMember(null)
            fetchMembers()
          }}
          departments={departments}
        />
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">{confirmModal.title}</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-600">{confirmModal.message}</p>
            </div>
            <div className="px-6 py-4 border-t flex justify-end space-x-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// Edit Member Modal Component
function EditMemberModal({ member, onClose, onSuccess, departments }) {
  const [formData, setFormData] = useState({
    member_role: member.member_role || 'employee',
    job_title: member.job_title || '',
    department: member.department || '',
    employment_type: member.employment_type || 'full_time',
    salary_amount: member.salary_amount || '',
    salary_currency: member.salary_currency || 'NPR',
    pay_frequency: member.pay_frequency || 'monthly'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      setLoading(true)
      setError(null)
      await membersService.updateMember(member.id, formData)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to update member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Edit Member</h2>
          <p className="text-sm text-gray-500">{member.profile?.full_name || member.profile?.email}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={formData.member_role}
                onChange={(e) => setFormData({ ...formData, member_role: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={member.member_role === 'owner'}
              >
                {ROLE_OPTIONS.filter(r => r.value).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
              <select
                value={formData.employment_type}
                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {EMPLOYMENT_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
            <input
              type="text"
              value={formData.job_title}
              onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              list="departments-edit"
            />
            <datalist id="departments-edit">
              {departments.map(dept => (
                <option key={dept} value={dept} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salary Amount</label>
              <input
                type="number"
                value={formData.salary_amount}
                onChange={(e) => setFormData({ ...formData, salary_amount: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pay Frequency</label>
              <select
                value={formData.pay_frequency}
                onChange={(e) => setFormData({ ...formData, pay_frequency: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Monthly</option>
                <option value="bi-weekly">Bi-Weekly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
