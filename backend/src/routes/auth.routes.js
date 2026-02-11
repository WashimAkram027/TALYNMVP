import { Router } from 'express'
import { authController } from '../controllers/auth.controller.js'
import { authenticate } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import {
  signupSchema,
  loginSchema,
  checkEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  resendVerificationSchema
} from '../utils/validators.js'

const router = Router()

// Public routes
router.post('/signup', validateBody(signupSchema), authController.signup)
router.post('/login', validateBody(loginSchema), authController.login)
router.post('/check-email', validateBody(checkEmailSchema), authController.checkEmail)
router.post('/forgot-password', validateBody(forgotPasswordSchema), authController.forgotPassword)
router.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword)
router.get('/verify-email', authController.verifyEmail)
router.post('/resend-verification', validateBody(resendVerificationSchema), authController.resendVerification)

// Protected routes
router.get('/me', authenticate, authController.me)
router.post('/logout', authenticate, authController.logout)
router.post('/refresh', authenticate, authController.refresh)
router.post('/change-password', authenticate, validateBody(changePasswordSchema), authController.changePassword)

export default router
