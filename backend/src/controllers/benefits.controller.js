import { benefitsService } from '../services/benefits.service.js'
import { successResponse, createdResponse, errorResponse, notFoundResponse, badRequestResponse } from '../utils/response.js'

export const benefitsController = {
  async getPlans(req, res) {
    try {
      const activeOnly = req.query.activeOnly !== 'false'
      const plans = await benefitsService.getPlans(req.user.organizationId, activeOnly)
      return successResponse(res, plans)
    } catch (error) {
      return errorResponse(res, 'Failed to get benefits plans', 500, error)
    }
  },

  async getPlan(req, res) {
    try {
      const plan = await benefitsService.getPlan(req.params.id, req.user.organizationId)
      return successResponse(res, plan)
    } catch (error) {
      if (error.message === 'Plan not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to get plan', 500, error)
    }
  },

  async createPlan(req, res) {
    try {
      const plan = await benefitsService.createPlan(req.user.organizationId, req.body)
      return createdResponse(res, plan, 'Benefits plan created successfully')
    } catch (error) {
      return errorResponse(res, 'Failed to create plan', 500, error)
    }
  },

  async updatePlan(req, res) {
    try {
      const plan = await benefitsService.updatePlan(req.params.id, req.user.organizationId, req.body)
      return successResponse(res, plan, 'Plan updated successfully')
    } catch (error) {
      if (error.message === 'Plan not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to update plan', 500, error)
    }
  },

  async deletePlan(req, res) {
    try {
      await benefitsService.deletePlan(req.params.id, req.user.organizationId)
      return successResponse(res, null, 'Plan deleted successfully')
    } catch (error) {
      return errorResponse(res, 'Failed to delete plan', 500, error)
    }
  },

  async getMemberEnrollments(req, res) {
    try {
      const enrollments = await benefitsService.getMemberEnrollments(req.params.memberId, req.user.organizationId)
      return successResponse(res, enrollments)
    } catch (error) {
      if (error.message === 'Member not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to get member enrollments', 500, error)
    }
  },

  async getPlanEnrollments(req, res) {
    try {
      const enrollments = await benefitsService.getPlanEnrollments(req.params.planId, req.user.organizationId)
      return successResponse(res, enrollments)
    } catch (error) {
      if (error.message === 'Plan not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to get plan enrollments', 500, error)
    }
  },

  async enrollMember(req, res) {
    try {
      const { memberId, planId, coverageStartDate } = req.body
      if (!memberId || !planId || !coverageStartDate) {
        return badRequestResponse(res, 'Member ID, plan ID, and coverage start date are required')
      }
      const enrollment = await benefitsService.enrollMember(memberId, planId, req.user.organizationId, coverageStartDate)
      return createdResponse(res, enrollment, 'Member enrolled successfully')
    } catch (error) {
      if (error.message === 'Member not found' || error.message === 'Plan not found') {
        return notFoundResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to enroll member', 500, error)
    }
  },

  async updateEnrollment(req, res) {
    try {
      const enrollment = await benefitsService.updateEnrollment(req.params.id, req.user.organizationId, req.body)
      return successResponse(res, enrollment, 'Enrollment updated')
    } catch (error) {
      if (error.message === 'Enrollment not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to update enrollment', 500, error)
    }
  },

  async cancelEnrollment(req, res) {
    try {
      const { coverageEndDate } = req.body
      const enrollment = await benefitsService.cancelEnrollment(req.params.id, req.user.organizationId, coverageEndDate)
      return successResponse(res, enrollment, 'Enrollment cancelled')
    } catch (error) {
      if (error.message === 'Enrollment not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to cancel enrollment', 500, error)
    }
  },

  async getActiveCoverage(req, res) {
    try {
      const coverage = await benefitsService.getActiveCoverage(req.params.memberId, req.user.organizationId)
      return successResponse(res, coverage)
    } catch (error) {
      if (error.message === 'Member not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to get active coverage', 500, error)
    }
  }
}
