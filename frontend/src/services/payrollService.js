import api from './api'

/**
 * Payroll Service
 * API client for payroll management - routes through backend
 */
export const payrollService = {
  /**
   * Get all payroll runs for an organization
   * @param {string} orgId - Not used, backend uses auth token
   * @param {Object} filters - Optional filters (status, fromDate, toDate)
   */
  async getPayrollRuns(orgId, filters = {}) {
    const params = new URLSearchParams()

    if (filters.status) params.append('status', filters.status)
    if (filters.fromDate) params.append('fromDate', filters.fromDate)
    if (filters.toDate) params.append('toDate', filters.toDate)

    const queryString = params.toString()
    const url = queryString ? `/payroll/runs?${queryString}` : '/payroll/runs'

    const response = await api.get(url)
    return response.data
  },

  /**
   * Get a single payroll run with items
   * @param {string} runId - Payroll run UUID
   */
  async getPayrollRun(runId) {
    const response = await api.get(`/payroll/runs/${runId}`)
    return response.data
  },

  /**
   * Create a new payroll run
   * @param {string} orgId - Not used, backend uses auth token
   * @param {string} payPeriodStart - Start date of pay period
   * @param {string} payPeriodEnd - End date of pay period
   * @param {string} payDate - Date of payment
   */
  async createPayrollRun(orgId, payPeriodStart, payPeriodEnd, payDate) {
    const response = await api.post('/payroll/runs', {
      payPeriodStart,
      payPeriodEnd,
      payDate
    })
    return response.data
  },

  /**
   * Update payroll run status
   * @param {string} runId - Payroll run UUID
   * @param {string} status - New status (draft, processing, completed, cancelled)
   */
  async updatePayrollRunStatus(runId, status) {
    const response = await api.put(`/payroll/runs/${runId}/status`, { status })
    return response.data
  },

  /**
   * Update a payroll item
   * @param {string} itemId - Payroll item UUID
   * @param {Object} updates - Fields to update
   */
  async updatePayrollItem(itemId, updates) {
    const response = await api.put(`/payroll/items/${itemId}`, updates)
    return response.data
  },

  /**
   * Get upcoming payroll
   * @param {string} orgId - Not used, backend uses auth token
   */
  async getUpcomingPayroll(orgId) {
    const response = await api.get('/payroll/upcoming')
    return response.data
  },

  /**
   * Get employee payroll history
   * @param {string} memberId - Member UUID
   * @param {number} limit - Maximum number of records to return
   */
  async getEmployeePayrollHistory(memberId, limit = 12) {
    const response = await api.get(`/payroll/member/${memberId}/history?limit=${limit}`)
    return response.data
  },

  /**
   * Delete a payroll run (only if draft)
   * @param {string} runId - Payroll run UUID
   */
  async deletePayrollRun(runId) {
    await api.delete(`/payroll/runs/${runId}`)
    return { success: true }
  }
}
