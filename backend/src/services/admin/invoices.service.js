import { supabase } from '../../config/supabase.js'
import { NotFoundError, BadRequestError } from '../../utils/errors.js'
import { auditLogService } from './auditLog.service.js'

export const adminInvoicesService = {
  /**
   * List billing invoices across all organizations with pagination
   */
  async listBillingInvoices({ page = 1, limit = 20, status, orgId, sortBy = 'created_at', sortOrder = 'desc' }) {
    let query = supabase
      .from('invoices')
      .select('*, organization:organizations!invoices_organization_id_fkey(id, name, email)', { count: 'exact' })
      .eq('type', 'billing')

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
   * Get full invoice detail with org, payment transactions, line items
   */
  async getInvoiceDetail(invoiceId) {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        organization:organizations!invoices_organization_id_fkey(id, name, email, billing_email, payment_type),
        approved_by_profile:profiles!invoices_approved_by_fkey(full_name, email),
        rejected_by_profile:profiles!invoices_rejected_by_fkey(full_name, email)
      `)
      .eq('id', invoiceId)
      .eq('type', 'billing')
      .single()

    if (error || !invoice) throw new NotFoundError('Billing invoice not found')

    // Get payment transactions
    const { data: transactions } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false })

    return { ...invoice, transactions: transactions || [] }
  },

  /**
   * Admin marks invoice as paid (for manual payment confirmations)
   */
  async markAsPaid(invoiceId, adminId, notes, ip) {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('status, organization_id, invoice_number')
      .eq('id', invoiceId)
      .eq('type', 'billing')
      .single()

    if (!invoice) throw new NotFoundError('Invoice not found')
    if (invoice.status !== 'approved' && invoice.status !== 'overdue') {
      throw new BadRequestError(`Cannot mark as paid — current status: ${invoice.status}`)
    }

    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select()
      .single()

    if (error) throw error

    // Also mark linked payroll run as completed
    if (data.payroll_run_id) {
      await supabase
        .from('payroll_runs')
        .update({
          status: 'completed',
          payment_status: 'succeeded',
          funded_at: new Date().toISOString()
        })
        .eq('id', data.payroll_run_id)
    }

    // Audit log
    await auditLogService.log(adminId, 'invoice_marked_paid', 'invoice', invoiceId, { invoice_number: invoice.invoice_number, notes }, ip)

    return data
  },

  /**
   * Admin resolves a rejected invoice
   */
  async resolveRejection(invoiceId, adminId, notes, ip) {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('status, invoice_number')
      .eq('id', invoiceId)
      .eq('type', 'billing')
      .single()

    if (!invoice) throw new NotFoundError('Invoice not found')
    if (invoice.status !== 'rejected') {
      throw new BadRequestError(`Cannot resolve — current status: ${invoice.status}`)
    }

    // Move back to pending so employer can re-review
    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'pending',
        rejection_reason: null,
        rejected_by: null,
        rejected_at: null,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select()
      .single()

    if (error) throw error

    await auditLogService.log(adminId, 'invoice_rejection_resolved', 'invoice', invoiceId, { invoice_number: invoice.invoice_number, notes }, ip)

    return data
  },

  /**
   * Admin cancels an invoice
   */
  async cancelInvoice(invoiceId, adminId, notes, ip) {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('status, invoice_number')
      .eq('id', invoiceId)
      .eq('type', 'billing')
      .single()

    if (!invoice) throw new NotFoundError('Invoice not found')
    if (['paid', 'processing'].includes(invoice.status)) {
      throw new BadRequestError(`Cannot cancel — current status: ${invoice.status}`)
    }

    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'cancelled',
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select()
      .single()

    if (error) throw error

    await auditLogService.log(adminId, 'invoice_cancelled', 'invoice', invoiceId, { invoice_number: invoice.invoice_number, notes }, ip)

    return data
  }
}
