import api from './api'

/**
 * Documents Service
 * API client for document management - routes through backend
 */
export const documentsService = {
  /**
   * Get documents for the organization
   * @param {Object} filters - Optional filters (category, memberId, search)
   */
  async getDocuments(filters = {}) {
    const params = new URLSearchParams()

    if (filters.category) params.append('category', filters.category)
    if (filters.memberId) params.append('memberId', filters.memberId)
    if (filters.search) params.append('search', filters.search)

    const queryString = params.toString()
    const url = queryString ? `/documents?${queryString}` : '/documents'

    const response = await api.get(url)
    return response.data
  },

  /**
   * Get documents for a specific member
   * @param {string} memberId - Member UUID
   */
  async getMemberDocuments(memberId) {
    const response = await api.get(`/documents/member/${memberId}`)
    return response.data
  },

  /**
   * Get a single document by ID
   * @param {string} documentId - Document UUID
   */
  async getDocument(documentId) {
    const response = await api.get(`/documents/${documentId}`)
    return response.data
  },

  /**
   * Upload a document
   * @param {File} file - The file to upload
   * @param {Object} metadata - Document metadata
   * @param {string} metadata.name - Optional display name
   * @param {string} metadata.description - Optional description
   * @param {string} metadata.category - Category: contract, policy, tax, identity, payslip, other
   * @param {string} metadata.memberId - Optional member to associate with
   * @param {boolean} metadata.isSensitive - Whether the document is sensitive
   */
  async uploadDocument(file, metadata = {}) {
    const formData = new FormData()
    formData.append('file', file)

    if (metadata.name) formData.append('name', metadata.name)
    if (metadata.description) formData.append('description', metadata.description)
    if (metadata.category) formData.append('category', metadata.category)
    if (metadata.memberId) formData.append('memberId', metadata.memberId)
    if (metadata.isSensitive) formData.append('isSensitive', 'true')

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    return response.data
  },

  /**
   * Update document metadata
   * @param {string} documentId - Document UUID
   * @param {Object} updates - Fields to update (name, description, category, is_sensitive)
   */
  async updateDocument(documentId, updates) {
    const response = await api.put(`/documents/${documentId}`, updates)
    return response.data
  },

  /**
   * Delete a document
   * @param {string} documentId - Document UUID
   */
  async deleteDocument(documentId) {
    await api.delete(`/documents/${documentId}`)
    return { success: true }
  },

  /**
   * Get download URL for a document (just returns the document with file_url)
   * @param {string} documentId - Document UUID
   */
  async getDownloadUrl(documentId) {
    const response = await api.get(`/documents/${documentId}`)
    return {
      file_url: response.data.file_url,
      name: response.data.name
    }
  }
}
