import { Router } from 'express'
import { adminAuthController } from '../../controllers/admin/auth.controller.js'
import { authenticateAdmin } from '../../middleware/adminAuth.js'
import { validateBody } from '../../middleware/validate.js'
import { adminLoginSchema } from '../../utils/validators.js'

const router = Router()

router.post('/login', validateBody(adminLoginSchema), adminAuthController.login)
router.get('/me', authenticateAdmin, adminAuthController.getMe)

export default router
