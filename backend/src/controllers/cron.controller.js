import { env } from '../config/env.js'
import { invoiceGenerationService } from '../services/invoiceGeneration.service.js'
import { emailService } from '../services/email.service.js'
import { supabase } from '../config/supabase.js'

/**
 * Validate cron secret header
 */
function validateCronSecret(req, res) {
  const secret = req.headers['x-cron-secret']
  if (!env.cronSecret || secret !== env.cronSecret) {
    res.status(403).json({ error: 'Unauthorized' })
    return false
  }
  return true
}

/**
 * Format USD cents as display string
 */
function formatUsd(cents) {
  return `$${(cents / 100).toFixed(2)}`
}

export const cronController = {
  /**
   * POST /api/cron/generate-invoices
   * Called on the 26th of each month. Generates invoices, PDFs, and sends notification emails.
   */
  async generateMonthlyInvoices(req, res) {
    if (!validateCronSecret(req, res)) return

    try {
      console.log('[Cron] Starting monthly invoice generation...')
      const summary = await invoiceGenerationService.generateMonthlyInvoices()
      console.log('[Cron] Invoice generation summary:', summary)

      // For each generated invoice, generate PDF and send email
      if (summary.generated > 0) {
        // Fetch the invoices we just created (this month's billing invoices)
        const now = new Date()
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

        const { data: invoices } = await supabase
          .from('invoices')
          .select(`
            id, invoice_number, total_amount_cents, due_date, organization_id,
            organization:organizations!invoices_organization_id_fkey(name, billing_email, email, owner_id)
          `)
          .eq('type', 'billing')
          .eq('billing_period_start', periodStart)
          .eq('status', 'pending')

        for (const inv of invoices || []) {
          // Generate PDF (non-blocking errors)
          try {
            await invoiceGenerationService.generateInvoicePdf(inv.id, inv.organization_id)
          } catch (pdfErr) {
            console.error(`[Cron] PDF generation failed for invoice ${inv.invoice_number}:`, pdfErr.message)
          }

          // Send notification email
          try {
            const org = inv.organization
            const employerEmail = org?.billing_email || org?.email
            if (employerEmail) {
              const dueDate = new Date(inv.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
              await emailService.sendInvoiceReadyEmail(
                employerEmail,
                org.name,
                inv.invoice_number,
                formatUsd(inv.total_amount_cents),
                dueDate
              )
            }
          } catch (emailErr) {
            console.error(`[Cron] Email failed for invoice ${inv.invoice_number}:`, emailErr.message)
          }
        }
      }

      res.json({ success: true, summary })
    } catch (error) {
      console.error('[Cron] Monthly invoice generation failed:', error)
      res.status(500).json({ error: 'Invoice generation failed', message: error.message })
    }
  },

  /**
   * POST /api/cron/collect-payments
   * Safety net — processes any approved automatic invoices that weren't collected on approval.
   * Also sends reminders for manual-payment invoices.
   */
  async collectApprovedPayments(req, res) {
    if (!validateCronSecret(req, res)) return

    try {
      console.log('[Cron] Checking for uncollected approved invoices...')
      const today = new Date().toISOString().split('T')[0]

      // Find approved automatic invoices that should have been processed
      const { data: autoInvoices } = await supabase
        .from('invoices')
        .select(`
          id, invoice_number, total_amount_cents, organization_id, payment_type,
          organization:organizations!invoices_organization_id_fkey(name, billing_email, email)
        `)
        .eq('type', 'billing')
        .eq('status', 'approved')
        .eq('payment_type', 'automatic')
        .lte('due_date', today)

      let processed = 0
      const errors = []

      // Dynamically import to avoid circular deps
      const { paymentsService } = await import('../services/payments.service.js')

      for (const inv of autoInvoices || []) {
        try {
          await paymentsService.processInvoicePayment(inv.id, inv.organization_id)
          processed++
        } catch (err) {
          errors.push({ invoiceId: inv.id, error: err.message })
        }
      }

      // Send reminders for manual payment invoices
      const { data: manualInvoices } = await supabase
        .from('invoices')
        .select(`
          id, invoice_number, total_amount_cents, due_date, organization_id,
          organization:organizations!invoices_organization_id_fkey(name, billing_email, email)
        `)
        .eq('type', 'billing')
        .eq('status', 'approved')
        .eq('payment_type', 'manual')
        .lte('due_date', today)

      let reminders = 0
      for (const inv of manualInvoices || []) {
        try {
          const org = inv.organization
          const email = org?.billing_email || org?.email
          if (email) {
            const dueDate = new Date(inv.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            await emailService.sendPaymentReminderEmail(email, org.name, inv.invoice_number, formatUsd(inv.total_amount_cents), dueDate)
            reminders++
          }
        } catch (emailErr) {
          console.error(`[Cron] Reminder email failed for ${inv.invoice_number}:`, emailErr.message)
        }
      }

      res.json({ success: true, processed, reminders, errors })
    } catch (error) {
      console.error('[Cron] Payment collection failed:', error)
      res.status(500).json({ error: 'Payment collection failed', message: error.message })
    }
  },

  /**
   * POST /api/cron/mark-overdue
   * Runs daily. Marks pending/approved invoices past due date as overdue.
   */
  async markOverdueInvoices(req, res) {
    if (!validateCronSecret(req, res)) return

    try {
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('invoices')
        .update({ status: 'overdue', updated_at: new Date().toISOString() })
        .eq('type', 'billing')
        .in('status', ['pending', 'approved'])
        .lt('due_date', today)
        .select('id, invoice_number')

      if (error) throw error

      console.log(`[Cron] Marked ${(data || []).length} invoices as overdue`)
      res.json({ success: true, marked: (data || []).length })
    } catch (error) {
      console.error('[Cron] Mark overdue failed:', error)
      res.status(500).json({ error: 'Mark overdue failed', message: error.message })
    }
  }
}
