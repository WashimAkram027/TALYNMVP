import api from './api'

/**
 * Dashboard onboarding checklist API service
 */
export const onboardingService = {
  /**
   * Get checklist status for all 4 steps
   */
  getChecklist: async () => {
    const response = await api.get('/onboarding/employer/checklist')
    return response.data
  },

  /**
   * Step 1: Complete org profile enrichment
   */
  completeOrgProfile: async (data) => {
    const response = await api.post('/onboarding/employer/org-profile', data)
    return response.data
  },

  /**
   * Step 2: Upload an entity document
   */
  uploadEntityDocument: async ({ docType, fileBase64, fileName, fileType }) => {
    const response = await api.post('/onboarding/employer/entity-document', {
      docType,
      fileBase64,
      fileName,
      fileType
    })
    return response.data
  },

  /**
   * Step 2: Delete an entity document
   */
  deleteEntityDocument: async (docType) => {
    const response = await api.delete(`/onboarding/employer/entity-document/${docType}`)
    return response.data
  },

  /**
   * Step 2: Submit entity for review
   */
  submitEntity: async () => {
    const response = await api.post('/onboarding/employer/submit-entity')
    return response.data
  }
}
