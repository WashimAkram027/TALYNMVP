import api from './api'

export const quoteService = {
  async getCostConfig(country = 'NPL') {
    const response = await api.get(`/quotes/cost-config?country=${country}`)
    return response.data
  },

  async generateQuote(employeeData) {
    const response = await api.post('/quotes/generate', {
      email: employeeData.email,
      firstName: employeeData.firstName,
      lastName: employeeData.lastName,
      jobTitle: employeeData.jobTitle,
      department: employeeData.department,
      employmentType: employeeData.employmentType,
      salaryAmount: employeeData.salaryAmount,
      salaryCurrency: employeeData.salaryCurrency,
      payFrequency: employeeData.payFrequency,
      startDate: employeeData.startDate
    })
    return response.data
  },

  async acceptAndInvite(quoteId) {
    const response = await api.post(`/quotes/${quoteId}/accept-and-invite`)
    return response.data
  },

  async getQuote(quoteId) {
    const response = await api.get(`/quotes/${quoteId}`)
    return response.data
  },

  async listQuotes(filters = {}) {
    const params = new URLSearchParams()
    if (filters.status) params.append('status', filters.status)
    const queryString = params.toString()
    const url = queryString ? `/quotes?${queryString}` : '/quotes'
    const response = await api.get(url)
    return response.data
  },

  async downloadQuotePdf(quoteId) {
    // Interceptor already unwraps response.data, so result IS the Blob
    const blob = await api.get(`/quotes/${quoteId}/pdf`, { responseType: 'blob' })
    return blob
  }
}
