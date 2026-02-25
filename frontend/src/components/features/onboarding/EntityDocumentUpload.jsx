import { useState, useRef } from 'react'
import { onboardingService } from '../../../services/onboardingService'

const DOC_TYPES = [
  {
    key: 'w9',
    title: 'W-9 Form',
    description: 'IRS form for tax identification',
    icon: 'description'
  },
  {
    key: 'articles_of_incorporation',
    title: 'Articles of Incorporation',
    description: 'Legal formation document',
    icon: 'gavel'
  },
  {
    key: 'bank_statement',
    title: 'Bank Statement',
    description: 'Recent bank statement for verification',
    icon: 'account_balance'
  }
]

const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function DocumentCard({ docConfig, uploadedDoc, entityStatus, onUpload, onDelete, uploading }) {
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const isUploaded = !!uploadedDoc
  const isPendingReview = entityStatus === 'pending_review'

  const handleFile = async (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert('Please upload a PDF, PNG, or JPEG file')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      alert('File must be under 10MB')
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      onUpload({
        docType: docConfig.key,
        fileBase64: base64,
        fileName: file.name,
        fileType: file.type
      })
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className={`rounded-lg border p-4 transition ${
      isUploaded
        ? 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
        : dragOver
        ? 'border-primary bg-primary/5'
        : 'border-border-light dark:border-border-dark'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${
          isUploaded ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
        }`}>
          <span className="material-icons-outlined text-xl">
            {isUploaded ? 'check_circle' : docConfig.icon}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-text-light dark:text-text-dark">{docConfig.title}</h4>
          <p className="text-xs text-subtext-light dark:text-subtext-dark">{docConfig.description}</p>

          {isUploaded ? (
            <div className="flex items-center gap-2 mt-2">
              <span className="material-icons-outlined text-sm text-green-600">attach_file</span>
              <span className="text-xs text-text-light dark:text-text-dark truncate">{uploadedDoc.fileName}</span>
              {!isPendingReview && (
                <button
                  onClick={() => onDelete(docConfig.key)}
                  className="text-xs text-red-500 hover:text-red-700 ml-2 flex items-center gap-0.5"
                >
                  <span className="material-icons-outlined text-sm">delete</span>
                  Remove
                </button>
              )}
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className="mt-2"
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || isPendingReview}
                className="text-xs text-primary hover:text-primary-hover font-medium flex items-center gap-1 disabled:opacity-50"
              >
                <span className="material-icons-outlined text-sm">upload_file</span>
                {uploading ? 'Uploading...' : 'Upload file'}
              </button>
              <p className="text-[10px] text-subtext-light dark:text-subtext-dark mt-1">
                PDF, PNG, or JPEG up to 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EntityDocumentUpload({ stepData, onComplete }) {
  const [uploading, setUploading] = useState(null) // tracks which docType is uploading
  const [documents, setDocuments] = useState(stepData?.documents || [])
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const entityStatus = stepData?.entityStatus || 'not_started'
  const isPendingReview = entityStatus === 'pending_review'
  const allUploaded = DOC_TYPES.every(dt => documents.some(d => d.docType === dt.key))

  const handleUpload = async (data) => {
    try {
      setUploading(data.docType)
      setError(null)
      const result = await onboardingService.uploadEntityDocument(data)
      setDocuments(prev => {
        const filtered = prev.filter(d => d.docType !== data.docType)
        return [...filtered, {
          docType: result.doc_type,
          fileName: result.file_name,
          fileUrl: result.file_url,
          uploadedAt: result.created_at
        }]
      })
    } catch (err) {
      setError(err.message || 'Failed to upload document')
    } finally {
      setUploading(null)
    }
  }

  const handleDelete = async (docType) => {
    try {
      setError(null)
      await onboardingService.deleteEntityDocument(docType)
      setDocuments(prev => prev.filter(d => d.docType !== docType))
    } catch (err) {
      setError(err.message || 'Failed to delete document')
    }
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setError(null)
      await onboardingService.submitEntity()
      onComplete()
    } catch (err) {
      setError(err.message || 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {isPendingReview && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
          <span className="material-icons-outlined text-lg">hourglass_top</span>
          Your entity documents are under review. We'll notify you once approved.
        </div>
      )}

      <div className="grid gap-3">
        {DOC_TYPES.map(docConfig => (
          <DocumentCard
            key={docConfig.key}
            docConfig={docConfig}
            uploadedDoc={documents.find(d => d.docType === docConfig.key)}
            entityStatus={entityStatus}
            onUpload={handleUpload}
            onDelete={handleDelete}
            uploading={uploading === docConfig.key}
          />
        ))}
      </div>

      {!isPendingReview && (
        <div className="pt-2">
          <button
            onClick={handleSubmit}
            disabled={!allUploaded || submitting}
            className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </button>
          {!allUploaded && (
            <p className="text-xs text-subtext-light dark:text-subtext-dark mt-2">
              Upload all 3 documents to submit for review
            </p>
          )}
        </div>
      )}
    </div>
  )
}
