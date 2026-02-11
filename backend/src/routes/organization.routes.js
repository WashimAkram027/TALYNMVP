import { Router } from 'express'
import { organizationController } from '../controllers/organization.controller.js'
import { authenticate, requireEmployer, requireOrganization } from '../middleware/auth.js'

const router = Router()

// All organization routes require authentication and organization membership
router.use(authenticate)
router.use(requireOrganization)

/**
 * GET /api/organization
 * Get current user's organization
 */
router.get('/', organizationController.get)

/**
 * PUT /api/organization
 * Update organization details (owner only)
 */
router.put('/', requireEmployer, organizationController.update)

/**
 * GET /api/organization/stats
 * Get organization statistics
 */
router.get('/stats', organizationController.getStats)

/**
 * GET /api/organization/departments
 * Get list of departments
 */
router.get('/departments', organizationController.getDepartments)

/**
 * PUT /api/organization/settings
 * Update organization settings (owner only)
 */
router.put('/settings', requireEmployer, organizationController.updateSettings)

export default router
