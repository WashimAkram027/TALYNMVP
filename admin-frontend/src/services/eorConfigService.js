import api from './api'

const eorConfigService = {
  async list() {
    const { data } = await api.get('/admin/eor-config')
    return data.data
  },

  async update(id, updates) {
    const { data } = await api.put(`/admin/eor-config/${id}`, updates)
    return data.data
  }
}

export default eorConfigService
