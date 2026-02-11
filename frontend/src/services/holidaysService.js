import api from './api'

export const holidaysService = {
  async getHolidays(orgId = null, year = new Date().getFullYear()) {
    const response = await api.get(`/holidays?year=${year}`)
    return response.data
  },

  async getUpcomingHolidays(orgId = null, limit = 6) {
    const response = await api.get(`/holidays/upcoming?limit=${limit}`)
    return response.data
  },

  async createHoliday(holiday) {
    const response = await api.post('/holidays', holiday)
    return response.data
  },

  async updateHoliday(holidayId, updates) {
    const response = await api.put(`/holidays/${holidayId}`, updates)
    return response.data
  },

  async deleteHoliday(holidayId) {
    await api.delete(`/holidays/${holidayId}`)
    return { success: true }
  },

  async copyGlobalHolidays(orgId, year = new Date().getFullYear()) {
    const response = await api.post('/holidays/copy-global', { year })
    return response.data
  }
}
