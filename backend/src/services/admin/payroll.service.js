import { supabase } from '../../config/supabase.js'
import { NotFoundError, BadRequestError } from '../../utils/errors.js'
import { auditLogService } from './auditLog.service.js'

export const adminPayrollService = {
  /**
   * List payroll runs across all organizations
   */
  async listPayrollRuns({ page = 1, limit = 20, status, orgId, sortBy = 'created_at', sortOrder = 'desc' }) {
    let query = supabase
      .from('payroll_runs')
      .select('*, organization:organizations!payroll_runs_organization_id_fkey(id, name)', { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (orgId) query = query.eq('organization_id', orgId)

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
   * Get payroll run detail with items
   */
  async getPayrollRunDetail(runId) {
    const { data: run, error } = await supabase
      .from('payroll_runs')
      .select('*, organization:organizations!payroll_runs_organization_id_fkey(id, name, email)')
      .eq('id', runId)
      .single()

    if (error || !run) throw new NotFoundError('Payroll run not found')

    // Get payroll items
    const { data: items } = await supabase
      .from('payroll_items')
      .select(`
        *,
        member:organization_members!payroll_items_member_id_fkey(
          id, job_title, start_date, pan_number, ssf_number, bank_account_number, bank_name,
          profile:profiles!organization_members_profile_id_fkey(id, email, first_name, last_name, full_name)
        )
      `)
      .eq('payroll_run_id', runId)
      .order('created_at', { ascending: true })

    return { ...run, items: items || [] }
  },

  /**
   * Approve a pending payroll run
   */
  async approvePayrollRun(runId, adminId, notes, ip) {
    const { data: run, error: fetchError } = await supabase
      .from('payroll_runs')
      .select('id, status, organization_id')
      .eq('id', runId)
      .single()

    if (fetchError || !run) throw new NotFoundError('Payroll run not found')
    if (run.status !== 'pending_approval') throw new BadRequestError('Payroll run is not pending approval')

    const { error } = await supabase
      .from('payroll_runs')
      .update({
        status: 'processing',
        approved_by: adminId,
        approved_at: new Date().toISOString()
      })
      .eq('id', runId)

    if (error) throw error

    await auditLogService.log(adminId, 'payroll_approved', 'payroll_run', runId, { notes }, ip)
    return { success: true }
  },

  /**
   * Reject a pending payroll run
   */
  async rejectPayrollRun(runId, adminId, notes, ip) {
    const { data: run, error: fetchError } = await supabase
      .from('payroll_runs')
      .select('id, status')
      .eq('id', runId)
      .single()

    if (fetchError || !run) throw new NotFoundError('Payroll run not found')
    if (run.status !== 'pending_approval') throw new BadRequestError('Payroll run is not pending approval')

    const { error } = await supabase
      .from('payroll_runs')
      .update({
        status: 'cancelled',
        notes: notes || 'Rejected by admin'
      })
      .eq('id', runId)

    if (error) throw error

    await auditLogService.log(adminId, 'payroll_rejected', 'payroll_run', runId, { notes }, ip)
    return { success: true }
  },

  /**
   * Update a single payroll item (employee earnings)
   */
  async updatePayrollItem(itemId, updates, adminId, ip) {
    const allowedFields = ['base_salary', 'bonuses', 'deductions', 'tax_amount',
      'dearness_allowance', 'other_allowance', 'festival_allowance', 'leave_encashments', 'other_payments']
    const filteredUpdates = {}
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = Number(updates[key]) || 0
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      throw new BadRequestError('No valid fields to update')
    }

    // Verify item exists and get its payroll run
    const { data: item, error: fetchError } = await supabase
      .from('payroll_items')
      .select('id, payroll_run_id, member_id')
      .eq('id', itemId)
      .single()

    if (fetchError || !item) throw new NotFoundError('Payroll item not found')

    // Verify the parent run is editable
    const { data: run } = await supabase
      .from('payroll_runs')
      .select('id, status')
      .eq('id', item.payroll_run_id)
      .single()

    if (!run) throw new NotFoundError('Payroll run not found')
    if (!['draft', 'pending_approval'].includes(run.status)) {
      throw new BadRequestError('Payroll run is not editable (status: ' + run.status + ')')
    }

    // Update the payroll item
    const { data: updated, error } = await supabase
      .from('payroll_items')
      .update({ ...filteredUpdates, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error

    // Recalculate parent run total_amount
    const { data: allItems } = await supabase
      .from('payroll_items')
      .select('net_amount')
      .eq('payroll_run_id', item.payroll_run_id)

    const newTotal = (allItems || []).reduce((sum, i) => sum + Number(i.net_amount || 0), 0)

    await supabase
      .from('payroll_runs')
      .update({ total_amount: newTotal, updated_at: new Date().toISOString() })
      .eq('id', item.payroll_run_id)

    await auditLogService.log(adminId, 'payroll_item_updated', 'payroll_item', itemId, {
      payroll_run_id: item.payroll_run_id,
      member_id: item.member_id,
      changes: filteredUpdates
    }, ip)

    return updated
  }
}
