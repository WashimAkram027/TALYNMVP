import { Router } from 'express'
import { invoicesController } from '../controllers/invoices.controller.js'
import { authenticate, requireOrganization, requireEmployer } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { createInvoiceSchema, updateInvoiceSchema, rejectInvoiceSchema } from '../utils/validators.js'

const router = Router()

router.use(authenticate)
router.use(requireOrganization)

// ─── Billing invoice routes (must be BEFORE /:id to avoid param conflicts) ───
router.get('/billing', requireEmployer, invoicesController.getBillingInvoices)
router.get('/billing/stats', requireEmployer, invoicesController.getBillingStats)
router.get('/billing/:id', requireEmployer, invoicesController.getBillingInvoice)
router.post('/billing/:id/approve', requireEmployer, invoicesController.approveBillingInvoice)
router.post('/billing/:id/reject', requireEmployer, validateBody(rejectInvoiceSchema), invoicesController.rejectBillingInvoice)
router.get('/billing/:id/pdf', requireEmployer, invoicesController.downloadInvoicePdf)
router.get('/billing/:id/receipt', requireEmployer, invoicesController.downloadReceiptPdf)
router.post('/billing/:id/retry', requireEmployer, invoicesController.retryBillingPayment)

// ─── Legacy payslip invoice routes ───
router.get('/', invoicesController.getAll)
router.get('/stats', invoicesController.getStats)
router.get('/overdue', invoicesController.getOverdue)
router.get('/generate-number', invoicesController.generateNumber)
router.get('/:id', invoicesController.getById)
router.post('/', validateBody(createInvoiceSchema), invoicesController.create)
router.post('/update-overdue', invoicesController.updateOverdueStatus)
router.put('/:id', validateBody(updateInvoiceSchema), invoicesController.update)
router.delete('/:id', invoicesController.delete)

export default router
