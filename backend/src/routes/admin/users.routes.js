import { Router } from 'express'
import { adminUsersController } from '../../controllers/admin/users.controller.js'
import { authenticateAdmin, requireAdminRole } from '../../middleware/adminAuth.js'

const router = Router()

router.use(authenticateAdmin)

router.get('/', adminUsersController.list)
router.get('/:id', adminUsersController.getDetail)
router.post('/:id/suspend', requireAdminRole('super_admin', 'support_agent'), adminUsersController.suspend)
router.post('/:id/reactivate', requireAdminRole('super_admin', 'support_agent'), adminUsersController.reactivate)
router.post('/:id/reset-password', requireAdminRole('super_admin', 'support_agent'), adminUsersController.resetPassword)
router.post('/:id/verify-email', requireAdminRole('super_admin', 'support_agent'), adminUsersController.verifyEmail)
router.put('/:id', requireAdminRole('super_admin', 'support_agent'), adminUsersController.update)
router.delete('/:id', requireAdminRole('super_admin'), adminUsersController.deleteUser)

export default router
