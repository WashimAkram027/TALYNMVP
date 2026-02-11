import api from './api'

/**
 * Profile Service
 * API client for profile management - routes through backend
 */
export const profileService = {
  /**
   * Get current user's profile
   */
  async getMyProfile() {
    const response = await api.get('/profile')
    return response.data
  },

  /**
   * Get a profile by ID (uses same endpoint, backend validates access)
   * @param {string} profileId - Profile UUID
   */
  async getProfile(profileId) {
    // For now, redirect to getMyProfile since backend only supports authenticated user's profile
    // If you need other profiles, a new endpoint would be needed
    const response = await api.get('/profile')
    return response.data
  },

  /**
   * Update profile
   * @param {string} profileId - Profile UUID (not used, backend uses auth token)
   * @param {Object} updates - Fields to update
   */
  async updateProfile(profileId, updates) {
    const response = await api.put('/profile', updates)
    return response.data
  },

  /**
   * Complete employer signup
   * @param {string} firstName
   * @param {string} lastName
   * @param {string} industry
   * @param {string} industryOther - Optional, used when industry is 'other'
   */
  async completeEmployerSignup(firstName, lastName, industry, industryOther = null) {
    const response = await api.post('/profile/complete-employer', {
      firstName,
      lastName,
      industry,
      industryOther
    })
    return response.data
  },

  /**
   * Complete candidate signup
   * @param {string} firstName
   * @param {string} lastName
   * @param {string} resumeUrl - Optional
   * @param {string} resumeFilename - Optional
   * @param {string} linkedinUrl - Optional
   */
  async completeCandidateSignup(firstName, lastName, resumeUrl = null, resumeFilename = null, linkedinUrl = null) {
    const response = await api.post('/profile/complete-candidate', {
      firstName,
      lastName,
      resumeUrl,
      resumeFilename,
      linkedinUrl
    })
    return response.data
  },

  /**
   * Update last login (handled by backend on login)
   * This is now a no-op on frontend as backend handles it
   */
  async updateLastLogin() {
    // Backend handles this during login
    return { success: true }
  },

  /**
   * Check if email exists
   * @param {string} email
   * @returns {Promise<boolean>}
   */
  async checkEmailExists(email) {
    const response = await api.post('/profile/check-email', { email })
    return response.data.exists
  },

  /**
   * Upload avatar
   * @param {string} userId - Not used, backend uses auth token
   * @param {File} file - The image file to upload
   * @returns {Promise<string>} - The public URL of the uploaded avatar
   */
  async uploadAvatar(userId, file) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    return response.data.url
  },

  /**
   * Upload resume
   * @param {string} userId - Not used, backend uses auth token
   * @param {File} file - The resume file to upload
   * @returns {Promise<{url: string, filename: string}>}
   */
  async uploadResume(userId, file) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/profile/resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    return {
      url: response.data.url,
      filename: response.data.filename
    }
  }
}
