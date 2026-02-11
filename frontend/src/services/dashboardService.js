import api from './api'

export const dashboardService = {
  // Get employer dashboard statistics
  async getEmployerStats() {
    const response = await api.get('/dashboard/employer')
    return response.data
  },

  // Get team overview for dashboard table
  async getTeamOverview(limit = 5) {
    const response = await api.get(`/dashboard/team-overview?limit=${limit}`)
    return response.data
  },

  // Get employee dashboard statistics
  async getEmployeeStats() {
    const response = await api.get('/dashboard/employee')
    return response.data
  },

  // Get upcoming holidays
  async getHolidays(limit = 6) {
    const response = await api.get(`/dashboard/holidays?limit=${limit}`)
    return response.data
  },

  // Get company announcements
  async getAnnouncements(limit = 3) {
    const response = await api.get(`/dashboard/announcements?limit=${limit}`)
    return response.data
  }
}
