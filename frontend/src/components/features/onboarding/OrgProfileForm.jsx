import { useState } from 'react'
import { onboardingService } from '../../../services/onboardingService'

const EMPLOYEE_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full-time employees' },
  { value: 'part_time', label: 'Part-time employees' },
  { value: 'contractors', label: 'Contractors' },
  { value: 'freelancers', label: 'Freelancers' },
  { value: 'interns', label: 'Interns' }
]

export default function OrgProfileForm({ stepData, onComplete }) {
  const [formData, setFormData] = useState({
    description: stepData?.description || '',
    website: stepData?.website || '',
    linkedinUrl: stepData?.linkedinUrl || '',
    employeeTypesNeeded: stepData?.employeeTypesNeeded || []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const toggleEmployeeType = (type) => {
    setFormData(prev => ({
      ...prev,
      employeeTypesNeeded: prev.employeeTypesNeeded.includes(type)
        ? prev.employeeTypesNeeded.filter(t => t !== type)
        : [...prev.employeeTypesNeeded, type]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      await onboardingService.completeOrgProfile(formData)
      onComplete()
    } catch (err) {
      setError(err.message || 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    try {
      setLoading(true)
      setError(null)
      await onboardingService.completeOrgProfile({})
      onComplete()
    } catch (err) {
      setError(err.message || 'Failed to skip step')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
          Company Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Tell us about your company and what you do..."
          rows={3}
          maxLength={1000}
          className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-none"
        />
        <p className="text-xs text-subtext-light dark:text-subtext-dark mt-1">
          {formData.description.length}/1000 characters
        </p>
      </div>

      {/* Employee Types */}
      <div>
        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
          What types of employees will you hire?
        </label>
        <div className="flex flex-wrap gap-2">
          {EMPLOYEE_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleEmployeeType(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                formData.employeeTypesNeeded.includes(opt.value)
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark text-subtext-light dark:text-subtext-dark hover:border-gray-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Website */}
      <div>
        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
          Website
        </label>
        <input
          type="url"
          value={formData.website}
          onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
          placeholder="https://yourcompany.com"
          className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
        />
      </div>

      {/* LinkedIn */}
      <div>
        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
          LinkedIn Company Page
        </label>
        <input
          type="url"
          value={formData.linkedinUrl}
          onChange={(e) => setFormData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
          placeholder="https://linkedin.com/company/yourcompany"
          className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium shadow-sm transition disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save & Continue'}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={loading}
          className="px-5 py-2 border border-border-light dark:border-border-dark text-subtext-light dark:text-subtext-dark rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
        >
          Skip for Now
        </button>
      </div>
    </form>
  )
}
