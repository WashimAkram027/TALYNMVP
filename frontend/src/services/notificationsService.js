import api from './api'

export const notificationsService = {
  async getNotifications(params = {}) {
    const query = new URLSearchParams()
    if (params.unread !== undefined) query.append('unread', params.unread)
    if (params.dismissed !== undefined) query.append('dismissed', params.dismissed)
    if (params.type) query.append('type', params.type)
    if (params.limit) query.append('limit', params.limit)
    if (params.offset) query.append('offset', params.offset)
    const qs = query.toString()
    const response = await api.get(`/notifications${qs ? '?' + qs : ''}`)
    return response.data
  },

  async getUnreadCount() {
    const response = await api.get('/notifications/unread-count')
    return response.data?.count ?? 0
  },

  async markRead(id) {
    const response = await api.patch(`/notifications/${id}/read`)
    return response.data
  },

  async dismiss(id) {
    const response = await api.patch(`/notifications/${id}/dismiss`)
    return response.data
  },

  async markAllRead() {
    const response = await api.patch('/notifications/read-all')
    return response.data
  }
}
