import { Router } from 'express'
import { adminInvoicesController } from '../../controllers/admin/invoices.controller.js'

const router = Router()

router.get('/', adminInvoicesController.list)
router.get('/:id', adminInvoicesController.getDetail)
router.post('/:id/mark-paid', adminInvoicesController.markAsPaid)
router.post('/:id/resolve', adminInvoicesController.resolve)
router.post('/:id/cancel', adminInvoicesController.cancel)

export default router
