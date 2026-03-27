import { adminInvoicesService } from '../../services/admin/invoices.service.js'
import { invoiceGenerationService } from '../../services/invoiceGeneration.service.js'
import { emailService } from '../../services/email.service.js'
import { successResponse, errorResponse } from '../../utils/response.js'

export const adminInvoicesController = {
  async list(req, res) {
    try {
      const result = await adminInvoicesService.listBillingInvoices({
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        status: req.query.status,
        orgId: req.query.orgId,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder
      })
      return successResponse(res, result)
    } catch (error) {
      return errorResponse(res, error.message, 500)
    }
  },

  async getDetail(req, res) {
    try {
      const invoice = await adminInvoicesService.getInvoiceDetail(req.params.id)
      return successResponse(res, invoice)
    } catch (error) {
      const status = error.statusCode === 404 ? 404 : 500
      return errorResponse(res, error.message, status)
    }
  },

  async markAsPaid(req, res) {
    try {
      const invoice = await adminInvoicesService.markAsPaid(
        req.params.id,
        req.admin.id,
        req.body.notes,
        req.ip
      )

      // Generate receipt PDF and send email
      try {
        await invoiceGenerationService.generateReceiptPdf(invoice.id, invoice.organization_id)

        const org = invoice.organization || {}
        const employerEmail = org.billing_email || org.email || invoice.client_email
        if (employerEmail) {
          const amount = `$${((invoice.total_amount_cents || 0) / 100).toFixed(2)}`
          await emailService.sendPaymentReceiptEmail(employerEmail, invoice.client_name, invoice.invoice_number, amount, invoice.receipt_pdf_url)
        }
      } catch (pdfErr) {
        console.error('Failed to generate receipt or send email:', pdfErr.message)
      }

      return successResponse(res, invoice, 'Invoice marked as paid')
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async resolve(req, res) {
    try {
      const invoice = await adminInvoicesService.resolveRejection(
        req.params.id,
        req.admin.id,
        req.body.notes,
        req.ip
      )
      return successResponse(res, invoice, 'Rejection resolved — invoice returned to pending')
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async cancel(req, res) {
    try {
      const invoice = await adminInvoicesService.cancelInvoice(
        req.params.id,
        req.admin.id,
        req.body.notes,
        req.ip
      )
      return successResponse(res, invoice, 'Invoice cancelled')
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  }
}
