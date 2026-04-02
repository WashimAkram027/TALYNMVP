import { useState } from 'react'
import { quoteService } from '../../services/quoteService'
import { membersService } from '../../services/membersService'
import { useAuthStore } from '../../store/authStore'
import QuoteReviewPanel from './quotes/QuoteReviewPanel'

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'contractor', label: 'Contractor' }
]

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' }
]

export default function InviteMemberModal({ onClose, onSuccess, departments = [], editMember }) {
  const { organization, profile } = useAuthStore()
  const isReissue = !!editMember
  const [formData, setFormData] = useState({
    firstName: editMember?.first_name || '',
    lastName: editMember?.last_name || '',
    email: editMember?.invitation_email || editMember?.profile?.email || '',
    memberRole: editMember?.member_role || 'employee',
    jobTitle: editMember?.job_title || '',
    department: editMember?.department || '',
    employmentType: editMember?.employment_type || 'full_time',
    jobDescription: editMember?.job_description || '',
    location: editMember?.location || '',
    startDate: editMember?.start_date || '',
    salaryAmount: editMember?.salary_amount || '',
    salaryCurrency: editMember?.salary_currency || 'NPR',
    payFrequency: editMember?.pay_frequency || 'monthly',
    probationPeriod: editMember?.probation_period || ''
  })
  const [phase, setPhase] = useState('form') // 'form' | 'quote'
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleGenerateQuote = async (e) => {
    e.preventDefault()
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First name and last name are required')
      return
    }
    if (!formData.email) {
      setError('Email is required')
      return
    }
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }
    if (!formData.salaryAmount || parseFloat(formData.salaryAmount) <= 0) {
      setError('A positive annual salary is required to generate a cost quote')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const result = await quoteService.generateQuote({
        email: formData.email,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        jobTitle: formData.jobTitle,
        department: formData.department,
        employmentType: formData.employmentType,
        salaryAmount: parseFloat(formData.salaryAmount),
        salaryCurrency: formData.salaryCurrency,
        payFrequency: formData.payFrequency,
        startDate: formData.startDate || null
      })

      setQuote(result)
      setPhase('quote')
    } catch (err) {
      setError(err.message || 'Failed to generate quote')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptAndInvite = async ({ termsAcceptedAt } = {}) => {
    try {
      setLoading(true)
      setError(null)

      if (isReissue) {
        // Reissue mode: link new quote to existing member
        await membersService.reissueQuote(editMember.id, quote.id)
      } else {
        // Normal mode: accept quote and create new member
        await quoteService.acceptAndInvite(quote.id, { termsAcceptedAt })
      }
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to process')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPdf = async () => {
    const blob = await quoteService.downloadQuotePdf(quote.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${quote.quote_number}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleBackToForm = () => {
    setPhase('form')
    setError(null)
  }

  const handleSaveAndExit = () => {
    // Quote is already persisted as 'draft' in the DB when generated
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full mx-4 max-h-[90vh] flex flex-col border border-border-light dark:border-border-dark transition-all duration-200 ${phase === 'quote' ? 'max-w-4xl' : 'max-w-lg'}`}>
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">
              {phase === 'form'
                ? (isReissue ? 'Update Offer' : 'Invite Team Member')
                : 'Review Cost Quote'}
            </h2>
            <p className="text-sm text-subtext-light dark:text-subtext-dark">
              {phase === 'form'
                ? (isReissue ? 'Update the offer details and generate a new quote' : 'Fill in details to generate an EOR cost quote')
                : 'Review the employer cost breakdown before sending'}
            </p>
          </div>
          <button onClick={onClose} className="text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {phase === 'quote' ? (
            <QuoteReviewPanel
              quote={quote}
              onBack={handleBackToForm}
              onAccept={handleAcceptAndInvite}
              onDownloadPdf={handleDownloadPdf}
              onSaveAndExit={handleSaveAndExit}
              loading={loading}
              acceptLabel={isReissue ? 'Accept & Update Offer' : undefined}
              orgName={organization?.name}
              generatedBy={profile?.full_name}
            />
          ) : (
            <form onSubmit={handleGenerateQuote} className="space-y-4">
              {/* Change Request Note Banner */}
              {isReissue && editMember.quote_dispute_note && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="material-icons-outlined text-amber-600 dark:text-amber-400 text-lg mt-0.5">warning</span>
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Employee Change Request</p>
                      <p className="text-sm text-amber-700 dark:text-amber-400 mt-1 italic">
                        &ldquo;{editMember.quote_dispute_note}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* First Name + Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">First Name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary ${isReissue ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : 'bg-surface-light dark:bg-gray-800'}`}
                  placeholder="team@company.com"
                  required
                  readOnly={isReissue}
                  disabled={isReissue}
                />
                <p className="text-xs text-subtext-light dark:text-subtext-dark mt-1">
                  {isReissue ? 'Email cannot be changed for an existing offer' : 'An invitation will be sent to this email address'}
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
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Annual Salary *</label>
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
                    placeholder="960000"
                    required
                  />
                </div>
                <p className="text-xs text-subtext-light dark:text-subtext-dark mt-1">
                  Enter the total annual compensation (required for cost quote)
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
                      Generating...
                    </>
                  ) : (
                    <>
                      {isReissue ? 'Generate Updated Quote' : 'Generate Quote'}
                      <span className="material-icons-outlined text-lg">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
