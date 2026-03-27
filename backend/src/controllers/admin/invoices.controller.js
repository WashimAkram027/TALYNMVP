import { adminInvoicesService } from '../../services/admin/invoices.service.js'
import { invoiceGenerationService } from '../../services/invoiceGeneration.service.js'
import { emailService } from '../../services/email.service.js'

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
      res.json({ success: true, ...result })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  },

  async getDetail(req, res) {
    try {
      const invoice = await adminInvoicesService.getInvoiceDetail(req.params.id)
      res.json({ success: true, data: invoice })
    } catch (error) {
      const status = error.statusCode === 404 ? 404 : 500
      res.status(status).json({ success: false, error: error.message })
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

      res.json({ success: true, data: invoice, message: 'Invoice marked as paid' })
    } catch (error) {
      const status = error.statusCode || 500
      res.status(status).json({ success: false, error: error.message })
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
      res.json({ success: true, data: invoice, message: 'Rejection resolved — invoice returned to pending' })
    } catch (error) {
      const status = error.statusCode || 500
      res.status(status).json({ success: false, error: error.message })
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
      res.json({ success: true, data: invoice, message: 'Invoice cancelled' })
    } catch (error) {
      const status = error.statusCode || 500
      res.status(status).json({ success: false, error: error.message })
    }
  }
}
