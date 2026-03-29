import api from './api'

const dashboardService = {
  async getMetrics() {
    const { data } = await api.get('/admin/dashboard/metrics')
    return data.data
  },

  async getAlerts() {
    const { data } = await api.get('/admin/dashboard/alerts')
    return data.data
  },

  async getPendingOnboardings() {
    const { data } = await api.get('/admin/dashboard/pending-onboardings')
    return data.data
  }
}

export default dashboardService
