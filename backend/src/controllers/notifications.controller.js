import { notificationService } from '../services/notification.service.js'
import { successResponse, errorResponse, notFoundResponse } from '../utils/response.js'

export const notificationsController = {
  async list(req, res) {
    try {
      const { unread, dismissed, type, limit, offset } = req.query
      const notifications = await notificationService.getForUser(req.user.id, {
        unread: unread === 'true' ? true : undefined,
        dismissed: dismissed === 'true' ? true : dismissed === 'false' ? false : undefined,
        type: type || undefined,
        limit: parseInt(limit) || 20,
        offset: parseInt(offset) || 0
      })
      return successResponse(res, notifications)
    } catch (error) {
      return errorResponse(res, 'Failed to fetch notifications', 500, error)
    }
  },

  async getUnreadCount(req, res) {
    try {
      const count = await notificationService.getUnreadCount(req.user.id)
      return successResponse(res, { count })
    } catch (error) {
      return errorResponse(res, 'Failed to get unread count', 500, error)
    }
  },

  async markRead(req, res) {
    try {
      const data = await notificationService.markRead(req.params.id, req.user.id)
      if (!data) return notFoundResponse(res, 'Notification not found')
      return successResponse(res, data)
    } catch (error) {
      return errorResponse(res, 'Failed to mark notification as read', 500, error)
    }
  },

  async dismiss(req, res) {
    try {
      const data = await notificationService.dismiss(req.params.id, req.user.id)
      if (!data) return notFoundResponse(res, 'Notification not found')
      return successResponse(res, data)
    } catch (error) {
      return errorResponse(res, 'Failed to dismiss notification', 500, error)
    }
  },

  async markAllRead(req, res) {
    try {
      const result = await notificationService.markAllRead(req.user.id)
      return successResponse(res, result)
    } catch (error) {
      return errorResponse(res, 'Failed to mark all as read', 500, error)
    }
  }
}
