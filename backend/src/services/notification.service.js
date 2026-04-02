import { supabase } from '../config/supabase.js'

/**
 * Notification Service
 * Lightweight helper for creating and managing in-app notifications.
 * All create() calls are non-throwing — a notification failure should
 * never break the parent operation.
 */
export const notificationService = {
  /**
   * Create a notification. Non-throwing — logs errors instead of propagating.
   */
  async create({ recipientId, actorId = null, organizationId = null, type, title, message = null, actionUrl = null, metadata = {} }) {
    try {
      if (!recipientId || !type || !title) {
        console.error('[NotificationService] Missing required fields:', { recipientId, type, title })
        return null
      }

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 90)

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          recipient_id: recipientId,
          actor_id: actorId,
          organization_id: organizationId,
          type,
          title,
          message,
          action_url: actionUrl,
          metadata,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('[NotificationService] Insert failed:', error.message)
        return null
      }

      return data
    } catch (err) {
      console.error('[NotificationService] Unexpected error:', err.message)
      return null
    }
  },

  /**
   * Get notifications for a user with optional filters.
   */
  async getForUser(userId, { unread, dismissed = false, type, limit = 20, offset = 0 } = {}) {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (unread === true) {
      query = query.is('read_at', null)
    }

    if (dismissed === false) {
      query = query.is('dismissed_at', null)
    } else if (dismissed === true) {
      query = query.not('dismissed_at', 'is', null)
    }

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  },

  /**
   * Get unread count for badge display.
   */
  async getUnreadCount(userId) {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .is('read_at', null)
      .is('dismissed_at', null)

    if (error) throw error
    return count || 0
  },

  /**
   * Mark a single notification as read.
   */
  async markRead(notificationId, userId) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('recipient_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Dismiss a single notification.
   */
  async dismiss(notificationId, userId) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('recipient_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Mark all unread notifications as read for a user.
   */
  async markAllRead(userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', userId)
      .is('read_at', null)

    if (error) throw error
    return { success: true }
  }
}
