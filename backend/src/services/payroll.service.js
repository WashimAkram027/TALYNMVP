import { supabase } from '../config/supabase.js'
import { BadRequestError, NotFoundError } from '../utils/errors.js'

/**
 * Payroll Service
 * Handles payroll operations through Supabase
 */
export const payrollService = {
  /**
   * Get all payroll runs for an organization
   */
  async getPayrollRuns(orgId, filters = {}) {
    let query = supabase
      .from('payroll_runs')
      .select('*')
      .eq('organization_id', orgId)
      .order('pay_date', { ascending: false })

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.fromDate) {
      query = query.gte('pay_date', filters.fromDate)
    }

    if (filters.toDate) {
      query = query.lte('pay_date', filters.toDate)
    }

    const { data, error } = await query
    if (error) throw new BadRequestError(error.message)
    return data
  },

  /**
   * Get a single payroll run with items
   */
  async getPayrollRun(runId, orgId) {
    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('id', runId)
      .eq('organization_id', orgId)
      .single()

    if (runError) {
      if (runError.code === 'PGRST116') {
        throw new NotFoundError('Payroll run not found')
      }
      throw new BadRequestError(runError.message)
    }

    const { data: items, error: itemsError } = await supabase
      .from('payroll_items')
      .select(`
        *,
        member:organization_members!payroll_items_member_id_fkey(
          id,
          job_title,
          profile:profiles!organization_members_profile_id_fkey(full_name, email, avatar_url)
        )
      `)
      .eq('payroll_run_id', runId)

    if (itemsError) throw new BadRequestError(itemsError.message)

    return { ...run, items }
  },

  /**
   * Create a new payroll run
   */
  async createPayrollRun(orgId, payPeriodStart, payPeriodEnd, payDate) {
    const { data, error } = await supabase.rpc('create_payroll_run', {
      p_org_id: orgId,
      p_pay_period_start: payPeriodStart,
      p_pay_period_end: payPeriodEnd,
      p_pay_date: payDate
    })

    if (error) throw new BadRequestError(error.message)
    return data
  },

  /**
   * Update payroll run status
   */
  async updatePayrollRunStatus(runId, orgId, status) {
    // Validate status
    const validStatuses = ['draft', 'processing', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      throw new BadRequestError('Invalid status')
    }

    const { data, error } = await supabase
      .from('payroll_runs')
      .update({
        status,
        processed_at: status === 'completed' ? new Date().toISOString() : null
      })
      .eq('id', runId)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Payroll run not found')
      }
      throw new BadRequestError(error.message)
    }

    return data
  },

  /**
   * Update a payroll item
   */
  async updatePayrollItem(itemId, orgId, updates) {
    // First verify the item belongs to this org
    const { data: item, error: verifyError } = await supabase
      .from('payroll_items')
      .select('payroll_run:payroll_runs!payroll_items_payroll_run_id_fkey(organization_id)')
      .eq('id', itemId)
      .single()

    if (verifyError || !item) {
      throw new NotFoundError('Payroll item not found')
    }

    if (item.payroll_run?.organization_id !== orgId) {
      throw new NotFoundError('Payroll item not found')
    }

    // Only allow certain fields to be updated
    const allowedFields = ['base_salary', 'bonus', 'deductions', 'tax_amount', 'net_pay', 'notes', 'status']
    const filteredUpdates = {}
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key]
      }
    }

    const { data, error } = await supabase
      .from('payroll_items')
      .update(filteredUpdates)
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw new BadRequestError(error.message)
    return data
  },

  /**
   * Get upcoming payroll
   */
  async getUpcomingPayroll(orgId) {
    const { data, error } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('organization_id', orgId)
      .gte('pay_date', new Date().toISOString().split('T')[0])
      .in('status', ['draft', 'processing'])
      .order('pay_date', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) throw new BadRequestError(error.message)
    return data
  },

  /**
   * Get employee payroll history
   */
  async getEmployeePayrollHistory(memberId, orgId, limit = 12) {
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
      .from('payroll_items')
      .select(`
        *,
        payroll_run:payroll_runs!payroll_items_payroll_run_id_fkey(pay_period_start, pay_period_end, pay_date, status)
      `)
      .eq('member_id', memberId)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw new BadRequestError(error.message)
    return data
  },

  /**
   * Delete a payroll run (only if draft)
   */
  async deletePayrollRun(runId, orgId) {
    // First check status
    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .select('status')
      .eq('id', runId)
      .eq('organization_id', orgId)
      .single()

    if (runError || !run) {
      throw new NotFoundError('Payroll run not found')
    }

    if (run.status !== 'draft') {
      throw new BadRequestError('Can only delete draft payroll runs')
    }

    // Delete items first
    await supabase
      .from('payroll_items')
      .delete()
      .eq('payroll_run_id', runId)

    // Delete the run
    const { error } = await supabase
      .from('payroll_runs')
      .delete()
      .eq('id', runId)
      .eq('organization_id', orgId)

    if (error) throw new BadRequestError(error.message)
    return { success: true }
  }
}
