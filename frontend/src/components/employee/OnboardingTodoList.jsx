import { useState, useRef } from 'react'
import { onboardingAPI } from '../../services/api'
import BankDetailsForm from './BankDetailsForm'

const DOC_TYPES = [
  { value: 'citizenship', label: 'Citizenship Certificate' },
  { value: 'national_id', label: 'National ID' },
  { value: 'passport', label: 'Passport' }
]
const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/png', 'image/jpeg']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function OnboardingTodoList({ tasks, onTaskComplete }) {
  const [activeModal, setActiveModal] = useState(null) // 'documents' | 'banking' | null
  const [uploadedDocs, setUploadedDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [selectedDocType, setSelectedDocType] = useState('citizenship')
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  if (!tasks || tasks.allComplete) return null

  const completedCount = [tasks.documents?.completed, tasks.banking?.completed].filter(Boolean).length
  const totalCount = 2

  // Document upload handler
  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setError('Please upload a PDF, PNG, or JPEG file')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File must be under 10MB')
      return
    }

    setUploading(true)
    setError('')

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1]
      try {
        const response = await onboardingAPI.uploadEmployeeDocument({
          docType: selectedDocType,
          fileBase64: base64,
          fileName: file.name,
          fileType: file.type
        })
        if (response.success && response.data) {
          setUploadedDocs(prev => [...prev, response.data])
        } else {
          setError(response.error || 'Failed to upload document')
        }
      } catch (err) {
        setError(err.message || 'Failed to upload document')
      }
      setUploading(false)
    }
    reader.readAsDataURL(file)

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDocumentsDone = async () => {
    setError('')
    try {
      const response = await onboardingAPI.completeDocumentStep()
      if (response.success) {
        setActiveModal(null)
        if (onTaskComplete) onTaskComplete()
      } else {
        setError(response.error || 'Please upload at least one document')
      }
    } catch (err) {
      setError(err.message || 'Please upload at least one document')
    }
  }

  const handleBankDetailsSubmit = async (bankData) => {
    const response = await onboardingAPI.submitEmployeeBankDetails(bankData)
    if (response.success) {
      setActiveModal(null)
      if (onTaskComplete) onTaskComplete()
    } else {
      throw new Error(response.error || 'Failed to save bank details')
    }
  }

  const closeModal = () => {
    setActiveModal(null)
    setError('')
  }

  const inputClass = 'block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5'
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

  return (
    <>
      {/* Todo Checklist Card */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <span className="material-icons-outlined text-amber-600 dark:text-amber-400">checklist</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Complete Your Profile</h3>
              <p className="text-sm text-subtext-light dark:text-subtext-dark">
                {completedCount} of {totalCount} tasks completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2 transition-all duration-500"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-subtext-light dark:text-subtext-dark">
              {Math.round((completedCount / totalCount) * 100)}%
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {/* Document Upload Task */}
          <div
            className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
              tasks.documents?.completed
                ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-primary/30 cursor-pointer'
            }`}
            onClick={() => !tasks.documents?.completed && setActiveModal('documents')}
          >
            <div className="flex items-center gap-3">
              <span className={`material-icons-outlined text-lg ${
                tasks.documents?.completed ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {tasks.documents?.completed ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <div>
                <p className={`font-medium ${
                  tasks.documents?.completed
                    ? 'text-green-700 dark:text-green-400 line-through'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  Upload Identity Documents
                </p>
                <p className="text-xs text-subtext-light dark:text-subtext-dark">
                  Citizenship certificate, national ID, or passport
                </p>
              </div>
            </div>
            {!tasks.documents?.completed && (
              <button
                onClick={(e) => { e.stopPropagation(); setActiveModal('documents') }}
                className="px-3 py-1.5 text-sm font-medium text-primary hover:text-primary-hover border border-primary/30 hover:border-primary rounded-lg transition-colors"
              >
                Upload
              </button>
            )}
          </div>

          {/* Banking Details Task */}
          <div
            className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
              tasks.banking?.completed
                ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-primary/30 cursor-pointer'
            }`}
            onClick={() => !tasks.banking?.completed && setActiveModal('banking')}
          >
            <div className="flex items-center gap-3">
              <span className={`material-icons-outlined text-lg ${
                tasks.banking?.completed ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {tasks.banking?.completed ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <div>
                <p className={`font-medium ${
                  tasks.banking?.completed
                    ? 'text-green-700 dark:text-green-400 line-through'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  Add Banking Details
                </p>
                <p className="text-xs text-subtext-light dark:text-subtext-dark">
                  Bank account for receiving payments
                </p>
              </div>
            </div>
            {!tasks.banking?.completed && (
              <button
                onClick={(e) => { e.stopPropagation(); setActiveModal('banking') }}
                className="px-3 py-1.5 text-sm font-medium text-primary hover:text-primary-hover border border-primary/30 hover:border-primary rounded-lg transition-colors"
              >
                Add
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Document Upload Modal */}
      {activeModal === 'documents' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upload Identity Documents</h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <span className="material-icons-outlined text-gray-500">close</span>
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Upload a copy of your citizenship certificate, national ID, or passport.
            </p>

            {error && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className={labelClass}>Document Type</label>
                <select
                  className={inputClass}
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                >
                  {DOC_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>{dt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary dark:hover:border-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-icons-outlined text-3xl text-gray-400 mb-2">cloud_upload</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Click to upload</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF, PNG, or JPEG (max 10MB)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {uploadedDocs.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Uploaded Documents</h4>
                <div className="space-y-2">
                  {uploadedDocs.map((doc, index) => (
                    <div key={doc.id || index} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                      <span className="material-icons-outlined text-green-600 text-lg">check_circle</span>
                      <span className="text-sm text-gray-900 dark:text-white flex-1 truncate">{doc.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleDocumentsDone}
                disabled={uploadedDocs.length === 0}
                className="flex-1 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Done
              </button>
              <button
                onClick={closeModal}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banking Details Modal */}
      {activeModal === 'banking' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Banking Details</h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <span className="material-icons-outlined text-gray-500">close</span>
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Enter your bank account details for receiving payments.
            </p>

            <BankDetailsForm
              onSubmit={handleBankDetailsSubmit}
              submitLabel="Save Bank Details"
              onCancel={closeModal}
            />
          </div>
        </div>
      )}
    </>
  )
}
