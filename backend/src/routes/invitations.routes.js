import { Router } from 'express'
import { invitationsController } from '../controllers/invitations.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// All invitation routes require authentication (but NOT organization membership)
// These are for candidates who don't have an organization yet
router.use(authenticate)

/**
 * GET /api/invitations/pending
 * Get pending invitations for the current user
 * Returns invitations that match the user's email
 */
router.get('/pending', invitationsController.getPending)

/**
 * POST /api/invitations/:memberId/accept
 * Accept an invitation and join the organization
 */
router.post('/:memberId/accept', invitationsController.accept)

/**
 * POST /api/invitations/:memberId/decline
 * Decline an invitation
 */
router.post('/:memberId/decline', invitationsController.decline)

export default router
