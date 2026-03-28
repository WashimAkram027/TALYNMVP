import { useState, useEffect } from 'react'
import { documentsService } from '../../services/documentsService'
import { useAuthStore } from '../../store/authStore'
import EmptyState from '../../components/employee/EmptyState'

export default function EmployeeDocuments() {
  const { membership } = useAuthStore()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const memberId = membership?.id
        let data
        if (memberId) {
          data = await documentsService.getMemberDocuments(memberId)
        } else {
          data = await documentsService.getMyDocuments()
        }
        setDocuments(data || [])
      } catch (err) {
        console.error('Documents fetch error:', err)
        setError(err.message || 'Failed to load documents')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [membership?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-subtext-light dark:text-subtext-dark">Loading documents...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <span className="material-icons-outlined text-red-500 text-4xl mb-4 block">error_outline</span>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Documents</h1>
        <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">View and download your employment documents</p>
      </header>

      {/* Documents Table */}
      <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
        {documents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-subtext-light dark:text-subtext-dark">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-subtext-light dark:text-subtext-dark">Category</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-subtext-light dark:text-subtext-dark">Uploaded</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-subtext-light dark:text-subtext-dark">Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, index) => (
                  <tr key={doc.id || index} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <span className="material-icons-outlined text-gray-400">
                          {doc.file_type?.includes('pdf') ? 'picture_as_pdf' : 'insert_drive_file'}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize">
                        {doc.category || 'other'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4">
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary-hover text-sm font-medium flex items-center gap-1"
                        >
                          <span className="material-icons-outlined text-base">download</span>
                          Download
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="folder_open"
            title="No documents available"
            description="Your employment documents will appear here once uploaded by your organization"
          />
        )}
      </div>
    </div>
  )
}
