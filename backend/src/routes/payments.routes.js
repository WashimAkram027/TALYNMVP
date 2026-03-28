import { Router } from 'express'
import { authenticate, requireEmployer, requireOrganization } from '../middleware/auth.js'
import { paymentsController } from '../controllers/payments.controller.js'

const router = Router()

// GET /api/payments/config - Stripe publishable key (any authenticated user)
router.get('/config', authenticate, paymentsController.getConfig)

// POST /api/payments/setup-intent - Create SetupIntent for bank linking
router.post('/setup-intent', authenticate, requireEmployer, requireOrganization, paymentsController.createSetupIntent)

// POST /api/payments/confirm-setup - Confirm SetupIntent and activate payment method
router.post('/confirm-setup', authenticate, requireEmployer, requireOrganization, paymentsController.confirmSetup)

// GET /api/payments/methods - List all payment methods
router.get('/methods', authenticate, requireEmployer, requireOrganization, paymentsController.getPaymentMethods)

// GET /api/payments/methods/active - Get default active method
router.get('/methods/active', authenticate, requireEmployer, requireOrganization, paymentsController.getActivePaymentMethod)

export default router
