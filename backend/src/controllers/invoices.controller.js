import { invoicesService } from '../services/invoices.service.js'
import { invoiceGenerationService } from '../services/invoiceGeneration.service.js'
import { paymentsService } from '../services/payments.service.js'
import { emailService } from '../services/email.service.js'
import { notificationService } from '../services/notification.service.js'
import { supabase } from '../config/supabase.js'
import { env } from '../config/env.js'
import { successResponse, createdResponse, errorResponse, notFoundResponse } from '../utils/response.js'

export const invoicesController = {
  async getAll(req, res) {
    try {
      const filters = {
        status: req.query.status,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate,
        search: req.query.search
      }
      const invoices = await invoicesService.getInvoices(req.user.organizationId, filters)
      return successResponse(res, invoices)
    } catch (error) {
      return errorResponse(res, 'Failed to get invoices', 500, error)
    }
  },

  async getById(req, res) {
    try {
      const invoice = await invoicesService.getInvoice(req.params.id, req.user.organizationId)
      return successResponse(res, invoice)
    } catch (error) {
      if (error.message === 'Invoice not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to get invoice', 500, error)
    }
  },

  async create(req, res) {
    try {
      const invoice = await invoicesService.createInvoice(req.user.organizationId, req.body, req.user.id)
      return createdResponse(res, invoice, 'Invoice created successfully')
    } catch (error) {
      return errorResponse(res, 'Failed to create invoice', 500, error)
    }
  },

  async update(req, res) {
    try {
      const invoice = await invoicesService.updateInvoice(req.params.id, req.user.organizationId, req.body)
      return successResponse(res, invoice, 'Invoice updated successfully')
    } catch (error) {
      if (error.message === 'Invoice not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to update invoice', 500, error)
    }
  },

  async delete(req, res) {
    try {
      await invoicesService.deleteInvoice(req.params.id, req.user.organizationId)
      return successResponse(res, null, 'Invoice deleted successfully')
    } catch (error) {
      return errorResponse(res, 'Failed to delete invoice', 500, error)
    }
  },

  async getStats(req, res) {
    try {
      const stats = await invoicesService.getInvoiceStats(req.user.organizationId)
      return successResponse(res, stats)
    } catch (error) {
      return errorResponse(res, 'Failed to get invoice stats', 500, error)
    }
  },

  async getOverdue(req, res) {
    try {
      const invoices = await invoicesService.getOverdueInvoices(req.user.organizationId)
      return successResponse(res, invoices)
    } catch (error) {
      return errorResponse(res, 'Failed to get overdue invoices', 500, error)
    }
  },

  async updateOverdueStatus(req, res) {
    try {
      const invoices = await invoicesService.updateOverdueStatus(req.user.organizationId)
      return successResponse(res, invoices, 'Overdue status updated')
    } catch (error) {
      return errorResponse(res, 'Failed to update overdue status', 500, error)
    }
  },

  async generateNumber(req, res) {
    try {
      const number = await invoicesService.generateInvoiceNumber(req.user.organizationId)
      return successResponse(res, { invoiceNumber: number })
    } catch (error) {
      return errorResponse(res, 'Failed to generate invoice number', 500, error)
    }
  },

  // ─── Billing Invoice Endpoints ──────────────────────────────

  async getBillingInvoices(req, res) {
    try {
      const filters = {
        status: req.query.status,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate
      }
      const invoices = await invoicesService.getBillingInvoices(req.user.organizationId, filters)
      return successResponse(res, invoices)
    } catch (error) {
      return errorResponse(res, 'Failed to get billing invoices', 500, error)
    }
  },

  async getBillingInvoice(req, res) {
    try {
      const invoice = await invoicesService.getBillingInvoice(req.params.id, req.user.organizationId)
      return successResponse(res, invoice)
    } catch (error) {
      if (error.statusCode === 404) return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to get billing invoice', 500, error)
    }
  },

  async getBillingStats(req, res) {
    try {
      const stats = await invoicesService.getBillingStats(req.user.organizationId)
      return successResponse(res, stats)
    } catch (error) {
      return errorResponse(res, 'Failed to get billing stats', 500, error)
    }
  },

  async approveBillingInvoice(req, res) {
    try {
      const invoice = await invoicesService.approveInvoice(req.params.id, req.user.organizationId, req.user.id)

      // Send admin notification
      try {
        const amount = `$${((invoice.total_amount_cents || 0) / 100).toFixed(2)}`
        await emailService.sendInvoiceApprovedEmail(
          env.adminEmail, invoice.client_name || 'Unknown', invoice.invoice_number, amount, invoice.payment_type
        )

        // In-app notification for employer
        await notificationService.create({
          recipientId: req.user.id,
          organizationId: req.user.organizationId,
          type: 'invoice_approved',
          title: 'Invoice approved',
          message: `Invoice ${invoice.invoice_number} for ${amount} has been approved`,
          actionUrl: '/billing',
          metadata: { invoice_id: invoice.id, invoice_number: invoice.invoice_number, amount, payment_type: invoice.payment_type }
        })

        // In-app notification for admin
        const { data: admins } = await supabase
          .from('admin_roles')
          .select('user_id')
          .in('role', ['super_admin', 'finance_admin'])
        for (const admin of admins || []) {
          await notificationService.create({
            recipientId: admin.user_id,
            organizationId: req.user.organizationId,
            type: 'invoice_approved',
            title: 'Invoice approved by employer',
            message: `${invoice.client_name || 'Employer'} approved invoice ${invoice.invoice_number} (${amount})`,
            actionUrl: `/invoices`,
            metadata: { invoice_id: invoice.id, invoice_number: invoice.invoice_number, amount }
          })
        }
      } catch (emailErr) {
        console.error('Failed to send invoice approved email:', emailErr)
      }

      // For automatic payment: trigger ACH pull immediately
      if (invoice.payment_type === 'automatic') {
        try {
          const paymentResult = await paymentsService.processInvoicePayment(invoice.id, req.user.organizationId)
          return successResponse(res, { invoice, payment: paymentResult }, 'Invoice approved and payment initiated')
        } catch (payErr) {
          // Payment failed but approval succeeded — return invoice with payment error
          return successResponse(res, { invoice, paymentError: payErr.message }, 'Invoice approved but payment failed — you can retry')
        }
      }

      // For manual payment: send reminder email
      if (invoice.payment_type === 'manual') {
        try {
          const amount = `$${((invoice.total_amount_cents || 0) / 100).toFixed(2)}`
          const dueDate = new Date(invoice.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          const employerEmail = req.user.email
          if (employerEmail) {
            await emailService.sendPaymentReminderEmail(employerEmail, invoice.client_name, invoice.invoice_number, amount, dueDate)
          }
        } catch (emailErr) {
          console.error('Failed to send payment reminder:', emailErr)
        }
      }

      return successResponse(res, { invoice }, 'Invoice approved successfully')
    } catch (error) {
      if (error.statusCode === 404) return notFoundResponse(res, error.message)
      return errorResponse(res, error.message || 'Failed to approve invoice', 400, error)
    }
  },

  async rejectBillingInvoice(req, res) {
    try {
      const { reason } = req.body
      const invoice = await invoicesService.rejectInvoice(req.params.id, req.user.organizationId, req.user.id, reason)

      // Escalate to admin
      try {
        await emailService.sendInvoiceRejectedEmail(
          env.adminEmail, invoice.client_name || 'Unknown', invoice.invoice_number, reason, req.user.email
        )

        // In-app notification for employer
        await notificationService.create({
          recipientId: req.user.id,
          organizationId: req.user.organizationId,
          type: 'invoice_rejected',
          title: 'Invoice rejected',
          message: `Invoice ${invoice.invoice_number} has been rejected${reason ? ': ' + reason : ''}`,
          actionUrl: '/billing',
          metadata: { invoice_id: invoice.id, invoice_number: invoice.invoice_number, reason }
        })
      } catch (emailErr) {
        console.error('Failed to send invoice rejected email:', emailErr)
      }

      return successResponse(res, { invoice }, 'Invoice rejected — escalated to Talyn support')
    } catch (error) {
      if (error.statusCode === 404) return notFoundResponse(res, error.message)
      return errorResponse(res, error.message || 'Failed to reject invoice', 400, error)
    }
  },

  async downloadInvoicePdf(req, res) {
    try {
      const variant = req.query.variant === 'summary' ? 'summary' : 'detail'
      const { pdfBuffer, invoiceNumber } = await invoiceGenerationService.generateInvoicePdf(req.params.id, req.user.organizationId, variant)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${invoiceNumber}.pdf"`)
      return res.send(pdfBuffer)
    } catch (error) {
      if (error.statusCode === 404) return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to generate invoice PDF', 500, error)
    }
  },

  async downloadReceiptPdf(req, res) {
    try {
      const variant = req.query.variant === 'summary' ? 'summary' : 'detail'
      const { pdfBuffer, invoiceNumber } = await invoiceGenerationService.generateReceiptPdf(req.params.id, req.user.organizationId, variant)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${invoiceNumber}-receipt.pdf"`)
      return res.send(pdfBuffer)
    } catch (error) {
      if (error.statusCode === 404) return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to generate receipt PDF', 500, error)
    }
  },

  async retryBillingPayment(req, res) {
    try {
      // First revert to approved so processInvoicePayment can claim it
      const { data: inv, error: revertError } = await (await import('../config/supabase.js')).supabase
        .from('invoices')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .eq('organization_id', req.user.organizationId)
        .eq('status', 'payment_failed')
        .eq('type', 'billing')
        .select()
        .single()

      if (revertError || !inv) {
        return errorResponse(res, 'Invoice not eligible for retry (must be in payment_failed status)', 400)
      }

      const paymentResult = await paymentsService.processInvoicePayment(inv.id, req.user.organizationId)
      return successResponse(res, { invoice: inv, payment: paymentResult }, 'Payment retry initiated')
    } catch (error) {
      return errorResponse(res, error.message || 'Payment retry failed', 400, error)
    }
  }
}
