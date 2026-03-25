import { Router } from 'express'
import { adminDashboardController } from '../../controllers/admin/dashboard.controller.js'
import { authenticateAdmin } from '../../middleware/adminAuth.js'

const router = Router()

router.use(authenticateAdmin)

router.get('/metrics', adminDashboardController.getMetrics)
router.get('/alerts', adminDashboardController.getAlerts)

export default router
