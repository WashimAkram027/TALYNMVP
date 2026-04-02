import api from './api'

export const authorizedUsersService = {
  async list() {
    const response = await api.get('/authorized-users')
    return response.data
  },

  async invite({ firstName, lastName, email }) {
    const response = await api.post('/authorized-users', { firstName, lastName, email })
    return response.data
  },

  async revoke(memberId) {
    const response = await api.delete(`/authorized-users/${memberId}`)
    return response.data
  },

  async resendInvitation(memberId) {
    const response = await api.post(`/authorized-users/${memberId}/resend`)
    return response.data
  },

  async validateToken(token) {
    const response = await api.get(`/authorized-users/validate-token?token=${encodeURIComponent(token)}`)
    return response.data
  },

  async setupAccount({ token, password }) {
    const response = await api.post('/authorized-users/setup', { token, password })
    return response.data
  }
}
