import api from './api'

const invoicesService = {
  async list(params = {}) {
    const { data } = await api.get('/admin/invoices', { params })
    return data.data
  },

  async getDetail(id) {
    const { data } = await api.get(`/admin/invoices/${id}`)
    return data.data
  },

  async markAsPaid(id, notes) {
    const { data } = await api.post(`/admin/invoices/${id}/mark-paid`, { notes })
    return data.data
  },

  async resolve(id, notes) {
    const { data } = await api.post(`/admin/invoices/${id}/resolve`, { notes })
    return data.data
  },

  async cancel(id, notes) {
    const { data } = await api.post(`/admin/invoices/${id}/cancel`, { notes })
    return data.data
  }
}

export default invoicesService
