import api from './api'

export const complianceService = {
  async getComplianceItems(orgId, filters = {}) {
    const params = new URLSearchParams()
    if (filters.status) params.append('status', filters.status)
    if (filters.itemType) params.append('itemType', filters.itemType)
    if (filters.memberId) params.append('memberId', filters.memberId)
    if (filters.isRequired !== undefined) params.append('isRequired', filters.isRequired)
    const queryString = params.toString()
    const url = queryString ? `/compliance/items?${queryString}` : '/compliance/items'
    const response = await api.get(url)
    return response.data
  },

  async getMemberComplianceItems(memberId) {
    const response = await api.get(`/compliance/items/member/${memberId}`)
    return response.data
  },

  async createComplianceItem(item) {
    const response = await api.post('/compliance/items', item)
    return response.data
  },

  async updateComplianceItem(itemId, updates) {
    const response = await api.put(`/compliance/items/${itemId}`, updates)
    return response.data
  },

  async deleteComplianceItem(itemId) {
    await api.delete(`/compliance/items/${itemId}`)
    return { success: true }
  },

  async getAlerts(orgId, filters = {}) {
    const params = new URLSearchParams()
    if (filters.includeRead) params.append('includeRead', 'true')
    if (filters.includeDismissed) params.append('includeDismissed', 'true')
    if (filters.alertType) params.append('alertType', filters.alertType)
    const queryString = params.toString()
    const url = queryString ? `/compliance/alerts?${queryString}` : '/compliance/alerts'
    const response = await api.get(url)
    return response.data
  },

  async createAlert(alert) {
    const response = await api.post('/compliance/alerts', alert)
    return response.data
  },

  async markAlertRead(alertId) {
    const response = await api.put(`/compliance/alerts/${alertId}/read`)
    return response.data
  },

  async dismissAlert(alertId) {
    const response = await api.put(`/compliance/alerts/${alertId}/dismiss`)
    return response.data
  },

  async getComplianceScore(orgId) {
    const response = await api.get('/compliance/score')
    return response.data.score
  },

  async getItemsDueSoon(orgId, daysAhead = 30) {
    const response = await api.get(`/compliance/items/due-soon?daysAhead=${daysAhead}`)
    return response.data
  }
}
