import api from './api'

export const invoicesService = {
  async getInvoices(orgId, filters = {}) {
    const params = new URLSearchParams()
    if (filters.status) params.append('status', filters.status)
    if (filters.fromDate) params.append('fromDate', filters.fromDate)
    if (filters.toDate) params.append('toDate', filters.toDate)
    if (filters.search) params.append('search', filters.search)
    const queryString = params.toString()
    const url = queryString ? `/invoices?${queryString}` : '/invoices'
    const response = await api.get(url)
    return response.data
  },

  async getInvoice(invoiceId) {
    const response = await api.get(`/invoices/${invoiceId}`)
    return response.data
  },

  async generateInvoiceNumber(orgId) {
    const response = await api.get('/invoices/generate-number')
    return response.data.invoiceNumber
  },

  async createInvoice(invoice) {
    const response = await api.post('/invoices', invoice)
    return response.data
  },

  async updateInvoice(invoiceId, updates) {
    const response = await api.put(`/invoices/${invoiceId}`, updates)
    return response.data
  },

  async deleteInvoice(invoiceId) {
    await api.delete(`/invoices/${invoiceId}`)
    return { success: true }
  },

  async getInvoiceStats(orgId) {
    const response = await api.get('/invoices/stats')
    return response.data
  },

  async getOverdueInvoices(orgId) {
    const response = await api.get('/invoices/overdue')
    return response.data
  },

  async updateOverdueStatus(orgId) {
    const response = await api.post('/invoices/update-overdue')
    return response.data
  }
}
