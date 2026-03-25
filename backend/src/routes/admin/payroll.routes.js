import { Router } from 'express'
import { adminPayrollController } from '../../controllers/admin/payroll.controller.js'
import { authenticateAdmin, requireAdminRole } from '../../middleware/adminAuth.js'

const router = Router()

router.use(authenticateAdmin)

router.get('/', adminPayrollController.listRuns)
router.get('/:id', adminPayrollController.getRunDetail)
router.post('/:id/approve', requireAdminRole('super_admin', 'finance_admin'), adminPayrollController.approve)
router.post('/:id/reject', requireAdminRole('super_admin', 'finance_admin'), adminPayrollController.reject)
router.put('/items/:itemId', requireAdminRole('super_admin', 'finance_admin'), adminPayrollController.updateItem)

export default router
