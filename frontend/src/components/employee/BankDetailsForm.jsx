import { useState } from 'react'

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

const inputClass = 'block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5'
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

export default function BankDetailsForm({ initialValues, onSubmit, submitLabel = 'Save Bank Details', onCancel }) {
  const [accountHolderName, setAccountHolderName] = useState(initialValues?.accountHolderName || '')
  const [bankName, setBankName] = useState(initialValues?.bankName || '')
  const [bankCode, setBankCode] = useState(initialValues?.bankCode || '')
  const [accountNumber, setAccountNumber] = useState(initialValues?.accountNumber || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await onSubmit({
        accountHolderName,
        bankName: bankName || undefined,
        bankCode,
        accountNumber,
        currency: 'NPR'
      })
    } catch (err) {
      setError(err.message || 'Failed to save bank details')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className={labelClass}>Account Holder Name *</label>
        <input
          type="text"
          className={inputClass}
          placeholder="Full name as on bank account"
          value={accountHolderName}
          onChange={(e) => setAccountHolderName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className={labelClass}>Bank Name</label>
        <select
          className={inputClass}
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
        <label className={labelClass}>Bank Code / SWIFT *</label>
        <input
          type="text"
          className={inputClass}
          placeholder="e.g. NABORKNPXXX"
          value={bankCode}
          onChange={(e) => setBankCode(e.target.value)}
          required
        />
      </div>

      <div>
        <label className={labelClass}>Account Number *</label>
        <input
          type="text"
          className={inputClass}
          placeholder="Your bank account number"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          required
        />
      </div>

      <div>
        <label className={labelClass}>Currency</label>
        <input
          type="text"
          className={`${inputClass} bg-gray-50 dark:bg-gray-700 cursor-not-allowed`}
          value="NPR (Nepalese Rupee)"
          disabled
        />
      </div>

      <div className="pt-4 flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
