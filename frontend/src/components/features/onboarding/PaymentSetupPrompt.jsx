import { useState, useEffect, useCallback } from 'react'
import { useStripe } from '@stripe/react-stripe-js'
import { paymentsService } from '../../../services/paymentsService'

export default function PaymentSetupPrompt({ onComplete, orgName, billingEmail }) {
  const stripe = useStripe()
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [activeMethod, setActiveMethod] = useState(null)
  const [error, setError] = useState(null)
  const [microDepositMessage, setMicroDepositMessage] = useState(null)

  // Check for existing active payment method
  const checkExisting = useCallback(async () => {
    try {
      setLoading(true)
      const method = await paymentsService.getActivePaymentMethod()
      setActiveMethod(method)
    } catch (err) {
      // No active method found — that's fine
      console.log('No active payment method:', err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkExisting()
  }, [checkExisting])

  const stripeNotConfigured = !loading && stripe === null

  const handleConnectBank = async () => {
    if (!stripe) {
      setError('Payment setup is not available. Please contact support.')
      return
    }

    setConnecting(true)
    setError(null)
    setMicroDepositMessage(null)

    try {
      // 1. Create SetupIntent on the backend
      const { clientSecret } = await paymentsService.createSetupIntent()

      // 2. Open Financial Connections modal to collect bank account
      const { setupIntent: collectResult, error: collectError } = await stripe.collectBankAccountForSetup({
        clientSecret,
        params: {
          payment_method_type: 'us_bank_account',
          payment_method_data: {
            billing_details: {
              name: orgName || 'Account Holder',
              email: billingEmail || undefined,
            }
          }
        }
      })

      if (collectError) {
        setError(collectError.message)
        setConnecting(false)
        return
      }

      // Customer closed the modal without selecting a bank
      if (collectResult.status === 'requires_payment_method') {
        setConnecting(false)
        return
      }

      // 3. Confirm the US bank account setup (handles mandate acceptance)
      if (collectResult.status === 'requires_confirmation') {
        const { setupIntent, error: confirmError } = await stripe.confirmUsBankAccountSetup(clientSecret)

        if (confirmError) {
          setError(confirmError.message)
          setConnecting(false)
          return
        }

        // 4. Handle the result
        if (setupIntent.status === 'succeeded') {
          await checkExisting()
          if (onComplete) onComplete()
        } else if (setupIntent.status === 'requires_action' || setupIntent.next_action?.type === 'verify_with_microdeposits') {
          setMicroDepositMessage(
            'Your bank account requires micro-deposit verification. Two small deposits will appear in your account within 1-2 business days. Return here to verify them.'
          )
        } else {
          setError(`Unexpected status: ${setupIntent.status}. Please try again.`)
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to connect bank account')
    } finally {
      setConnecting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center gap-3 p-4">
        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        <span className="text-sm text-subtext-light dark:text-subtext-dark">Checking payment method...</span>
      </div>
    )
  }

  // Bank linked state
  if (activeMethod) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
            <span className="material-icons-outlined text-xl">check_circle</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-text-light dark:text-text-dark">
                {activeMethod.bank_name || 'Bank Account'} ····{activeMethod.last_four || '****'}
              </h4>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                Connected
              </span>
            </div>
            <p className="text-xs text-subtext-light dark:text-subtext-dark mt-1">
              Your US bank account is linked and ready for payroll funding.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Stripe not configured — clear message
  if (stripeNotConfigured) {
    return (
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <span className="material-icons-outlined text-amber-500 text-xl mt-0.5">info</span>
        <div>
          <h4 className="text-sm font-medium text-text-light dark:text-text-dark">
            Payment setup is not available
          </h4>
          <p className="text-xs text-subtext-light dark:text-subtext-dark mt-1">
            Stripe is not configured. Please contact support or check your environment settings.
          </p>
        </div>
      </div>
    )
  }

  // No bank — connect state
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-border-light dark:border-border-dark">
        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
          <span className="material-icons-outlined text-xl">account_balance</span>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-text-light dark:text-text-dark">
            Connect your US bank account to fund payroll
          </h4>
          <p className="text-xs text-subtext-light dark:text-subtext-dark mt-1">
            Securely link your bank account to enable payroll processing for your team in Nepal.
            We use bank-level encryption to protect your financial data.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <span className="material-icons-outlined text-red-500 text-lg">error_outline</span>
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {microDepositMessage && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-2">
            <span className="material-icons-outlined text-amber-500 text-lg mt-0.5">info</span>
            <p className="text-sm text-amber-700 dark:text-amber-400">{microDepositMessage}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleConnectBank}
          disabled={connecting || !stripe}
          className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {connecting ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Connecting...
            </>
          ) : (
            <>
              <span className="material-icons-outlined text-lg">link</span>
              Connect Bank Account
            </>
          )}
        </button>
      </div>
    </div>
  )
}
