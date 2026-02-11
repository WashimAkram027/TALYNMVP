import { holidaysService } from '../services/holidays.service.js'
import { successResponse, createdResponse, errorResponse, notFoundResponse } from '../utils/response.js'

export const holidaysController = {
  async getAll(req, res) {
    try {
      const year = parseInt(req.query.year) || new Date().getFullYear()
      const holidays = await holidaysService.getHolidays(req.user.organizationId, year)
      return successResponse(res, holidays)
    } catch (error) {
      return errorResponse(res, 'Failed to get holidays', 500, error)
    }
  },

  async getUpcoming(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 6
      const holidays = await holidaysService.getUpcomingHolidays(req.user.organizationId, limit)
      return successResponse(res, holidays)
    } catch (error) {
      return errorResponse(res, 'Failed to get upcoming holidays', 500, error)
    }
  },

  async create(req, res) {
    try {
      const holiday = await holidaysService.createHoliday(req.user.organizationId, req.body)
      return createdResponse(res, holiday, 'Holiday created successfully')
    } catch (error) {
      return errorResponse(res, 'Failed to create holiday', 500, error)
    }
  },

  async update(req, res) {
    try {
      const holiday = await holidaysService.updateHoliday(req.params.id, req.user.organizationId, req.body)
      return successResponse(res, holiday, 'Holiday updated successfully')
    } catch (error) {
      if (error.message === 'Holiday not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to update holiday', 500, error)
    }
  },

  async delete(req, res) {
    try {
      await holidaysService.deleteHoliday(req.params.id, req.user.organizationId)
      return successResponse(res, null, 'Holiday deleted successfully')
    } catch (error) {
      return errorResponse(res, 'Failed to delete holiday', 500, error)
    }
  },

  async copyGlobal(req, res) {
    try {
      const year = parseInt(req.body.year) || new Date().getFullYear()
      const holidays = await holidaysService.copyGlobalHolidays(req.user.organizationId, year)
      return createdResponse(res, holidays, 'Global holidays copied successfully')
    } catch (error) {
      return errorResponse(res, 'Failed to copy global holidays', 500, error)
    }
  }
}
