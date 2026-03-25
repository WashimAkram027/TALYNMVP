import api from './api'

const organizationsService = {
  async list(params = {}) {
    const { data } = await api.get('/admin/organizations', { params })
    return data.data
  },

  async getDetail(id) {
    const { data } = await api.get(`/admin/organizations/${id}`)
    return data.data
  },

  async getEntity(id) {
    const { data } = await api.get(`/admin/organizations/${id}/entity`)
    return data.data
  },

  async approveEntity(id) {
    const { data } = await api.post(`/admin/organizations/${id}/entity/approve`)
    return data.data
  },

  async rejectEntity(id, reason) {
    const { data } = await api.post(`/admin/organizations/${id}/entity/reject`, { reason })
    return data.data
  },

  async getMembers(id, params = {}) {
    const { data } = await api.get(`/admin/organizations/${id}/members`, { params })
    return data.data
  },

  async getPaymentMethods(id) {
    const { data } = await api.get(`/admin/organizations/${id}/payment-methods`)
    return data.data
  },

  async getPayrollRuns(id, params = {}) {
    const { data } = await api.get(`/admin/organizations/${id}/payroll-runs`, { params })
    return data.data
  },

  async update(id, data) {
    const { data: res } = await api.put(`/admin/organizations/${id}`, data)
    return res.data
  },

  async suspend(id, reason) {
    const { data: res } = await api.post(`/admin/organizations/${id}/suspend`, { reason })
    return res.data
  },

  async reactivate(id) {
    const { data: res } = await api.post(`/admin/organizations/${id}/reactivate`)
    return res.data
  }
}

export default organizationsService
