import { supabase } from '../config/supabase.js'
import { BadRequestError, NotFoundError } from '../utils/errors.js'

/**
 * Time Off Service
 * Handles time off operations through Supabase
 */
export const timeOffService = {
  /**
   * Get time off policies for an organization
   */
  async getPolicies(orgId) {
    const { data, error } = await supabase
      .from('time_off_policies')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('name')

    if (error) throw new BadRequestError(error.message)
    return data
  },

  /**
   * Create a time off policy
   */
  async createPolicy(orgId, policy) {
    const { data, error } = await supabase
      .from('time_off_policies')
      .insert({
        ...policy,
        organization_id: orgId
      })
      .select()
      .single()

    if (error) throw new BadRequestError(error.message)
    return data
  },

  /**
   * Update a time off policy
   */
  async updatePolicy(policyId, orgId, updates) {
    // Only allow certain fields to be updated
    const allowedFields = ['name', 'description', 'days_per_year', 'is_paid', 'is_active', 'accrual_rate', 'max_carryover']
    const filteredUpdates = {}
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key]
      }
    }

    const { data, error } = await supabase
      .from('time_off_policies')
      .update(filteredUpdates)
      .eq('id', policyId)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Policy not found')
      }
      throw new BadRequestError(error.message)
    }
    return data
  },

  /**
   * Delete a time off policy (soft delete by setting is_active to false)
   */
  async deletePolicy(policyId, orgId) {
    const { data, error } = await supabase
      .from('time_off_policies')
      .update({ is_active: false })
      .eq('id', policyId)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Policy not found')
      }
      throw new BadRequestError(error.message)
    }
    return data
  },

  /**
   * Get employee time off balances
   */
  async getBalances(memberId, orgId, year = new Date().getFullYear()) {
    // First verify the member belongs to this org
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .single()

    if (memberError || !member) {
      throw new NotFoundError('Member not found')
    }

    const { data, error } = await supabase
      .from('time_off_balances')
      .select(`
        *,
        policy:time_off_policies!time_off_balances_policy_id_fkey(name, is_paid)
      `)
      .eq('member_id', memberId)
      .eq('year', year)

    if (error) throw new BadRequestError(error.message)
    return data
  },

  /**
   * Initialize balances for a new year/employee
   */
  async initializeBalances(memberId, orgId, year = new Date().getFullYear()) {
    // Verify member belongs to org
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .single()

    if (memberError || !member) {
      throw new NotFoundError('Member not found')
    }

    // Get all active policies
    const { data: policies, error: policyError } = await supabase
      .from('time_off_policies')
      .select('id, days_per_year')
      .eq('organization_id', orgId)
      .eq('is_active', true)

    if (policyError) throw new BadRequestError(policyError.message)

    // Create balances for each policy
    const balances = policies.map(policy => ({
      member_id: memberId,
      policy_id: policy.id,
      year,
      total_days: policy.days_per_year,
      used_days: 0,
      pending_days: 0
    }))

    const { data, error } = await supabase
      .from('time_off_balances')
      .upsert(balances, { onConflict: 'member_id,policy_id,year' })
      .select()

    if (error) throw new BadRequestError(error.message)
    return data
  },

  /**
   * Get time off requests
   */
  async getRequests(orgId, filters = {}) {
    let query = supabase
      .from('time_off_requests')
      .select(`
        *,
        policy:time_off_policies!time_off_requests_policy_id_fkey(name, is_paid, organization_id),
        member:organization_members!time_off_requests_member_id_fkey(
          id,
          profile:profiles!organization_members_profile_id_fkey(full_name, email, avatar_url)
        ),
        reviewer:profiles!time_off_requests_reviewed_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false })

    // Filter by org via the policy
    if (filters.memberId) {
      query = query.eq('member_id', filters.memberId)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.fromDate) {
      query = query.gte('start_date', filters.fromDate)
    }

    if (filters.toDate) {
      query = query.lte('end_date', filters.toDate)
    }

    const { data, error } = await query

    if (error) throw new BadRequestError(error.message)

    // Filter by organization (since we can't easily join on org_id)
    const filteredData = data?.filter(item => item.policy?.organization_id === orgId) || []
    return filteredData
  },

  /**
   * Request time off
   */
  async requestTimeOff(memberId, orgId, policyId, startDate, endDate, reason = null) {
    // Verify member belongs to org
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .single()

    if (memberError || !member) {
      throw new NotFoundError('Member not found')
    }

    // Verify policy belongs to org
    const { data: policy, error: policyError } = await supabase
      .from('time_off_policies')
      .select('id')
      .eq('id', policyId)
      .eq('organization_id', orgId)
      .single()

    if (policyError || !policy) {
      throw new NotFoundError('Policy not found')
    }

    // Try to use the RPC if available, otherwise create directly
    try {
      const { data, error } = await supabase.rpc('request_time_off', {
        p_policy_id: policyId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_reason: reason
      })
      if (error) throw error
      return data
    } catch (rpcError) {
      // Fallback to direct insert if RPC doesn't exist
      console.log('[TimeOffService] RPC not available, using direct insert')

      // Calculate number of days
      const start = new Date(startDate)
      const end = new Date(endDate)
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1

      const { data, error } = await supabase
        .from('time_off_requests')
        .insert({
          member_id: memberId,
          policy_id: policyId,
          start_date: startDate,
          end_date: endDate,
          days_requested: days,
          reason,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw new BadRequestError(error.message)
      return data
    }
  },

  /**
   * Review (approve/reject) time off request
   */
  async reviewRequest(requestId, orgId, reviewerId, approved, notes = null) {
    // Verify request belongs to org
    const { data: request, error: requestError } = await supabase
      .from('time_off_requests')
      .select('policy:time_off_policies!time_off_requests_policy_id_fkey(organization_id)')
      .eq('id', requestId)
      .single()

    if (requestError || !request) {
      throw new NotFoundError('Request not found')
    }

    if (request.policy?.organization_id !== orgId) {
      throw new NotFoundError('Request not found')
    }

    // Try to use the RPC if available
    try {
      const { data, error } = await supabase.rpc('review_time_off_request', {
        p_request_id: requestId,
        p_approved: approved,
        p_notes: notes
      })
      if (error) throw error
      return data
    } catch (rpcError) {
      // Fallback to direct update if RPC doesn't exist
      console.log('[TimeOffService] RPC not available, using direct update')

      const { data, error } = await supabase
        .from('time_off_requests')
        .update({
          status: approved ? 'approved' : 'rejected',
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
          review_notes: notes
        })
        .eq('id', requestId)
        .select()
        .single()

      if (error) throw new BadRequestError(error.message)
      return data
    }
  },

  /**
   * Cancel a pending request
   */
  async cancelRequest(requestId, memberId, orgId) {
    // Verify the request belongs to the member and org
    const { data: request, error: requestError } = await supabase
      .from('time_off_requests')
      .select('member_id, status, policy:time_off_policies!time_off_requests_policy_id_fkey(organization_id)')
      .eq('id', requestId)
      .single()

    if (requestError || !request) {
      throw new NotFoundError('Request not found')
    }

    if (request.policy?.organization_id !== orgId) {
      throw new NotFoundError('Request not found')
    }

    // Only the requester can cancel their own request
    if (request.member_id !== memberId) {
      throw new BadRequestError('You can only cancel your own requests')
    }

    if (request.status !== 'pending') {
      throw new BadRequestError('Can only cancel pending requests')
    }

    const { data, error } = await supabase
      .from('time_off_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw new BadRequestError(error.message)
    return data
  },

  /**
   * Get upcoming time off for an employee
   */
  async getUpcomingTimeOff(memberId, orgId) {
    // Verify member belongs to org
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .single()

    if (memberError || !member) {
      throw new NotFoundError('Member not found')
    }

    const { data, error } = await supabase
      .from('time_off_requests')
      .select(`
        *,
        policy:time_off_policies!time_off_requests_policy_id_fkey(name, is_paid)
      `)
      .eq('member_id', memberId)
      .eq('status', 'approved')
      .gte('start_date', new Date().toISOString().split('T')[0])
      .order('start_date', { ascending: true })

    if (error) throw new BadRequestError(error.message)
    return data
  }
}
