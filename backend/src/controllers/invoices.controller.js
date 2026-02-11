import { invoicesService } from '../services/invoices.service.js'
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
  }
}
