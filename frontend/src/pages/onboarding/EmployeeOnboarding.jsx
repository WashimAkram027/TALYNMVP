import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { onboardingAPI } from '../../services/api'

const NEPALI_BANKS = [
  'Nepal Rastra Bank',
  'Nepal Bank Limited',
  'Rastriya Banijya Bank',
  'Agriculture Development Bank',
  'Nabil Bank',
  'Nepal Investment Mega Bank',
  'Standard Chartered Bank Nepal',
  'Himalayan Bank',
  'Nepal SBI Bank',
  'Nepal Bangladesh Bank',
  'Everest Bank',
  'Kumari Bank',
  'Laxmi Sunrise Bank',
  'Citizens Bank International',
  'Prime Commercial Bank',
  'Sanima Bank',
  'Machhapuchchhre Bank',
  'NIC Asia Bank',
  'Global IME Bank',
  'NMB Bank',
  'Prabhu Bank',
  'Siddhartha Bank',
  'Civil Bank',
  'Century Commercial Bank'
]

const STEP_TITLES = [
  'Personal Information',
  'Emergency Contact',
  'Tax Information',
  'Document Upload',
  'Banking Details'
]

export default function EmployeeOnboarding() {
  const navigate = useNavigate()
  const { profile, checkAuth } = useAuthStore()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Step 5 bank details fields
  const [accountHolderName, setAccountHolderName] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await onboardingAPI.getEmployeeStatus()
        if (response.success && response.data) {
          const { currentStep, isComplete } = response.data
          if (isComplete) {
            navigate('/dashboard-employee', { replace: true })
            return
          }
          if (currentStep) {
            setStep(currentStep)
          }
        }
      } catch {
        // Default to step 1
      }
      setLoading(false)
    }
    loadStatus()
  }, [navigate])

  const handleAdvanceStep = async () => {
    setSubmitting(true)
    setError('')

    try {
      const response = await onboardingAPI.advanceEmployeeStep(step)
      if (response.success) {
        setStep(step + 1)
      } else {
        setError(response.error || 'Failed to advance step')
      }
    } catch (err) {
      setError(err.message || 'Failed to advance step')
    }
    setSubmitting(false)
  }

  const handleBankDetailsSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await onboardingAPI.submitEmployeeBankDetails({
        accountHolderName,
        bankName: bankName || undefined,
        bankCode,
        accountNumber,
        currency: 'NPR'
      })

      if (response.success) {
        await checkAuth()
        navigate('/dashboard-employee', { replace: true })
      } else {
        setError(response.error || 'Failed to save bank details')
      }
    } catch (err) {
      setError(err.message || 'Failed to save bank details')
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
            Let's get you set up
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Step {step} of 5
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {STEP_TITLES[step - 1]}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Steps 1-4: Placeholder */}
        {step >= 1 && step <= 4 && (
          <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700">
            <div className="text-center py-8">
              <span className="material-icons text-5xl text-gray-300 dark:text-gray-600 mb-4 block">
                {step === 1 ? 'person' : step === 2 ? 'emergency' : step === 3 ? 'receipt_long' : 'upload_file'}
              </span>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {STEP_TITLES[step - 1]}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">
                Coming soon — we'll collect this in a future update.
              </p>
              <button
                onClick={handleAdvanceStep}
                disabled={submitting}
                className="inline-flex justify-center py-3 px-8 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Banking Details */}
        {step === 5 && (
          <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Banking Details
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Enter your bank account details for receiving payments
            </p>

            <form onSubmit={handleBankDetailsSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                  placeholder="Full name as on bank account"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bank Name
                </label>
                <select
                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                >
                  <option value="">Select your bank</option>
                  {NEPALI_BANKS.map((bank) => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bank Code / SWIFT *
                </label>
                <input
                  type="text"
                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                  placeholder="e.g. NABORKNPXXX"
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Number *
                </label>
                <input
                  type="text"
                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                  placeholder="Your bank account number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Currency
                </label>
                <input
                  type="text"
                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sm:text-sm py-2.5 cursor-not-allowed"
                  value="NPR (Nepalese Rupee)"
                  disabled
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : 'Complete Setup'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
