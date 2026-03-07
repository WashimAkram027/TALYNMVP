import { useState } from 'react'
import { paymentsService } from '../../../services/paymentsService'

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

export default function BankDetailsModal({ onClose, onSuccess, existingDetails }) {
  const isUpdate = !!existingDetails
  const [formData, setFormData] = useState({
    accountHolderName: existingDetails?.account_holder_name || '',
    bankName: existingDetails?.bank_name || '',
    bankCode: existingDetails?.bank_code || '',
    accountNumber: '',
    currency: existingDetails?.currency || 'NPR'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.accountHolderName || !formData.bankCode || !formData.accountNumber) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await paymentsService.submitBankDetails(formData)
      if (onSuccess) onSuccess()
      if (onClose) onClose()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save bank details')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{isUpdate ? 'Update Bank Details' : 'Add Bank Details'}</h2>
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

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
              Account Holder Name *
            </label>
            <input
              type="text"
              value={formData.accountHolderName}
              onChange={(e) => handleChange('accountHolderName', e.target.value)}
              placeholder="Full name as on bank account"
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
              Bank Name
            </label>
            <select
              value={formData.bankName}
              onChange={(e) => handleChange('bankName', e.target.value)}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a bank</option>
              {NEPALI_BANKS.map(bank => (
                <option key={bank} value={bank}>{bank}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
              Bank Code (SWIFT/BIC) *
            </label>
            <input
              type="text"
              value={formData.bankCode}
              onChange={(e) => handleChange('bankCode', e.target.value.toUpperCase())}
              placeholder="e.g., HIABORKA"
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
              Account Number *
            </label>
            <input
              type="text"
              value={formData.accountNumber}
              onChange={(e) => handleChange('accountNumber', e.target.value)}
              placeholder={isUpdate && existingDetails?.account_number_last4 ? `····${existingDetails.account_number_last4}` : 'Your bank account number'}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <p className="text-xs text-subtext-light dark:text-subtext-dark">
            Your bank details are securely transmitted and stored. Payments will be sent in NPR to your Nepali bank account.
          </p>

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
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                isUpdate ? 'Update Bank Details' : 'Save Bank Details'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
