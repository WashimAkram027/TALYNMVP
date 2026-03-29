import api from './api'

const usersService = {
  async list(params = {}) {
    const { data } = await api.get('/admin/users', { params })
    return data.data
  },

  async getDetail(id) {
    const { data } = await api.get(`/admin/users/${id}`)
    return data.data
  },

  async suspend(id, reason) {
    const { data } = await api.post(`/admin/users/${id}/suspend`, { reason })
    return data.data
  },

  async reactivate(id) {
    const { data } = await api.post(`/admin/users/${id}/reactivate`)
    return data.data
  },

  async resetPassword(id) {
    const { data } = await api.post(`/admin/users/${id}/reset-password`)
    return data.data
  },

  async verifyEmail(id) {
    const { data } = await api.post(`/admin/users/${id}/verify-email`)
    return data.data
  },

  async update(id, updates) {
    const { data } = await api.put(`/admin/users/${id}`, updates)
    return data.data
  },

  async deleteUser(id) {
    const { data } = await api.delete(`/admin/users/${id}`)
    return data
  }
}

export default usersService
