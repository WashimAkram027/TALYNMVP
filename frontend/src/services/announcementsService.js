import api from './api'

export const announcementsService = {
  async getAnnouncements(orgId, filters = {}) {
    const params = new URLSearchParams()
    if (filters.publishedOnly) params.append('publishedOnly', 'true')
    if (filters.limit) params.append('limit', filters.limit)
    const queryString = params.toString()
    const url = queryString ? `/announcements?${queryString}` : '/announcements'
    const response = await api.get(url)
    return response.data
  },

  async getAnnouncement(announcementId) {
    const response = await api.get(`/announcements/${announcementId}`)
    return response.data
  },

  async createAnnouncement(announcement) {
    const response = await api.post('/announcements', announcement)
    return response.data
  },

  async updateAnnouncement(announcementId, updates) {
    const response = await api.put(`/announcements/${announcementId}`, updates)
    return response.data
  },

  async deleteAnnouncement(announcementId) {
    await api.delete(`/announcements/${announcementId}`)
    return { success: true }
  },

  async togglePin(announcementId) {
    const response = await api.put(`/announcements/${announcementId}/toggle-pin`)
    return response.data
  },

  async getRecentAnnouncements(orgId, limit = 5) {
    const response = await api.get(`/announcements/recent?limit=${limit}`)
    return response.data
  }
}
