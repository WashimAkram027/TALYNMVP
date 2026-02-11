import { Router } from 'express'
import { authController } from '../controllers/auth.controller.js'
import { authenticate } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { signupSchema, loginSchema, checkEmailSchema } from '../utils/validators.js'
import { z } from 'zod'

const router = Router()

// Public routes
router.post('/signup', validateBody(signupSchema), authController.signup)
router.post('/login', validateBody(loginSchema), authController.login)
router.post('/check-email', validateBody(checkEmailSchema), authController.checkEmail)

router.post('/forgot-password',
  validateBody(z.object({ email: z.string().email() })),
  authController.forgotPassword
)

router.post('/reset-password',
  validateBody(z.object({
    token: z.string().min(1),
    password: z.string().min(6)
  })),
  authController.resetPassword
)

// Protected routes
router.get('/me', authenticate, authController.me)
router.post('/logout', authenticate, authController.logout)
router.post('/refresh', authenticate, authController.refresh)

export default router
