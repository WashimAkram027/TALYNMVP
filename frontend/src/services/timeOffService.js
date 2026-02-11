import api from './api'

/**
 * Time Off Service
 * API client for time off management - routes through backend
 */
export const timeOffService = {
  /**
   * Get time off policies for an organization
   * @param {string} orgId - Not used, backend uses auth token
   */
  async getPolicies(orgId) {
    const response = await api.get('/timeoff/policies')
    return response.data
  },

  /**
   * Create a time off policy
   * @param {Object} policy - Policy data
   */
  async createPolicy(policy) {
    const response = await api.post('/timeoff/policies', policy)
    return response.data
  },

  /**
   * Update a time off policy
   * @param {string} policyId - Policy UUID
   * @param {Object} updates - Fields to update
   */
  async updatePolicy(policyId, updates) {
    const response = await api.put(`/timeoff/policies/${policyId}`, updates)
    return response.data
  },

  /**
   * Delete (deactivate) a time off policy
   * @param {string} policyId - Policy UUID
   */
  async deletePolicy(policyId) {
    await api.delete(`/timeoff/policies/${policyId}`)
    return { success: true }
  },

  /**
   * Get employee time off balances
   * @param {string} memberId - Member UUID
   * @param {number} year - Year (default current year)
   */
  async getBalances(memberId, year = new Date().getFullYear()) {
    const response = await api.get(`/timeoff/balances/${memberId}?year=${year}`)
    return response.data
  },

  /**
   * Initialize balances for a new year/employee
   * @param {string} memberId - Member UUID
   * @param {string} orgId - Not used, backend uses auth token
   * @param {number} year - Year (default current year)
   */
  async initializeBalances(memberId, orgId, year = new Date().getFullYear()) {
    const response = await api.post(`/timeoff/balances/${memberId}/initialize`, { year })
    return response.data
  },

  /**
   * Get time off requests
   * @param {Object} filters - Optional filters (memberId, status, fromDate, toDate)
   */
  async getRequests(filters = {}) {
    const params = new URLSearchParams()

    if (filters.memberId) params.append('memberId', filters.memberId)
    if (filters.status) params.append('status', filters.status)
    if (filters.fromDate) params.append('fromDate', filters.fromDate)
    if (filters.toDate) params.append('toDate', filters.toDate)

    const queryString = params.toString()
    const url = queryString ? `/timeoff/requests?${queryString}` : '/timeoff/requests'

    const response = await api.get(url)
    return response.data
  },

  /**
   * Request time off
   * @param {string} policyId - Policy UUID
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @param {string} reason - Optional reason
   */
  async requestTimeOff(policyId, startDate, endDate, reason = null) {
    const response = await api.post('/timeoff/requests', {
      policyId,
      startDate,
      endDate,
      reason
    })
    return response.data
  },

  /**
   * Review (approve/reject) time off request
   * @param {string} requestId - Request UUID
   * @param {boolean} approved - Whether to approve or reject
   * @param {string} notes - Optional review notes
   */
  async reviewRequest(requestId, approved, notes = null) {
    const response = await api.put(`/timeoff/requests/${requestId}/review`, {
      approved,
      notes
    })
    return response.data
  },

  /**
   * Cancel a pending request
   * @param {string} requestId - Request UUID
   */
  async cancelRequest(requestId) {
    const response = await api.put(`/timeoff/requests/${requestId}/cancel`)
    return response.data
  },

  /**
   * Get upcoming time off for an employee
   * @param {string} memberId - Member UUID
   */
  async getUpcomingTimeOff(memberId) {
    const response = await api.get(`/timeoff/member/${memberId}/upcoming`)
    return response.data
  }
}
