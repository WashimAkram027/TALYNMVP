import { supabase } from '../../config/supabase.js'
import { NotFoundError, BadRequestError } from '../../utils/errors.js'
import { auditLogService } from './auditLog.service.js'

const VALID_STATUSES = ['invited', 'onboarding', 'active']

export const adminMembersService = {
  /**
   * List all organization members cross-org with filters
   */
  async listMembers({ page = 1, limit = 20, search, status, orgId, memberRole, sortBy = 'created_at', sortOrder = 'desc' }) {
    let query = supabase
      .from('organization_members')
      .select(`
        id, organization_id, profile_id, member_role, status, job_title, department,
        salary_amount, salary_currency, joined_at, bank_verified_at, created_at,
        profile:profiles!organization_members_profile_id_fkey(id, email, first_name, last_name),
        organization:organizations!organization_members_organization_id_fkey(id, name)
      `, { count: 'exact' })

    if (search) {
      // PostgREST doesn't support .or() on related table columns,
      // so search by invitation_email on the primary table.
      // Also look up matching profile IDs separately.
      const { data: matchingProfiles } = await supabase
        .from('profiles')
        .select('id')
        .or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
        .limit(100)

      const profileIds = (matchingProfiles || []).map(p => p.id)

      if (profileIds.length > 0) {
        query = query.or(`invitation_email.ilike.%${search}%,profile_id.in.(${profileIds.join(',')})`)
      } else {
        query = query.ilike('invitation_email', `%${search}%`)
      }
    }
    if (status) query = query.eq('status', status)
    if (orgId) query = query.eq('organization_id', orgId)
    if (memberRole) query = query.eq('member_role', memberRole)

    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }
  },

  /**
   * Get member detail with profile, org, bank verifier, and payroll items
   */
  async getMemberDetail(memberId) {
    const { data: member, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        profile:profiles!organization_members_profile_id_fkey(*),
        organization:organizations!organization_members_organization_id_fkey(id, name, status),
        bank_verifier:profiles!organization_members_bank_verified_by_fkey(id, email, first_name, last_name)
      `)
      .eq('id', memberId)
      .single()

    if (error || !member) throw new NotFoundError('Member not found')

    // Fetch recent payroll items for this member
    let payrollItems = []
    try {
      const { data: items } = await supabase
        .from('payroll_items')
        .select('*, payroll_run:payroll_runs!payroll_items_payroll_run_id_fkey(id, pay_period_start, pay_period_end, status)')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(20)
      payrollItems = items || []
    } catch {
      // payroll_items table may not exist yet
    }

    return {
      ...member,
      payrollItems
    }
  },

  /**
   * Override member status (super_admin only)
   */
  async overrideStatus(memberId, newStatus, adminId, reason, ip) {
    if (!VALID_STATUSES.includes(newStatus)) {
      throw new BadRequestError(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`)
    }

    if (!reason) {
      throw new BadRequestError('Reason is required for status override')
    }

    // Get current member with profile info
    const { data: member, error: fetchError } = await supabase
      .from('organization_members')
      .select('id, status, profile:profiles!organization_members_profile_id_fkey(id, email, first_name, last_name)')
      .eq('id', memberId)
      .single()

    if (fetchError || !member) throw new NotFoundError('Member not found')

    const previousStatus = member.status

    if (previousStatus === newStatus) {
      throw new BadRequestError(`Member is already ${newStatus}`)
    }

    // Build update payload
    const updateData = { status: newStatus }

    // If setting to 'active' and no joined_at, set it
    if (newStatus === 'active') {
      const { data: fullMember } = await supabase
        .from('organization_members')
        .select('joined_at')
        .eq('id', memberId)
        .single()

      if (fullMember && !fullMember.joined_at) {
        updateData.joined_at = new Date().toISOString()
      }
    }

    const { error } = await supabase
      .from('organization_members')
      .update(updateData)
      .eq('id', memberId)

    if (error) throw error

    const memberEmail = member.profile?.email || null

    await auditLogService.log(adminId, 'member_status_override', 'organization_member', memberId, {
      previousStatus,
      newStatus,
      reason,
      memberEmail
    }, ip)

    return { success: true }
  }
}
