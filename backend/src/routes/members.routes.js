import { Router } from 'express'
import { membersController } from '../controllers/members.controller.js'
import { authenticate, requireEmployer, requireOrganization } from '../middleware/auth.js'

const router = Router()

// All member routes require authentication and organization membership
router.use(authenticate)
router.use(requireOrganization)

/**
 * GET /api/members
 * Get all members of the organization
 * Query params: status, memberRole, department, employmentType, search
 */
router.get('/', membersController.getAll)

/**
 * GET /api/members/stats
 * Get member statistics
 */
router.get('/stats', membersController.getStats)

/**
 * GET /api/members/available-candidates
 * Get candidates available for hiring (not in any organization)
 */
router.get('/available-candidates', requireEmployer, membersController.getAvailableCandidates)

/**
 * GET /api/members/:id
 * Get a single member by ID
 */
router.get('/:id', membersController.getById)

/**
 * POST /api/members
 * Invite a new member (employer only)
 */
router.post('/', requireEmployer, membersController.invite)

/**
 * PUT /api/members/:id
 * Update member details (employer only)
 */
router.put('/:id', requireEmployer, membersController.update)

/**
 * POST /api/members/:id/activate
 * Activate an invited member (employer only)
 */
router.post('/:id/activate', requireEmployer, membersController.activate)

/**
 * POST /api/members/:id/resend-invite
 * Resend an invitation (employer only)
 */
router.post('/:id/resend-invite', requireEmployer, membersController.resendInvite)

/**
 * POST /api/members/:id/offboard
 * Offboard a member (employer only)
 */
router.post('/:id/offboard', requireEmployer, membersController.offboard)

/**
 * DELETE /api/members/:id
 * Delete a member - only invited status (employer only)
 */
router.delete('/:id', requireEmployer, membersController.delete)

export default router
