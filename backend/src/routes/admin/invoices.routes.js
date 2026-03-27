import { Router } from 'express'
import { authenticateAdmin, requireAdminRole } from '../../middleware/adminAuth.js'
import { adminInvoicesController } from '../../controllers/admin/invoices.controller.js'

const router = Router()

router.use(authenticateAdmin)

router.get('/', adminInvoicesController.list)
router.get('/:id', adminInvoicesController.getDetail)
router.post('/:id/mark-paid', requireAdminRole('super_admin', 'finance_admin'), adminInvoicesController.markAsPaid)
router.post('/:id/resolve', requireAdminRole('super_admin', 'finance_admin'), adminInvoicesController.resolve)
router.post('/:id/cancel', requireAdminRole('super_admin', 'finance_admin'), adminInvoicesController.cancel)

export default router
