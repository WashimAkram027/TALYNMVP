import { jobPostingsService } from '../services/jobpostings.service.js'
import { successResponse, createdResponse, errorResponse, notFoundResponse } from '../utils/response.js'

export const jobPostingsController = {
  async getAll(req, res) {
    try {
      const filters = {
        status: req.query.status,
        department: req.query.department
      }
      const jobs = await jobPostingsService.getJobPostings(req.user.organizationId, filters)
      return successResponse(res, jobs)
    } catch (error) {
      return errorResponse(res, 'Failed to get job postings', 500, error)
    }
  },

  async getPublic(req, res) {
    try {
      const filters = {
        search: req.query.search,
        employmentType: req.query.employmentType,
        isRemote: req.query.isRemote === 'true' ? true : req.query.isRemote === 'false' ? false : undefined,
        limit: req.query.limit ? parseInt(req.query.limit) : undefined
      }
      const jobs = await jobPostingsService.getPublicJobPostings(filters)
      return successResponse(res, jobs)
    } catch (error) {
      return errorResponse(res, 'Failed to get public job postings', 500, error)
    }
  },

  async getById(req, res) {
    try {
      const job = await jobPostingsService.getJobPosting(req.params.id, req.user?.organizationId)
      return successResponse(res, job)
    } catch (error) {
      if (error.message === 'Job posting not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to get job posting', 500, error)
    }
  },

  async create(req, res) {
    try {
      const job = await jobPostingsService.createJobPosting(req.user.organizationId, req.body, req.user.id)
      return createdResponse(res, job, 'Job posting created successfully')
    } catch (error) {
      return errorResponse(res, 'Failed to create job posting', 500, error)
    }
  },

  async update(req, res) {
    try {
      const job = await jobPostingsService.updateJobPosting(req.params.id, req.user.organizationId, req.body)
      return successResponse(res, job, 'Job posting updated successfully')
    } catch (error) {
      if (error.message === 'Job posting not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to update job posting', 500, error)
    }
  },

  async delete(req, res) {
    try {
      await jobPostingsService.deleteJobPosting(req.params.id, req.user.organizationId)
      return successResponse(res, null, 'Job posting deleted successfully')
    } catch (error) {
      return errorResponse(res, 'Failed to delete job posting', 500, error)
    }
  },

  async getDepartments(req, res) {
    try {
      const departments = await jobPostingsService.getDepartments(req.user.organizationId)
      return successResponse(res, departments)
    } catch (error) {
      return errorResponse(res, 'Failed to get departments', 500, error)
    }
  }
}
