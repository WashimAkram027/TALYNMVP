import { Router } from 'express'
import { authenticate, requireEmployer } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { submitBankDetailsSchema } from '../utils/validators.js'
import { paymentsController } from '../controllers/payments.controller.js'

const router = Router()

// GET /api/payments/config - Stripe publishable key
router.get('/config', authenticate, paymentsController.getConfig)

// POST /api/payments/setup-intent - Create SetupIntent for bank linking
router.post('/setup-intent', authenticate, requireEmployer, paymentsController.createSetupIntent)

// GET /api/payments/methods - List all payment methods
router.get('/methods', authenticate, requireEmployer, paymentsController.getPaymentMethods)

// GET /api/payments/methods/active - Get default active method
router.get('/methods/active', authenticate, requireEmployer, paymentsController.getActivePaymentMethod)

// POST /api/payments/bank-details - Employee submits bank details (creates Wise recipient)
router.post('/bank-details', authenticate, validateBody(submitBankDetailsSchema), paymentsController.submitBankDetails)

// GET /api/payments/bank-details - Employee gets their bank details
router.get('/bank-details', authenticate, paymentsController.getBankDetails)

export default router
