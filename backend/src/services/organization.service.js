import { supabase } from '../config/supabase.js'

/**
 * Organization Service
 * Handles all organization-related database operations
 */
export const organizationService = {
  /**
   * Get organization by ID
   */
  async getById(orgId) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Get organization with owner info
   */
  async getWithOwner(orgId) {
    const { data, error } = await supabase
      .from('organizations')
      .select(`
        *,
        owner:profiles!owner_id(id, full_name, email, avatar_url)
      `)
      .eq('id', orgId)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update organization
   */
  async update(orgId, ownerId, updates) {
    // Verify ownership
    const { data: org } = await supabase
      .from('organizations')
      .select('owner_id')
      .eq('id', orgId)
      .single()

    if (!org || org.owner_id !== ownerId) {
      throw new Error('Not authorized to update this organization')
    }

    const { data, error } = await supabase
      .from('organizations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', orgId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Get organization statistics
   */
  async getStats(orgId) {
    // Get member counts
    const { data: members, error: membersError } = await supabase
      .from('organization_members')
      .select('status')
      .eq('organization_id', orgId)

    if (membersError) throw membersError

    const stats = {
      total_members: members.length,
      active: members.filter(m => m.status === 'active').length,
      invited: members.filter(m => m.status === 'invited').length,
      inactive: members.filter(m => m.status === 'inactive').length,
      offboarded: members.filter(m => m.status === 'offboarded').length
    }

    return stats
  },

  /**
   * Get departments in organization
   */
  async getDepartments(orgId) {
    const { data, error } = await supabase
      .from('organization_members')
      .select('department')
      .eq('organization_id', orgId)
      .not('department', 'is', null)

    if (error) throw error

    const departments = [...new Set(data.map(d => d.department))].filter(Boolean)
    return departments.sort()
  },

  /**
   * Update organization settings
   */
  async updateSettings(orgId, ownerId, settings) {
    // Verify ownership
    const { data: org } = await supabase
      .from('organizations')
      .select('owner_id, settings')
      .eq('id', orgId)
      .single()

    if (!org || org.owner_id !== ownerId) {
      throw new Error('Not authorized to update this organization')
    }

    const mergedSettings = { ...org.settings, ...settings }

    const { data, error } = await supabase
      .from('organizations')
      .update({
        settings: mergedSettings,
        updated_at: new Date().toISOString()
      })
      .eq('id', orgId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}
