import { supabase } from '../config/supabase.js'
import { payrollDayCountService } from './payrollDayCount.service.js'

/**
 * Leave Reconciliation Service
 *
 * Handles post-billing leave adjustments. The billing cron runs on the 26th,
 * but employees may take unpaid leave between the 27th and month-end that
 * wasn't reflected in the invoice. This service:
 *
 * 1. Detects discrepancies between the invoice day-count snapshot and actual
 *    approved leave at month-end
 * 2. Creates adjustment records for the difference
 * 3. Applies credits to the next month's invoice
 */
export const leaveReconciliationService = {
  /**
   * Run reconciliation for the previous month's invoices.
   * Called by cron on the 1st of each month.
   *
   * @returns {object} Summary of reconciliation results
   */
  async reconcilePreviousMonth() {
    // Previous month boundaries
    const now = new Date()
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0) // last day of prev month
    const prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1)
    const periodStart = prevMonthStart.toISOString().split('T')[0]
    const periodEnd = prevMonthEnd.toISOString().split('T')[0]

    console.log(`[LeaveReconciliation] Reconciling period ${periodStart} to ${periodEnd}`)

    // Find all billing invoices for the previous month
    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select('id, organization_id, line_items, exchange_rate, config_snapshot, billing_period_start, billing_period_end')
      .eq('type', 'billing')
      .eq('billing_period_start', periodStart)
      .in('status', ['pending', 'approved', 'paid'])

    if (invError) throw invError

    const summary = { invoicesChecked: 0, adjustmentsCreated: 0, totalCreditCents: 0, errors: [] }

    for (const invoice of invoices || []) {
      try {
        const result = await this.reconcileInvoice(invoice.id)
        summary.invoicesChecked++
        summary.adjustmentsCreated += result.adjustments.length
        summary.totalCreditCents += result.totalCreditCents
      } catch (err) {
        console.error(`[LeaveReconciliation] Error for invoice ${invoice.id}:`, err.message)
        summary.errors.push({ invoiceId: invoice.id, error: err.message })
      }
    }

    console.log('[LeaveReconciliation] Summary:', summary)
    return summary
  },

  /**
   * Reconcile a single invoice against actual approved leave.
   *
   * Compares the day-count snapshot stored in the invoice line_items
   * against the current approved leave data. If additional unpaid leave
   * was approved after the invoice was generated, creates adjustment records.
   *
   * @param {string} invoiceId
   * @returns {object} { adjustments, totalCreditCents }
   */
  async reconcileInvoice(invoiceId) {
    // Fetch invoice with line items
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('id, organization_id, line_items, exchange_rate, config_snapshot, billing_period_start, billing_period_end, created_at')
      .eq('id', invoiceId)
      .eq('type', 'billing')
      .single()

    if (error || !invoice) {
      throw new Error(`Invoice ${invoiceId} not found`)
    }

    const lineItems = invoice.line_items || []
    if (lineItems.length === 0) {
      return { adjustments: [], totalCreditCents: 0 }
    }

    // Check if reconciliation was already done for this invoice
    const { data: existingRecon } = await supabase
      .from('leave_reconciliation_records')
      .select('id')
      .eq('source_invoice_id', invoiceId)
      .limit(1)

    if (existingRecon && existingRecon.length > 0) {
      return { adjustments: [], totalCreditCents: 0, message: 'Already reconciled' }
    }

    const exchangeRate = parseFloat(invoice.exchange_rate) || 1
    const periodStart = invoice.billing_period_start
    const periodEnd = invoice.billing_period_end
    const invoiceCreatedAt = new Date(invoice.created_at)

    const adjustments = []

    for (const item of lineItems) {
      // Skip items without day-count data (older invoices before day-count was added)
      if (item.payable_days === null || item.payable_days === undefined) continue
      if (!item.member_id) continue

      try {
        // Recalculate payable days with current approved leave data
        const currentDayCount = await payrollDayCountService.calculatePayableDays(
          item.member_id, periodStart, periodEnd
        )

        const originalUnpaidDays = item.unpaid_leave_days || 0
        const actualUnpaidDays = currentDayCount.unpaidLeaveDays || 0

        // Only create adjustment if more unpaid leave was approved after invoice generation
        if (actualUnpaidDays <= originalUnpaidDays) continue

        // Find the specific leave requests that were approved after invoice generation
        const { data: lateLeaveRequests } = await supabase
          .from('leave_requests')
          .select('id, start_date, end_date, unpaid_days, approved_at')
          .eq('employee_id', item.member_id)
          .eq('status', 'approved')
          .gt('unpaid_days', 0)
          .lte('start_date', periodEnd)
          .gte('end_date', periodStart)
          .gt('approved_at', invoiceCreatedAt.toISOString())

        if (!lateLeaveRequests || lateLeaveRequests.length === 0) continue

        // Calculate the monetary difference
        const calendarDays = item.calendar_days || currentDayCount.calendarDays
        const originalPayableDays = item.payable_days
        const actualPayableDays = currentDayCount.payableDays
        const adjustmentDays = originalPayableDays - actualPayableDays

        if (adjustmentDays <= 0) continue

        const fullMonthlyGrossLocal = item.full_monthly_gross_local || item.monthly_gross_local
        const dailyRate = Math.round(fullMonthlyGrossLocal / calendarDays)

        // Original billed amount
        const originalGrossLocal = item.monthly_gross_local
        // What should have been billed
        const actualGrossLocal = dailyRate * actualPayableDays
        // Credit amount (positive = credit to employer)
        const adjustmentAmountLocal = originalGrossLocal - actualGrossLocal
        // Explicit 3-step conversion: paisa → NPR → USD → cents
        const adjustmentNpr = adjustmentAmountLocal / 100
        const adjustmentUsd = adjustmentNpr * exchangeRate
        const adjustmentAmountUsdCents = Math.round(adjustmentUsd * 100)

        if (adjustmentAmountLocal <= 0) continue

        // Insert reconciliation record
        const { data: record, error: insertError } = await supabase
          .from('leave_reconciliation_records')
          .insert({
            organization_id: invoice.organization_id,
            source_invoice_id: invoice.id,
            billing_period_start: periodStart,
            billing_period_end: periodEnd,
            member_id: item.member_id,
            member_name: item.member_name || 'Unknown',
            original_payable_days: originalPayableDays,
            original_calendar_days: calendarDays,
            original_unpaid_leave_days: originalUnpaidDays,
            original_monthly_gross_local: originalGrossLocal,
            actual_payable_days: actualPayableDays,
            actual_unpaid_leave_days: actualUnpaidDays,
            actual_monthly_gross_local: actualGrossLocal,
            adjustment_days: adjustmentDays,
            adjustment_amount_local: adjustmentAmountLocal,
            adjustment_amount_usd_cents: adjustmentAmountUsdCents,
            late_leave_request_ids: lateLeaveRequests.map(r => r.id),
            status: 'pending'
          })
          .select()
          .single()

        if (insertError) {
          console.error(`[LeaveReconciliation] Insert error for member ${item.member_id}:`, insertError.message)
          continue
        }

        adjustments.push(record)
      } catch (err) {
        console.error(`[LeaveReconciliation] Error processing member ${item.member_id}:`, err.message)
      }
    }

    const totalCreditCents = adjustments.reduce((sum, a) => sum + a.adjustment_amount_usd_cents, 0)
    return { adjustments, totalCreditCents }
  },

  /**
   * Apply pending reconciliation credits to a new invoice being generated.
   * Called during invoice generation to include credits from previous month.
   *
   * @param {string} orgId — Organization ID
   * @param {string} invoiceId — The new invoice being generated
   * @returns {object} { adjustmentItems, totalCreditCents }
   */
  async applyPendingCredits(orgId, invoiceId) {
    // Find pending reconciliation records for this org
    const { data: pending, error } = await supabase
      .from('leave_reconciliation_records')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'pending')

    if (error) throw error
    if (!pending || pending.length === 0) {
      return { adjustmentItems: [], totalCreditCents: 0 }
    }

    const adjustmentItems = pending.map(record => ({
      type: 'leave_adjustment_credit',
      reconciliation_record_id: record.id,
      source_invoice_id: record.source_invoice_id,
      member_id: record.member_id,
      member_name: record.member_name,
      billing_period: `${record.billing_period_start} to ${record.billing_period_end}`,
      original_days: record.original_payable_days,
      actual_days: record.actual_payable_days,
      adjustment_days: record.adjustment_days,
      credit_amount_local: record.adjustment_amount_local,
      credit_amount_usd_cents: record.adjustment_amount_usd_cents,
      description: `Leave adjustment credit: ${record.member_name} — ${record.adjustment_days} additional unpaid day(s) in ${record.billing_period_start} to ${record.billing_period_end}`
    }))

    const totalCreditCents = adjustmentItems.reduce((sum, a) => sum + a.credit_amount_usd_cents, 0)

    // Mark records as applied and link to target invoice
    const recordIds = pending.map(r => r.id)
    await supabase
      .from('leave_reconciliation_records')
      .update({
        status: 'applied',
        target_invoice_id: invoiceId,
        applied_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', recordIds)

    // Update the invoice with adjustment data and invalidate cached PDF
    await supabase
      .from('invoices')
      .update({
        leave_adjustments: adjustmentItems,
        adjustment_credits_cents: totalCreditCents,
        pdf_url: null, // Force PDF regeneration since amounts changed
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)

    return { adjustmentItems, totalCreditCents }
  },

  /**
   * Get reconciliation history for an organization.
   *
   * @param {string} orgId
   * @param {object} filters — { status, periodStart, periodEnd }
   * @returns {Array}
   */
  async getReconciliationRecords(orgId, filters = {}) {
    let query = supabase
      .from('leave_reconciliation_records')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.periodStart) query = query.gte('billing_period_start', filters.periodStart)
    if (filters.periodEnd) query = query.lte('billing_period_end', filters.periodEnd)

    const { data, error } = await query
    if (error) throw error
    return data || []
  }
}
