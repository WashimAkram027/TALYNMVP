import { useState } from 'react'
import { membersService } from '../../services/membersService'

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

export default function InviteMemberModal({ onClose, onSuccess, departments = [] }) {
  const [formData, setFormData] = useState({
    email: '',
    memberRole: 'employee',
    jobTitle: '',
    department: '',
    employmentType: 'full_time',
    jobDescription: '',
    location: '',
    startDate: '',
    salaryAmount: '',
    salaryCurrency: 'NPR',
    payFrequency: 'monthly',
    probationPeriod: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.email) {
      setError('Email is required')
      return
    }
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const memberData = {
        email: formData.email,
        memberRole: formData.memberRole,
        jobTitle: formData.jobTitle,
        department: formData.department,
        employmentType: formData.employmentType,
        jobDescription: formData.jobDescription || null,
        location: formData.location || null,
        startDate: formData.startDate || null,
        salaryAmount: formData.salaryAmount ? parseFloat(formData.salaryAmount) : null,
        salaryCurrency: formData.salaryCurrency,
        payFrequency: formData.payFrequency,
        probationPeriod: formData.probationPeriod ? parseInt(formData.probationPeriod) : null
      }

      await membersService.inviteMember(memberData)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to invite member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col border border-border-light dark:border-border-dark">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Invite Team Member</h2>
            <p className="text-sm text-subtext-light dark:text-subtext-dark">Send an invitation to join your organization</p>
          </div>
          <button onClick={onClose} className="text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="team@company.com"
              required
            />
            <p className="text-xs text-subtext-light dark:text-subtext-dark mt-1">
              The employee must have an existing account with this email
            </p>
          </div>

          {/* Role + Employment Type */}
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

          {/* Job Title */}
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

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Department</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Engineering"
              list="invite-departments"
            />
            <datalist id="invite-departments">
              {departments.map(dept => (
                <option key={dept} value={dept} />
              ))}
            </datalist>
          </div>

          {/* Job Description */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Job Description</label>
            <textarea
              value={formData.jobDescription}
              onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
              rows={3}
              maxLength={1000}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Brief description of the role and responsibilities..."
            />
            <p className="text-xs text-subtext-light dark:text-subtext-dark mt-1">
              {formData.jobDescription.length}/1000 characters
            </p>
          </div>

          {/* Location + Start Date */}
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Salary with inline currency */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Annual Salary</label>
            <div className="flex">
              <select
                value={formData.salaryCurrency}
                onChange={(e) => setFormData({ ...formData, salaryCurrency: e.target.value })}
                className="w-24 border border-r-0 border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-700 rounded-l-lg px-2 py-2 text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="NPR">NPR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
              <input
                type="number"
                value={formData.salaryAmount}
                onChange={(e) => setFormData({ ...formData, salaryAmount: e.target.value })}
                className="flex-1 border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-r-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="600000"
              />
            </div>
            <p className="text-xs text-subtext-light dark:text-subtext-dark mt-1">
              Enter the total annual compensation
            </p>
          </div>

          {/* Pay Frequency + Probation Period */}
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Probation Period</label>
              <select
                value={formData.probationPeriod}
                onChange={(e) => setFormData({ ...formData, probationPeriod: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">No probation</option>
                <option value="30">30 Days</option>
                <option value="90">90 Days</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Inviting...
                </>
              ) : (
                <>
                  <span className="material-icons-outlined text-lg">send</span>
                  Send Invite
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
