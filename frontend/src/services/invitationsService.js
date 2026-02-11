import api from './api'

export const invitationsService = {
  /**
   * Get pending invitations for the current user
   */
  async getPending() {
    const response = await api.get('/invitations/pending')
    return response.data
  },

  /**
   * Accept an invitation
   * @param {string} memberId - The organization_members ID
   */
  async accept(memberId) {
    const response = await api.post(`/invitations/${memberId}/accept`)
    return response.data
  },

  /**
   * Decline an invitation
   * @param {string} memberId - The organization_members ID
   */
  async decline(memberId) {
    const response = await api.post(`/invitations/${memberId}/decline`)
    return response.data
  }
}
