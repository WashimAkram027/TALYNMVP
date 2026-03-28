import api from './api'

/**
 * Nepal Leave Service — wraps /api/leave/* endpoints
 * Implements Labour Act 2074 leave types: sick, home, maternity, paternity, mourning, special, compensatory
 */
export const leaveService = {
  // ─── Balances ──────────────────────────────────────────────

  async getBalanceSummary(memberId) {
    const response = await api.get(`/leave/balance/${memberId}`)
    return response.data
  },

  async getBalance(memberId, type) {
    const response = await api.get(`/leave/balance/${memberId}/${type}`)
    return response.data
  },

  // ─── Requests ──────────────────────────────────────────────

  async listRequests(filters = {}) {
    const params = new URLSearchParams()
    if (filters.memberId) params.append('memberId', filters.memberId)
    if (filters.status) params.append('status', filters.status)
    if (filters.leaveType) params.append('leaveType', filters.leaveType)
    const query = params.toString()
    const response = await api.get(`/leave/requests${query ? `?${query}` : ''}`)
    return response.data
  },

  async createRequest(data) {
    const response = await api.post('/leave/requests', data)
    return response.data
  },

  async approveRequest(requestId) {
    const response = await api.put(`/leave/requests/${requestId}/approve`)
    return response.data
  },

  async rejectRequest(requestId, reason) {
    const response = await api.put(`/leave/requests/${requestId}/reject`, { reason })
    return response.data
  },

  // ─── Event-Triggered Leave ─────────────────────────────────

  async createMaternityRequest(data) {
    const response = await api.post('/leave/requests/maternity', data)
    return response.data
  },

  async createPaternityRequest(data) {
    const response = await api.post('/leave/requests/paternity', data)
    return response.data
  },

  async createMourningRequest(data) {
    const response = await api.post('/leave/requests/mourning', data)
    return response.data
  },

  async createSpecialRequest(data) {
    const response = await api.post('/leave/requests/special', data)
    return response.data
  },

  async recordCompensatoryWork(data) {
    const response = await api.post('/leave/compensatory-work', data)
    return response.data
  },

  // ─── Public Holidays ───────────────────────────────────────

  async getPublicHolidays(fiscalYear) {
    const params = fiscalYear ? `?fiscalYear=${fiscalYear}` : ''
    const response = await api.get(`/leave/public-holidays${params}`)
    return response.data
  },

  // ─── Encashment ────────────────────────────────────────────

  async calculateEncashment(memberId, terminationDate) {
    const response = await api.post(`/leave/encashment/${memberId}`, { terminationDate })
    return response.data
  }
}
