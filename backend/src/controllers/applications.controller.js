import { applicationsService } from '../services/applications.service.js'
import { successResponse, createdResponse, errorResponse, notFoundResponse, badRequestResponse } from '../utils/response.js'

export const applicationsController = {
  async getByJob(req, res) {
    try {
      const filters = { stage: req.query.stage }
      const applications = await applicationsService.getApplicationsByJob(req.params.jobId, req.user.organizationId, filters)
      return successResponse(res, applications)
    } catch (error) {
      if (error.message === 'Job posting not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to get applications', 500, error)
    }
  },

  async getMy(req, res) {
    try {
      const applications = await applicationsService.getMyApplications(req.user.id)
      return successResponse(res, applications)
    } catch (error) {
      return errorResponse(res, 'Failed to get your applications', 500, error)
    }
  },

  async getById(req, res) {
    try {
      const application = await applicationsService.getApplication(req.params.id, req.user.organizationId)
      return successResponse(res, application)
    } catch (error) {
      if (error.message === 'Application not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to get application', 500, error)
    }
  },

  async apply(req, res) {
    try {
      const { jobId, ...applicationData } = req.body
      if (!jobId) return badRequestResponse(res, 'Job ID is required')

      const application = await applicationsService.applyToJob(jobId, req.user.id, applicationData)
      return createdResponse(res, application, 'Application submitted successfully')
    } catch (error) {
      if (error.message.includes('already applied')) return badRequestResponse(res, error.message)
      return errorResponse(res, 'Failed to submit application', 500, error)
    }
  },

  async moveStage(req, res) {
    try {
      const { stage, notes } = req.body
      if (!stage) return badRequestResponse(res, 'Stage is required')

      const application = await applicationsService.moveStage(req.params.id, req.user.organizationId, stage, notes, req.user.id)
      return successResponse(res, application, 'Application stage updated')
    } catch (error) {
      if (error.message === 'Application not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to update application stage', 500, error)
    }
  },

  async update(req, res) {
    try {
      const application = await applicationsService.updateApplication(req.params.id, req.user.organizationId, req.body)
      return successResponse(res, application, 'Application updated')
    } catch (error) {
      if (error.message === 'Application not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to update application', 500, error)
    }
  },

  async getActivity(req, res) {
    try {
      const activities = await applicationsService.getActivityHistory(req.params.id)
      return successResponse(res, activities)
    } catch (error) {
      return errorResponse(res, 'Failed to get activity history', 500, error)
    }
  },

  async getPipelineSummary(req, res) {
    try {
      const summary = await applicationsService.getPipelineSummary(req.user.organizationId)
      return successResponse(res, summary)
    } catch (error) {
      return errorResponse(res, 'Failed to get pipeline summary', 500, error)
    }
  },

  async checkApplied(req, res) {
    try {
      const hasApplied = await applicationsService.hasApplied(req.params.jobId, req.user.id)
      return successResponse(res, { hasApplied })
    } catch (error) {
      return errorResponse(res, 'Failed to check application status', 500, error)
    }
  }
}
