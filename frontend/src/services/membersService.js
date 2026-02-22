import api from './api'

/**
 * Members Service
 * API client for organization member management
 */
export const membersService = {
  /**
   * Get all members of the organization
   * @param {Object} filters - Optional filters (status, memberRole, department, search)
   */
  async getMembers(filters = {}) {
    const params = new URLSearchParams()

    if (filters.status) params.append('status', filters.status)
    if (filters.memberRole) params.append('memberRole', filters.memberRole)
    if (filters.department) params.append('department', filters.department)
    if (filters.employmentType) params.append('employmentType', filters.employmentType)
    if (filters.search) params.append('search', filters.search)

    const queryString = params.toString()
    const url = queryString ? `/members?${queryString}` : '/members'

    const response = await api.get(url)
    return response.data
  },

  /**
   * Get a single member with full details
   * @param {string} memberId - Member UUID
   */
  async getMember(memberId) {
    const response = await api.get(`/members/${memberId}`)
    return response.data
  },

  /**
   * Get member statistics
   */
  async getMemberStats() {
    const response = await api.get('/members/stats')
    return response.data
  },

  /**
   * Invite a new member to the organization
   * @param {Object} memberData - Member invitation data
   */
  async inviteMember(memberData) {
    const response = await api.post('/members', {
      email: memberData.email,
      memberRole: memberData.member_role || memberData.memberRole,
      jobTitle: memberData.job_title || memberData.jobTitle,
      department: memberData.department,
      employmentType: memberData.employment_type || memberData.employmentType,
      salaryAmount: memberData.salary_amount || memberData.salaryAmount,
      salaryCurrency: memberData.salary_currency || memberData.salaryCurrency,
      payFrequency: memberData.pay_frequency || memberData.payFrequency,
      location: memberData.location,
      startDate: memberData.start_date || memberData.startDate,
      jobDescription: memberData.job_description || memberData.jobDescription,
      probationPeriod: memberData.probation_period || memberData.probationPeriod
    })
    return response.data
  },

  /**
   * Update member details
   * @param {string} memberId - Member UUID
   * @param {Object} updates - Fields to update
   */
  async updateMember(memberId, updates) {
    // Convert camelCase to snake_case for API
    const apiUpdates = {}
    if (updates.memberRole !== undefined) apiUpdates.member_role = updates.memberRole
    if (updates.member_role !== undefined) apiUpdates.member_role = updates.member_role
    if (updates.jobTitle !== undefined) apiUpdates.job_title = updates.jobTitle
    if (updates.job_title !== undefined) apiUpdates.job_title = updates.job_title
    if (updates.department !== undefined) apiUpdates.department = updates.department
    if (updates.employmentType !== undefined) apiUpdates.employment_type = updates.employmentType
    if (updates.employment_type !== undefined) apiUpdates.employment_type = updates.employment_type
    if (updates.salaryAmount !== undefined) apiUpdates.salary_amount = updates.salaryAmount
    if (updates.salary_amount !== undefined) apiUpdates.salary_amount = updates.salary_amount
    if (updates.salaryCurrency !== undefined) apiUpdates.salary_currency = updates.salaryCurrency
    if (updates.salary_currency !== undefined) apiUpdates.salary_currency = updates.salary_currency
    if (updates.payFrequency !== undefined) apiUpdates.pay_frequency = updates.payFrequency
    if (updates.pay_frequency !== undefined) apiUpdates.pay_frequency = updates.pay_frequency
    if (updates.location !== undefined) apiUpdates.location = updates.location
    if (updates.startDate !== undefined) apiUpdates.start_date = updates.startDate
    if (updates.start_date !== undefined) apiUpdates.start_date = updates.start_date
    if (updates.status !== undefined) apiUpdates.status = updates.status

    const response = await api.put(`/members/${memberId}`, apiUpdates)
    return response.data
  },

  /**
   * Activate an invited member
   * @param {string} memberId - Member UUID
   */
  async activateMember(memberId) {
    const response = await api.post(`/members/${memberId}/activate`)
    return response.data
  },

  /**
   * Offboard a member
   * @param {string} memberId - Member UUID
   */
  async offboardMember(memberId) {
    const response = await api.post(`/members/${memberId}/offboard`)
    return response.data
  },

  /**
   * Delete a member (only for invited status)
   * @param {string} memberId - Member UUID
   */
  async deleteMember(memberId) {
    const response = await api.delete(`/members/${memberId}`)
    return response.data
  },

  /**
   * Resend invitation to an invited member
   * @param {string} memberId - Member UUID
   */
  async resendInvitation(memberId) {
    const response = await api.post(`/members/${memberId}/resend-invitation`)
    return response.data
  },

  /**
   * Get unique departments from members
   */
  async getDepartments() {
    const response = await api.get('/organization/departments')
    return response.data
  },

  /**
   * Get available candidates for hiring (not in any organization)
   */
  async getAvailableCandidates() {
    const response = await api.get('/members/available-candidates')
    return response.data
  }
}

/**
 * Organization Service
 * API client for organization management
 */
export const organizationService = {
  /**
   * Get current organization
   */
  async getOrganization() {
    const response = await api.get('/organization')
    return response.data
  },

  /**
   * Update organization details
   * @param {Object} updates - Fields to update
   */
  async updateOrganization(updates) {
    const response = await api.put('/organization', updates)
    return response.data
  },

  /**
   * Get organization statistics
   */
  async getStats() {
    const response = await api.get('/organization/stats')
    return response.data
  },

  /**
   * Update organization settings
   * @param {Object} settings - Settings to update
   */
  async updateSettings(settings) {
    const response = await api.put('/organization/settings', { settings })
    return response.data
  }
}
