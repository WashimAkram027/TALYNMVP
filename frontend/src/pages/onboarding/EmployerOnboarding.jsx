import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { onboardingAPI } from '../../services/api'

const INDUSTRIES = [
  { value: 'software_development', label: 'Software Development' },
  { value: 'it_consulting', label: 'IT Consulting' },
  { value: 'mep_engineering', label: 'MEP Engineering' },
  { value: 'energy_consulting', label: 'Energy Consulting' },
  { value: 'building_information_modeling', label: 'Building Information Modeling' },
  { value: 'architectural_designs', label: 'Architectural Designs' },
  { value: 'product_design', label: 'Product Design' },
  { value: 'engineering_analysis', label: 'Engineering Analysis' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'construction_management', label: 'Construction Management' },
  { value: 'legal_services', label: 'Legal Services' },
  { value: 'healthcare_services', label: 'Healthcare Services' },
  { value: 'office_administration', label: 'Office Administration' },
  { value: 'other', label: 'Other' }
]

export default function EmployerOnboarding() {
  const navigate = useNavigate()
  const { profile, checkAuth } = useAuthStore()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Step 1 fields
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phone, setPhone] = useState('')
  const [orgName, setOrgName] = useState('')
  const [industry, setIndustry] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [country, setCountry] = useState('US')

  // Step 2 fields
  const [serviceType, setServiceType] = useState('eor')

  // Load current onboarding status
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await onboardingAPI.getStatus()
        if (response.success && response.data) {
          const { currentStep, isComplete } = response.data
          if (isComplete) {
            navigate('/dashboard', { replace: true })
            return
          }
          if (currentStep) {
            setStep(currentStep)
          }
        }
      } catch {
        // If status fetch fails, default to step 1
      }
      setLoading(false)
    }
    loadStatus()
  }, [navigate])

  const handleStep1Submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await onboardingAPI.completeProfile({
        dateOfBirth: dateOfBirth || undefined,
        phone: phone || undefined,
        orgName,
        industry,
        addressLine1,
        addressLine2: addressLine2 || undefined,
        city,
        state,
        zipCode,
        country
      })

      if (response.success) {
        setStep(2)
      } else {
        setError(response.error || 'Failed to save profile')
      }
    } catch (err) {
      setError(err.message || 'Failed to save profile')
    }
    setSubmitting(false)
  }

  const handleStep2Submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await onboardingAPI.selectService({ serviceType })

      if (response.success) {
        // Refresh auth state to pick up completed onboarding
        await checkAuth()
        navigate('/dashboard', { replace: true })
      } else {
        setError(response.error || 'Failed to save service selection')
      }
    } catch (err) {
      setError(err.message || 'Failed to save service selection')
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
            Let's set up your company account
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Step {step} of 2
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {step === 1 ? 'Company Details' : 'Service Selection'}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-300"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Step 1: Profile + Organization */}
        {step === 1 && (
          <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Company Details
            </h2>

            <form onSubmit={handleStep1Submit} className="space-y-5">
              {/* Personal Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <hr className="border-gray-200 dark:border-gray-700" />

              {/* Organization Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                  placeholder="Your Company Inc."
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Industry *
                </label>
                <select
                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  required
                >
                  <option value="">Select your industry</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind.value} value={ind.value}>{ind.label}</option>
                  ))}
                </select>
              </div>

              <hr className="border-gray-200 dark:border-gray-700" />

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                  placeholder="123 Main St"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                  placeholder="Suite 100"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Service Selection */}
        {step === 2 && (
          <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              How would you like to use Talyn?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Select the service that best fits your needs
            </p>

            <form onSubmit={handleStep2Submit} className="space-y-4">
              {/* EOR Card */}
              <label
                className={`block p-5 rounded-xl border-2 cursor-pointer transition-all ${
                  serviceType === 'eor'
                    ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="radio"
                    name="serviceType"
                    value="eor"
                    checked={serviceType === 'eor'}
                    onChange={() => setServiceType('eor')}
                    className="mt-1 text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="material-icons text-primary">verified_user</span>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Employer of Record (EOR)
                      </h3>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      We handle payroll, compliance, and HR administration for your team in Nepal. You focus on managing your team.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                        Payroll
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                        Compliance
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                        Benefits
                      </span>
                    </div>
                  </div>
                </div>
              </label>

              {/* Hire Talent Card - Coming Soon */}
              <div className="block p-5 rounded-xl border-2 border-gray-200 dark:border-gray-600 opacity-60 cursor-not-allowed relative">
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    Coming Soon
                  </span>
                </div>
                <div className="flex items-start gap-4">
                  <input
                    type="radio"
                    name="serviceType"
                    value="hire_talent"
                    disabled
                    className="mt-1 text-gray-400"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="material-icons text-gray-400">search</span>
                      <h3 className="font-semibold text-gray-500 dark:text-gray-400">
                        Hire Talent
                      </h3>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
                      Browse and hire pre-vetted professionals from Nepal. We help you find the right talent for your team.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Finishing...' : 'Get Started'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
