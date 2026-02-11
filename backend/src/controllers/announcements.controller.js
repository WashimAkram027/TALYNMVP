import { announcementsService } from '../services/announcements.service.js'
import { successResponse, createdResponse, errorResponse, notFoundResponse } from '../utils/response.js'

export const announcementsController = {
  async getAll(req, res) {
    try {
      const filters = {
        publishedOnly: req.query.publishedOnly === 'true',
        limit: req.query.limit ? parseInt(req.query.limit) : undefined
      }
      const announcements = await announcementsService.getAnnouncements(req.user.organizationId, filters)
      return successResponse(res, announcements)
    } catch (error) {
      return errorResponse(res, 'Failed to get announcements', 500, error)
    }
  },

  async getById(req, res) {
    try {
      const announcement = await announcementsService.getAnnouncement(req.params.id, req.user.organizationId)
      return successResponse(res, announcement)
    } catch (error) {
      if (error.message === 'Announcement not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to get announcement', 500, error)
    }
  },

  async create(req, res) {
    try {
      const announcement = await announcementsService.createAnnouncement(req.user.organizationId, req.body, req.user.id)
      return createdResponse(res, announcement, 'Announcement created successfully')
    } catch (error) {
      return errorResponse(res, 'Failed to create announcement', 500, error)
    }
  },

  async update(req, res) {
    try {
      const announcement = await announcementsService.updateAnnouncement(req.params.id, req.user.organizationId, req.body)
      return successResponse(res, announcement, 'Announcement updated successfully')
    } catch (error) {
      if (error.message === 'Announcement not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to update announcement', 500, error)
    }
  },

  async delete(req, res) {
    try {
      await announcementsService.deleteAnnouncement(req.params.id, req.user.organizationId)
      return successResponse(res, null, 'Announcement deleted successfully')
    } catch (error) {
      return errorResponse(res, 'Failed to delete announcement', 500, error)
    }
  },

  async togglePin(req, res) {
    try {
      const announcement = await announcementsService.togglePin(req.params.id, req.user.organizationId)
      return successResponse(res, announcement, 'Pin status toggled')
    } catch (error) {
      if (error.message === 'Announcement not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to toggle pin', 500, error)
    }
  },

  async getRecent(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 5
      const announcements = await announcementsService.getRecentAnnouncements(req.user.organizationId, limit)
      return successResponse(res, announcements)
    } catch (error) {
      return errorResponse(res, 'Failed to get recent announcements', 500, error)
    }
  }
}
