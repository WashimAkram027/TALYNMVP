import { Router } from 'express'
import { authorizedUsersController } from '../controllers/authorizedUsers.controller.js'
import { authenticate, requireEmployer, requireOrganization } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { inviteAuthorizedUserSchema, setupAuthorizedUserSchema } from '../utils/validators.js'

const router = Router()

// Public routes (no auth required) — must come BEFORE auth middleware
router.post('/setup', validateBody(setupAuthorizedUserSchema), authorizedUsersController.setup)
router.get('/validate-token', authorizedUsersController.validateToken)

// Protected routes
router.use(authenticate)
router.use(requireEmployer)
router.use(requireOrganization)

router.get('/', authorizedUsersController.list)
router.post('/', validateBody(inviteAuthorizedUserSchema), authorizedUsersController.invite)
router.delete('/:id', authorizedUsersController.revoke)
router.post('/:id/resend', authorizedUsersController.resendInvite)

export default router
