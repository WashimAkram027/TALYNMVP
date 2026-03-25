import { Router } from 'express'
import { authenticateAdmin, requireAdminRole } from '../../middleware/adminAuth.js'
import { adminAuditLogController } from '../../controllers/admin/auditLog.controller.js'

const router = Router()
router.use(authenticateAdmin)

// Only super_admin can view audit logs
router.get('/', requireAdminRole('super_admin'), adminAuditLogController.list)

export default router
