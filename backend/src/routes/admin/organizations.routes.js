import { Router } from 'express'
import { adminOrganizationsController } from '../../controllers/admin/organizations.controller.js'
import { authenticateAdmin, requireAdminRole } from '../../middleware/adminAuth.js'

const router = Router()

router.use(authenticateAdmin)

router.get('/', adminOrganizationsController.list)
router.get('/:id', adminOrganizationsController.getDetail)
router.get('/:id/entity', adminOrganizationsController.getEntity)
router.post('/:id/entity/approve', requireAdminRole('super_admin', 'compliance_officer'), adminOrganizationsController.approveEntity)
router.post('/:id/entity/reject', requireAdminRole('super_admin', 'compliance_officer'), adminOrganizationsController.rejectEntity)
router.get('/:id/members', adminOrganizationsController.getMembers)
router.get('/:id/payment-methods', adminOrganizationsController.getPaymentMethods)
router.get('/:id/payroll-runs', adminOrganizationsController.getPayrollRuns)
router.put('/:id', requireAdminRole('super_admin'), adminOrganizationsController.update)
router.post('/:id/suspend', requireAdminRole('super_admin'), adminOrganizationsController.suspend)
router.post('/:id/reactivate', requireAdminRole('super_admin'), adminOrganizationsController.reactivate)

export default router
