import { useState, useEffect, useRef } from 'react'
import { documentsService } from '../services/documentsService'
import { useAuthStore } from '../store/authStore'

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'contract', label: 'Contract' },
  { value: 'policy', label: 'Policy' },
  { value: 'tax', label: 'Tax' },
  { value: 'identity', label: 'Identity' },
  { value: 'payslip', label: 'Payslip' },
  { value: 'other', label: 'Other' }
]

const CATEGORY_STYLES = {
  contract: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  policy: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  tax: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  identity: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  payslip: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}

const FILE_ICONS = {
  pdf: 'picture_as_pdf',
  doc: 'description',
  docx: 'description',
  xls: 'table_chart',
  xlsx: 'table_chart',
  csv: 'table_chart',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  default: 'insert_drive_file'
}

function getFileIcon(fileName) {
  if (!fileName) return FILE_ICONS.default
  const ext = fileName.split('.').pop()?.toLowerCase()
  return FILE_ICONS[ext] || FILE_ICONS.default
}

function formatFileSize(bytes) {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function Documents() {
  const { profile } = useAuthStore()
  const isEmployer = profile?.role === 'employer'

  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingDocument, setEditingDocument] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      setError(null)
      const filters = {}
      if (search) filters.search = search
      if (categoryFilter) filters.category = categoryFilter
      const data = await documentsService.getDocuments(filters)
      setDocuments(data || [])
    } catch (err) {
      console.error('Failed to fetch documents:', err)
      setError(err.message || 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocuments()
    }, 300)
    return () => clearTimeout(timer)
  }, [search, categoryFilter])

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    try {
      setActionLoading(true)
      await documentsService.deleteDocument(id)
      await fetchDocuments()
    } catch (err) {
      alert(err.message || 'Failed to delete document')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownload = async (id) => {
    try {
      const { file_url, name } = await documentsService.getDownloadUrl(id)
      if (file_url) {
        const a = document.createElement('a')
        a.href = file_url
        a.download = name || 'document'
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch (err) {
      alert(err.message || 'Failed to download document')
    }
  }

  const openEditModal = (doc) => {
    setEditingDocument(doc)
    setShowEditModal(true)
  }

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
          <span className="material-icons-outlined text-red-500 text-4xl mb-4">error_outline</span>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Documents</h1>
          <p className="text-subtext-light dark:text-subtext-dark">Manage organization files and documents</p>
        </div>
        {isEmployer && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition"
          >
            <span className="material-icons-outlined text-sm mr-1 align-middle">upload_file</span>
            Upload Document
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-4 rounded-xl mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-subtext-light dark:text-subtext-dark text-lg">search</span>
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg pl-10 pr-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {CATEGORY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {documents.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-8 text-center">
          <span className="material-icons-outlined text-4xl text-subtext-light dark:text-subtext-dark mb-2">folder_open</span>
          <p className="text-subtext-light dark:text-subtext-dark">No documents found</p>
          {isEmployer && (
            <button onClick={() => setShowUploadModal(true)} className="mt-4 text-primary hover:underline">Upload your first document</button>
          )}
        </div>
      ) : (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-border-light dark:divide-border-dark">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Document</th>
                <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Category</th>
                <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Size</th>
                <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Uploaded</th>
                <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="material-icons-outlined text-2xl text-subtext-light dark:text-subtext-dark">
                        {getFileIcon(doc.file_name || doc.name)}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-text-light dark:text-text-dark">{doc.name || doc.file_name}</div>
                        {doc.description && (
                          <p className="text-xs text-subtext-light dark:text-subtext-dark truncate max-w-[300px]">{doc.description}</p>
                        )}
                        {doc.is_sensitive && (
                          <span className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                            <span className="material-icons-outlined text-xs">lock</span>
                            Sensitive
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${CATEGORY_STYLES[doc.category] || CATEGORY_STYLES.other}`}>
                      {doc.category ? doc.category.charAt(0).toUpperCase() + doc.category.slice(1) : 'Other'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-subtext-light dark:text-subtext-dark">
                    {formatFileSize(doc.file_size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-subtext-light dark:text-subtext-dark">
                    {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(doc.id)}
                        className="text-primary hover:text-primary-hover"
                        title="Download"
                      >
                        <span className="material-icons-outlined text-lg">download</span>
                      </button>
                      {isEmployer && (
                        <>
                          <button
                            onClick={() => openEditModal(doc)}
                            disabled={actionLoading}
                            className="text-subtext-light dark:text-subtext-dark hover:text-primary transition"
                            title="Edit"
                          >
                            <span className="material-icons-outlined text-lg">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={actionLoading}
                            className="text-subtext-light dark:text-subtext-dark hover:text-red-500 transition"
                            title="Delete"
                          >
                            <span className="material-icons-outlined text-lg">delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => { setShowUploadModal(false); fetchDocuments() }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingDocument && (
        <EditDocumentModal
          document={editingDocument}
          onClose={() => { setShowEditModal(false); setEditingDocument(null) }}
          onSuccess={() => { setShowEditModal(false); setEditingDocument(null); fetchDocuments() }}
        />
      )}
    </div>
  )
}

function UploadModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [metadata, setMetadata] = useState({
    name: '',
    description: '',
    category: 'other',
    isSensitive: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
      if (!metadata.name) setMetadata(prev => ({ ...prev, name: droppedFile.name }))
    }
  }

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (!metadata.name) setMetadata(prev => ({ ...prev, name: selectedFile.name }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file')
      return
    }
    try {
      setLoading(true)
      setError(null)
      await documentsService.uploadDocument(file, metadata)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to upload document')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Upload Document</h2>
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

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-border-light dark:border-border-dark hover:border-primary/50'
            }`}
          >
            <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
            <span className="material-icons-outlined text-4xl text-subtext-light dark:text-subtext-dark mb-2">cloud_upload</span>
            {file ? (
              <div>
                <p className="text-sm font-medium text-text-light dark:text-text-dark">{file.name}</p>
                <p className="text-xs text-subtext-light dark:text-subtext-dark">{formatFileSize(file.size)}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-text-light dark:text-text-dark">Drop a file here or click to browse</p>
                <p className="text-xs text-subtext-light dark:text-subtext-dark mt-1">PDF, DOC, XLS, images, and more</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Name</label>
            <input
              type="text"
              value={metadata.name}
              onChange={(e) => setMetadata({ ...metadata, name: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Document name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Description</label>
            <input
              type="text"
              value={metadata.description}
              onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Optional description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Category</label>
            <select
              value={metadata.category}
              onChange={(e) => setMetadata({ ...metadata, category: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {CATEGORY_OPTIONS.filter(o => o.value).map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={metadata.isSensitive}
                onChange={(e) => setMetadata({ ...metadata, isSensitive: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
            <span className="text-sm text-text-light dark:text-text-dark">Sensitive document</span>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 text-text-light dark:text-text-dark transition">
              Cancel
            </button>
            <button type="submit" disabled={loading || !file} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition">
              {loading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditDocumentModal({ document, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: document.name || '',
    description: document.description || '',
    category: document.category || 'other',
    is_sensitive: document.is_sensitive || false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      await documentsService.updateDocument(document.id, formData)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to update document')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Edit Document</h2>
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
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {CATEGORY_OPTIONS.filter(o => o.value).map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_sensitive}
                onChange={(e) => setFormData({ ...formData, is_sensitive: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
            <span className="text-sm text-text-light dark:text-text-dark">Sensitive document</span>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 text-text-light dark:text-text-dark transition">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
