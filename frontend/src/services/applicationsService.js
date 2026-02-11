import api from './api'

export const applicationsService = {
  async getApplicationsByJob(jobId, filters = {}) {
    const params = new URLSearchParams()
    if (filters.stage) params.append('stage', filters.stage)
    const queryString = params.toString()
    const url = queryString ? `/applications/job/${jobId}?${queryString}` : `/applications/job/${jobId}`
    const response = await api.get(url)
    return response.data
  },

  async getMyApplications() {
    const response = await api.get('/applications/my')
    return response.data
  },

  async getApplication(applicationId) {
    const response = await api.get(`/applications/${applicationId}`)
    return response.data
  },

  async applyToJob(jobId, applicationData) {
    const response = await api.post('/applications/apply', { jobId, ...applicationData })
    return response.data
  },

  async moveStage(applicationId, newStage, notes = null) {
    const response = await api.put(`/applications/${applicationId}/stage`, { stage: newStage, notes })
    return response.data
  },

  async updateApplication(applicationId, updates) {
    const response = await api.put(`/applications/${applicationId}`, updates)
    return response.data
  },

  async getActivityHistory(applicationId) {
    const response = await api.get(`/applications/${applicationId}/activity`)
    return response.data
  },

  async getPipelineSummary(orgId) {
    const response = await api.get('/applications/pipeline-summary')
    return response.data
  },

  async hasApplied(jobId) {
    const response = await api.get(`/applications/check/${jobId}`)
    return response.data.hasApplied
  }
}
