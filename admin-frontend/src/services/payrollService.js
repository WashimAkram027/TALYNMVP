import api from './api'

const payrollService = {
  async listRuns(params = {}) {
    const { data } = await api.get('/admin/payroll', { params })
    return data.data
  },

  async getRunDetail(id) {
    const { data } = await api.get(`/admin/payroll/${id}`)
    return data.data
  },

  async approve(id, notes) {
    const { data } = await api.post(`/admin/payroll/${id}/approve`, { notes })
    return data.data
  },

  async reject(id, notes) {
    const { data } = await api.post(`/admin/payroll/${id}/reject`, { notes })
    return data.data
  },

  async updateItem(itemId, updates) {
    const { data } = await api.put(`/admin/payroll/items/${itemId}`, updates)
    return data.data
  },

  async regenerate(id) {
    const { data } = await api.post(`/admin/payroll/${id}/regenerate`)
    return data.data
  },

  async resolveReview(itemId, resolutionNotes) {
    const { data } = await api.post(`/admin/payroll/items/${itemId}/resolve-review`, { resolutionNotes })
    return data.data
  },

  async employerEditItem(itemId, updates) {
    const { data } = await api.put(`/admin/payroll/items/${itemId}/employer-edit`, updates)
    return data.data
  }
}

export default payrollService
