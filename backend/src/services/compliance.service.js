import { supabase } from '../config/supabase.js'
import { BadRequestError, NotFoundError } from '../utils/errors.js'

export const complianceService = {
  async getComplianceItems(orgId, filters = {}) {
    let query = supabase
      .from('compliance_items')
      .select(`
        *,
        member:organization_members!compliance_items_member_id_fkey(
          profile:profiles!organization_members_profile_id_fkey(full_name, email)
        )
      `)
      .eq('organization_id', orgId)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.itemType) query = query.eq('item_type', filters.itemType)
    if (filters.memberId) query = query.eq('member_id', filters.memberId)
    if (filters.isRequired !== undefined) query = query.eq('is_required', filters.isRequired)

    const { data, error } = await query
    if (error) throw new BadRequestError(error.message)
    return data
  },

  async getMemberComplianceItems(memberId, orgId) {
    // Verify member belongs to org
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .single()

    if (memberError || !member) throw new NotFoundError('Member not found')

    const { data, error } = await supabase
      .from('compliance_items')
      .select('*')
      .eq('member_id', memberId)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (error) throw new BadRequestError(error.message)
    return data
  },

  async createComplianceItem(orgId, item) {
    const { data, error } = await supabase
      .from('compliance_items')
      .insert({ ...item, organization_id: orgId })
      .select()
      .single()

    if (error) throw new BadRequestError(error.message)
    return data
  },

  async updateComplianceItem(itemId, orgId, updates) {
    if (updates.status === 'approved' && !updates.completed_at) {
      updates.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('compliance_items')
      .update(updates)
      .eq('id', itemId)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundError('Compliance item not found')
      throw new BadRequestError(error.message)
    }
    return data
  },

  async deleteComplianceItem(itemId, orgId) {
    const { error } = await supabase
      .from('compliance_items')
      .delete()
      .eq('id', itemId)
      .eq('organization_id', orgId)

    if (error) throw new BadRequestError(error.message)
    return { success: true }
  },

  async getAlerts(orgId, filters = {}) {
    let query = supabase
      .from('compliance_alerts')
      .select(`
        *,
        member:organization_members!compliance_alerts_member_id_fkey(
          profile:profiles!organization_members_profile_id_fkey(full_name)
        ),
        compliance_item:compliance_items!compliance_alerts_compliance_item_id_fkey(name, item_type)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (!filters.includeRead) query = query.eq('is_read', false)
    if (!filters.includeDismissed) query = query.eq('is_dismissed', false)
    if (filters.alertType) query = query.eq('alert_type', filters.alertType)

    const { data, error } = await query
    if (error) throw new BadRequestError(error.message)
    return data
  },

  async createAlert(orgId, alert) {
    const { data, error } = await supabase
      .from('compliance_alerts')
      .insert({ ...alert, organization_id: orgId })
      .select()
      .single()

    if (error) throw new BadRequestError(error.message)
    return data
  },

  async markAlertRead(alertId, orgId) {
    const { data, error } = await supabase
      .from('compliance_alerts')
      .update({ is_read: true })
      .eq('id', alertId)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundError('Alert not found')
      throw new BadRequestError(error.message)
    }
    return data
  },

  async dismissAlert(alertId, orgId) {
    const { data, error } = await supabase
      .from('compliance_alerts')
      .update({ is_dismissed: true })
      .eq('id', alertId)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundError('Alert not found')
      throw new BadRequestError(error.message)
    }
    return data
  },

  async getComplianceScore(orgId) {
    const { data, error } = await supabase
      .from('compliance_items')
      .select('status')
      .eq('organization_id', orgId)
      .eq('is_required', true)

    if (error) throw new BadRequestError(error.message)

    if (data.length === 0) return 100

    const approved = data.filter(item => item.status === 'approved').length
    return Math.round((approved / data.length) * 100)
  },

  async getItemsDueSoon(orgId, daysAhead = 30) {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)

    const { data, error } = await supabase
      .from('compliance_items')
      .select(`
        *,
        member:organization_members!compliance_items_member_id_fkey(
          profile:profiles!organization_members_profile_id_fkey(full_name)
        )
      `)
      .eq('organization_id', orgId)
      .in('status', ['pending', 'submitted'])
      .lte('due_date', futureDate.toISOString().split('T')[0])
      .order('due_date', { ascending: true })

    if (error) throw new BadRequestError(error.message)
    return data
  }
}
