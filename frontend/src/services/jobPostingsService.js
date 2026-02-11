import api from './api'

export const jobPostingsService = {
  async getJobPostings(orgId, filters = {}) {
    const params = new URLSearchParams()
    if (filters.status) params.append('status', filters.status)
    if (filters.department) params.append('department', filters.department)
    const queryString = params.toString()
    const url = queryString ? `/jobs?${queryString}` : '/jobs'
    const response = await api.get(url)
    return response.data
  },

  async getPublicJobPostings(filters = {}) {
    const params = new URLSearchParams()
    if (filters.search) params.append('search', filters.search)
    if (filters.employmentType) params.append('employmentType', filters.employmentType)
    if (filters.isRemote !== undefined) params.append('isRemote', filters.isRemote)
    if (filters.limit) params.append('limit', filters.limit)
    const queryString = params.toString()
    const url = queryString ? `/jobs/public?${queryString}` : '/jobs/public'
    const response = await api.get(url)
    return response.data
  },

  async getJobPosting(jobId) {
    const response = await api.get(`/jobs/${jobId}`)
    return response.data
  },

  async createJobPosting(jobPosting) {
    const response = await api.post('/jobs', jobPosting)
    return response.data
  },

  async updateJobPosting(jobId, updates) {
    const response = await api.put(`/jobs/${jobId}`, updates)
    return response.data
  },

  async deleteJobPosting(jobId) {
    await api.delete(`/jobs/${jobId}`)
    return { success: true }
  },

  async getDepartments(orgId) {
    const response = await api.get('/jobs/departments')
    return response.data
  },

  async updateApplicationCount(jobId) {
    // This is now handled automatically by the backend
    return { success: true }
  }
}
