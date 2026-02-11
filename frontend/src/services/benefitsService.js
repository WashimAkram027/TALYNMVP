import api from './api'

export const benefitsService = {
  async getPlans(orgId, activeOnly = true) {
    const response = await api.get(`/benefits/plans?activeOnly=${activeOnly}`)
    return response.data
  },

  async getPlan(planId) {
    const response = await api.get(`/benefits/plans/${planId}`)
    return response.data
  },

  async createPlan(plan) {
    const response = await api.post('/benefits/plans', plan)
    return response.data
  },

  async updatePlan(planId, updates) {
    const response = await api.put(`/benefits/plans/${planId}`, updates)
    return response.data
  },

  async deletePlan(planId) {
    await api.delete(`/benefits/plans/${planId}`)
    return { success: true }
  },

  async getMemberEnrollments(memberId) {
    const response = await api.get(`/benefits/member/${memberId}/enrollments`)
    return response.data
  },

  async getPlanEnrollments(planId) {
    const response = await api.get(`/benefits/plans/${planId}/enrollments`)
    return response.data
  },

  async enrollMember(memberId, planId, coverageStartDate) {
    const response = await api.post('/benefits/enrollments', { memberId, planId, coverageStartDate })
    return response.data
  },

  async updateEnrollment(enrollmentId, updates) {
    const response = await api.put(`/benefits/enrollments/${enrollmentId}`, updates)
    return response.data
  },

  async cancelEnrollment(enrollmentId, coverageEndDate = null) {
    const response = await api.put(`/benefits/enrollments/${enrollmentId}/cancel`, { coverageEndDate })
    return response.data
  },

  async getActiveCoverage(memberId) {
    const response = await api.get(`/benefits/member/${memberId}/coverage`)
    return response.data
  }
}
