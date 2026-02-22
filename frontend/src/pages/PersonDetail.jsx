import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { membersService } from '../services/membersService'
import { StatusBadge, formatStartDate } from '../utils/statusUtils'

const ROLE_OPTIONS = [
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

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatCurrency = (amount, currency = 'NPR') => {
  if (!amount) return 'Not set'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount)
  } catch {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }
}

const formatRole = (role) => {
  if (!role) return 'N/A'
  return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ')
}

const formatEmploymentType = (type) => {
  if (!type) return 'N/A'
  return type.split('_').map(segment =>
    segment.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-')
  ).join(' ')
}

export default function PersonDetail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const memberId = searchParams.get('id')

  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState(null)

  // Fetch member data
  const fetchMember = async () => {
    if (!memberId) {
      setError('No member ID provided')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await membersService.getMember(memberId)
      setMember(data)
    } catch (err) {
      console.error('Failed to fetch member:', err)
      setError(err.message || 'Failed to load member details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMember()
  }, [memberId])

  // Action handlers
  const handleActivate = () => {
    setConfirmModal({
      title: 'Activate Member',
      message: `Activate ${member.profile?.full_name || 'this member'}? They will become an active team member.`,
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          setActionLoading(true)
          await membersService.activateMember(memberId)
          await fetchMember()
        } catch (err) {
          console.error('Failed to activate:', err)
          alert(err.message || 'Failed to activate member')
        } finally {
          setActionLoading(false)
        }
      }
    })
  }

  const handleOffboard = () => {
    setConfirmModal({
      title: 'Offboard Member',
      message: `Offboard ${member.profile?.full_name || 'this member'}? This will remove their access to the organization.`,
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          setActionLoading(true)
          await membersService.offboardMember(memberId)
          await fetchMember()
        } catch (err) {
          console.error('Failed to offboard:', err)
          alert(err.message || 'Failed to offboard member')
        } finally {
          setActionLoading(false)
        }
      }
    })
  }

  const handleDelete = () => {
    setConfirmModal({
      title: 'Delete Invitation',
      message: `Delete invitation for ${member.profile?.full_name || 'this member'}? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          setActionLoading(true)
          await membersService.deleteMember(memberId)
          navigate('/people')
        } catch (err) {
          console.error('Failed to delete:', err)
          alert(err.message || 'Failed to delete member')
        } finally {
          setActionLoading(false)
        }
      }
    })
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-subtext-light dark:text-subtext-dark">Loading member details...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <span className="material-icons-outlined text-red-500 text-4xl mb-4">error_outline</span>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Link
            to="/people"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition inline-flex items-center gap-2"
          >
            <span className="material-icons-outlined text-lg">arrow_back</span>
            Back to Team
          </Link>
        </div>
      </div>
    )
  }

  if (!member) return null

  const profile = member.profile || {}
  const status = member.status?.toLowerCase()

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/people')}
        className="mb-4 inline-flex items-center gap-1 text-sm text-subtext-light dark:text-subtext-dark hover:text-primary transition"
      >
        <span className="material-icons-outlined text-lg">arrow_back</span>
        Back to Team
      </button>

      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-subtext-light dark:text-subtext-dark">
          <li>
            <Link to="/dashboard" className="hover:text-primary transition">Dashboard</Link>
          </li>
          <li><span className="material-icons-outlined text-base">chevron_right</span></li>
          <li>
            <Link to="/people" className="hover:text-primary transition">Team</Link>
          </li>
          <li><span className="material-icons-outlined text-base">chevron_right</span></li>
          <li className="text-text-light dark:text-text-dark font-medium">
            {profile.full_name || profile.email || 'Member Details'}
          </li>
        </ol>
      </nav>

      {/* Profile Header */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm mb-6">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="h-24 w-24 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-lg"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl border-4 border-white dark:border-gray-700 shadow-lg">
                  {profile.first_name?.charAt(0)?.toUpperCase() || profile.email?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
                    {profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unnamed Member'}
                  </h1>
                  <p className="text-subtext-light dark:text-subtext-dark mt-1">
                    {member.job_title || 'No job title'} {member.department ? `• ${member.department}` : ''}
                  </p>
                  <div className="mt-3">
                    <StatusBadge status={member.status} size="lg" />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowEditModal(true)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-icons-outlined text-lg">edit</span>
                    Edit
                  </button>

                  {(status === 'invited' || status === 'in_review') && (
                    <>
                      <button
                        onClick={handleActivate}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50"
                      >
                        <span className="material-icons-outlined text-lg">check_circle</span>
                        Activate
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={actionLoading}
                        className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition flex items-center gap-2 disabled:opacity-50"
                      >
                        <span className="material-icons-outlined text-lg">delete</span>
                        Delete
                      </button>
                    </>
                  )}

                  {status === 'active' && (
                    <button
                      onClick={handleOffboard}
                      disabled={actionLoading}
                      className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <span className="material-icons-outlined text-lg">person_remove</span>
                      Offboard
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-6">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
            <span className="material-icons-outlined text-primary">contact_mail</span>
            Contact Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase tracking-wide">Email</label>
              <p className="text-text-light dark:text-text-dark mt-1">{profile.email || 'N/A'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase tracking-wide">Phone</label>
              <p className="text-text-light dark:text-text-dark mt-1">{profile.phone || 'Not provided'}</p>
            </div>
            {profile.linkedin_url && (
              <div>
                <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase tracking-wide">LinkedIn</label>
                <p className="mt-1">
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <span className="material-icons-outlined text-sm">link</span>
                    View Profile
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Employment Details */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-6">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
            <span className="material-icons-outlined text-primary">work</span>
            Employment Details
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase tracking-wide">Role</label>
              <p className="text-text-light dark:text-text-dark mt-1">{formatRole(member.member_role)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase tracking-wide">Job Title</label>
              <p className="text-text-light dark:text-text-dark mt-1">{member.job_title || 'Not set'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase tracking-wide">Department</label>
              <p className="text-text-light dark:text-text-dark mt-1">{member.department || 'Not set'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase tracking-wide">Employment Type</label>
              <p className="text-text-light dark:text-text-dark mt-1">{formatEmploymentType(member.employment_type)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase tracking-wide">Start Date</label>
              <p className="text-text-light dark:text-text-dark mt-1">{formatStartDate(member.start_date)}</p>
            </div>
          </div>
        </div>

        {/* Compensation */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-6">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
            <span className="material-icons-outlined text-primary">payments</span>
            Compensation
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase tracking-wide">Salary</label>
              <p className="text-text-light dark:text-text-dark mt-1 text-xl font-semibold">
                {formatCurrency(member.salary_amount, member.salary_currency)}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase tracking-wide">Pay Frequency</label>
              <p className="text-text-light dark:text-text-dark mt-1">{formatEmploymentType(member.pay_frequency)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase tracking-wide">Currency</label>
              <p className="text-text-light dark:text-text-dark mt-1">{member.salary_currency || 'NPR'}</p>
            </div>
          </div>
        </div>

        {/* Status & Dates */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-6">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
            <span className="material-icons-outlined text-primary">schedule</span>
            Status & Timeline
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase tracking-wide">Status</label>
              <div className="mt-1"><StatusBadge status={member.status} size="lg" /></div>
            </div>
            <div>
              <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase tracking-wide">Invited On</label>
              <p className="text-text-light dark:text-text-dark mt-1">{formatDate(member.created_at)}</p>
            </div>
            {member.joined_at && (
              <div>
                <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase tracking-wide">Joined On</label>
                <p className="text-text-light dark:text-text-dark mt-1">{formatDate(member.joined_at)}</p>
              </div>
            )}
            {member.offboarded_at && (
              <div>
                <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase tracking-wide">Offboarded On</label>
                <p className="text-text-light dark:text-text-dark mt-1">{formatDate(member.offboarded_at)}</p>
              </div>
            )}
            {member.invited_by_profile && (
              <div>
                <label className="text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase tracking-wide">Invited By</label>
                <p className="text-text-light dark:text-text-dark mt-1">
                  {member.invited_by_profile.full_name || member.invited_by_profile.email || 'Unknown'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div className="mt-8">
        <Link
          to="/people"
          className="inline-flex items-center gap-2 text-subtext-light dark:text-subtext-dark hover:text-primary transition"
        >
          <span className="material-icons-outlined">arrow_back</span>
          Back to Team
        </Link>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditMemberModal
          member={member}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            fetchMember()
          }}
        />
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-border-light dark:border-border-dark">
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{confirmModal.title}</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-subtext-light dark:text-subtext-dark">{confirmModal.message}</p>
            </div>
            <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex justify-end space-x-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800"
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
function EditMemberModal({ member, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    memberRole: member.member_role || 'employee',
    jobTitle: member.job_title || '',
    department: member.department || '',
    employmentType: member.employment_type || 'full_time',
    salaryAmount: member.salary_amount || '',
    salaryCurrency: member.salary_currency || 'NPR',
    payFrequency: member.pay_frequency || 'monthly'
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
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Edit Team Member</h2>
            <p className="text-sm text-subtext-light dark:text-subtext-dark">
              {member.profile?.full_name || member.profile?.email}
            </p>
          </div>
          <button onClick={onClose} className="text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Role</label>
              <select
                value={formData.memberRole}
                onChange={(e) => setFormData({ ...formData, memberRole: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
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
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Job Title</label>
            <input
              type="text"
              value={formData.jobTitle}
              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Software Engineer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Department</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Engineering"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Salary Amount</label>
              <input
                type="number"
                value={formData.salaryAmount}
                onChange={(e) => setFormData({ ...formData, salaryAmount: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="50000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Pay Frequency</label>
              <select
                value={formData.payFrequency}
                onChange={(e) => setFormData({ ...formData, payFrequency: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
