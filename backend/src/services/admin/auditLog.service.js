import { supabase } from '../../config/supabase.js'

/**
 * Audit log service - logs all admin actions
 */
export const auditLogService = {
  /**
   * Log an admin action
   */
  async log(adminId, action, targetType = null, targetId = null, metadata = {}, ip = null) {
    try {
      const { error } = await supabase
        .from('admin_activity_log')
        .insert({
          admin_id: adminId,
          action,
          target_type: targetType,
          target_id: targetId,
          metadata,
          ip_address: ip
        })

      if (error) {
        console.error('[AuditLog] Failed to write log:', error)
      }
    } catch (err) {
      // Never let audit logging break the main flow
      console.error('[AuditLog] Error:', err)
    }
  },

  /**
   * Get audit logs with filters
   */
  async getLogs({ adminId, action, targetType, targetId, page = 1, limit = 50 }) {
    let query = supabase
      .from('admin_activity_log')
      .select('*, admin:profiles!admin_activity_log_admin_id_fkey(id, email, first_name, last_name)', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (adminId) query = query.eq('admin_id', adminId)
    if (action) query = query.eq('action', action)
    if (targetType) query = query.eq('target_type', targetType)
    if (targetId) query = query.eq('target_id', targetId)

    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return { data: data || [], total: count || 0, page, limit }
  }
}
