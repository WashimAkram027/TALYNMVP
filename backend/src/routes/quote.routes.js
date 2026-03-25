import { Router } from 'express'
import { quoteController } from '../controllers/quote.controller.js'
import { authenticate, requireEmployer, requireOrganization } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { generateQuoteSchema } from '../utils/validators.js'

const router = Router()

// All quote routes require authentication
router.use(authenticate)

/**
 * GET /api/quotes/cost-config
 * Get active cost configuration (any authenticated user)
 */
router.get('/cost-config', quoteController.getCostConfig)

// Remaining routes require organization
router.use(requireOrganization)

/**
 * GET /api/quotes
 * List quotes for the organization
 */
router.get('/', quoteController.listQuotes)

/**
 * POST /api/quotes/generate
 * Generate a cost quote (employer only)
 */
router.post('/generate', requireEmployer, validateBody(generateQuoteSchema), quoteController.generateQuote)

/**
 * GET /api/quotes/:quoteId/pdf
 * Generate and download quote PDF (employer only)
 */
router.get('/:quoteId/pdf', requireEmployer, quoteController.downloadQuotePdf)

/**
 * POST /api/quotes/:quoteId/accept-and-invite
 * Accept quote and send invitation (employer only)
 */
router.post('/:quoteId/accept-and-invite', requireEmployer, quoteController.acceptQuoteAndInvite)

/**
 * GET /api/quotes/:quoteId
 * Get a single quote
 */
router.get('/:quoteId', quoteController.getQuote)

export default router
