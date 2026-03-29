import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { onboardingAPI } from '../../services/api'

const STEP_TITLES = [
  'Personal Information',
  'Emergency Contact',
  'Tax Information'
]

const RELATIONSHIPS = ['Parent', 'Spouse', 'Sibling', 'Friend', 'Other']

export default function EmployeeOnboarding() {
  const navigate = useNavigate()
  const { profile, checkAuth } = useAuthStore()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Personal Info
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phone, setPhone] = useState('')
  const [nationality, setNationality] = useState('Nepali')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [country] = useState('Nepal')

  // Step 2: Emergency Contact
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [relationship, setRelationship] = useState('')

  // Step 3: Tax Info
  const [panNumber, setPanNumber] = useState('')
  const [ssfNumber, setSsfNumber] = useState('')

  // Clear errors when step changes
  useEffect(() => { setError('') }, [step])

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await onboardingAPI.getEmployeeStatus()
        if (response.success && response.data) {
          const { currentStep, isComplete, personalInfo, emergencyContact, taxInfo } = response.data
          if (isComplete) {
            navigate('/employee/overview', { replace: true })
            return
          }
          if (currentStep) {
            // Cap step at 3
            setStep(Math.min(currentStep, 3))
          }
          // Pre-fill saved data
          if (personalInfo) {
            setDateOfBirth(personalInfo.dateOfBirth || '')
            setPhone(personalInfo.phone || '')
            const addr = personalInfo.address || {}
            setNationality(addr.nationality || 'Nepali')
            setStreet(addr.street || '')
            setCity(addr.city || '')
            setState(addr.state || '')
          }
          if (emergencyContact) {
            setContactName(emergencyContact.name || '')
            setContactPhone(emergencyContact.phone || '')
            setRelationship(emergencyContact.relationship || '')
          }
          if (taxInfo) {
            setPanNumber(taxInfo.panNumber || '')
            setSsfNumber(taxInfo.ssfNumber || '')
          }
        }
      } catch {
        // Default to step 1
      }
      setLoading(false)
    }
    loadStatus()
  }, [navigate])

  // Step 1: Personal Info submit
  const handlePersonalInfoSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await onboardingAPI.submitPersonalInfo({
        dateOfBirth, phone, nationality, street, city, state, country
      })
      if (response.success) {
        setStep(2)
      } else {
        setError(response.error || 'Failed to save personal information')
      }
    } catch (err) {
      setError(err.message || 'Failed to save personal information')
    }
    setSubmitting(false)
  }

  // Step 2: Emergency Contact submit
  const handleEmergencyContactSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await onboardingAPI.submitEmergencyContact({
        contactName, contactPhone, relationship
      })
      if (response.success) {
        setStep(3)
      } else {
        setError(response.error || 'Failed to save emergency contact')
      }
    } catch (err) {
      setError(err.message || 'Failed to save emergency contact')
    }
    setSubmitting(false)
  }

  // Step 3: Tax Info submit - completes onboarding and redirects to dashboard
  const handleTaxInfoSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await onboardingAPI.submitTaxInfo({
        panNumber, ssfNumber: ssfNumber || undefined
      })
      if (response.success) {
        await checkAuth()
        navigate('/employee/overview', { replace: true })
      } else {
        setError(response.error || 'Failed to save tax information')
      }
    } catch (err) {
      setError(err.message || 'Failed to save tax information')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  const inputClass = 'block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5'
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
  const cardClass = 'bg-card-light dark:bg-card-dark rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700'
  const btnClass = 'w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white">
            <span className="material-icons-outlined text-lg">public</span>
          </div>
          <span className="font-bold text-xl">Talyn</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome{profile?.first_name ? `, ${profile.first_name}` : ''}!
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Let's get you set up
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Step {step} of 3
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {STEP_TITLES[step - 1]}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Step 1: Personal Information */}
        {step === 1 && (
          <div className={cardClass}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Personal Information
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Tell us a bit about yourself
            </p>

            <form onSubmit={handlePersonalInfoSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Date of Birth *</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone Number *</label>
                  <input
                    type="tel"
                    className={inputClass}
                    placeholder="+977 98XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Nationality *</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Nepali"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Street Address *</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Street address"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>City *</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Kathmandu"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>State / Province</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Bagmati"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Country</label>
                <input
                  type="text"
                  className={`${inputClass} bg-gray-50 dark:bg-gray-700 cursor-not-allowed`}
                  value={country}
                  disabled
                />
              </div>

              <div className="pt-4">
                <button type="submit" disabled={submitting} className={btnClass}>
                  {submitting ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Emergency Contact */}
        {step === 2 && (
          <div className={cardClass}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Emergency Contact
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Provide an emergency contact person
            </p>

            <form onSubmit={handleEmergencyContactSubmit} className="space-y-5">
              <div>
                <label className={labelClass}>Contact Name *</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Full name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Contact Phone *</label>
                <input
                  type="tel"
                  className={inputClass}
                  placeholder="+977 98XXXXXXXX"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Relationship *</label>
                <select
                  className={inputClass}
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  required
                >
                  <option value="">Select relationship</option>
                  {RELATIONSHIPS.map((rel) => (
                    <option key={rel} value={rel}>{rel}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4">
                <button type="submit" disabled={submitting} className={btnClass}>
                  {submitting ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Tax Information */}
        {step === 3 && (
          <div className={cardClass}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Tax Information
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Provide your tax identification details for Nepal
            </p>

            <form onSubmit={handleTaxInfoSubmit} className="space-y-5">
              <div>
                <label className={labelClass}>PAN Number *</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Permanent Account Number"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Your Permanent Account Number issued by the Inland Revenue Department
                </p>
              </div>

              <div>
                <label className={labelClass}>SSF Number</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Social Security Fund number (optional)"
                  value={ssfNumber}
                  onChange={(e) => setSsfNumber(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Your Social Security Fund number, if applicable
                </p>
              </div>

              <div className="pt-4">
                <button type="submit" disabled={submitting} className={btnClass}>
                  {submitting ? 'Completing setup...' : 'Complete Setup'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}
