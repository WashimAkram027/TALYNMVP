import { Router } from 'express'
import { timeOffController } from '../controllers/timeoff.controller.js'
import { authenticate, requireOrganization } from '../middleware/auth.js'
import { validateBody, validateQuery } from '../middleware/validate.js'
import { createTimeOffPolicySchema, updateTimeOffPolicySchema, createTimeOffRequestSchema, reviewTimeOffRequestSchema, timeOffRequestFiltersSchema, initializeBalancesSchema } from '../utils/validators.js'

const router = Router()

// All time off routes require authentication and organization membership
router.use(authenticate)
router.use(requireOrganization)

/**
 * Policies
 */

/**
 * GET /api/timeoff/policies
 * Get all time off policies for the organization
 */
router.get('/policies', timeOffController.getPolicies)

/**
 * POST /api/timeoff/policies
 * Create a time off policy
 */
router.post('/policies', validateBody(createTimeOffPolicySchema), timeOffController.createPolicy)

/**
 * PUT /api/timeoff/policies/:id
 * Update a time off policy
 */
router.put('/policies/:id', validateBody(updateTimeOffPolicySchema), timeOffController.updatePolicy)

/**
 * DELETE /api/timeoff/policies/:id
 * Delete (deactivate) a time off policy
 */
router.delete('/policies/:id', timeOffController.deletePolicy)

/**
 * Balances
 */

/**
 * GET /api/timeoff/balances/:memberId
 * Get employee time off balances
 * Query params: year (default current year)
 */
router.get('/balances/:memberId', timeOffController.getBalances)

/**
 * POST /api/timeoff/balances/:memberId/initialize
 * Initialize balances for a new year/employee
 * Body: year (default current year)
 */
router.post('/balances/:memberId/initialize', validateBody(initializeBalancesSchema), timeOffController.initializeBalances)

/**
 * Requests
 */

/**
 * GET /api/timeoff/requests
 * Get time off requests
 * Query params: memberId, status, fromDate, toDate
 */
router.get('/requests', validateQuery(timeOffRequestFiltersSchema), timeOffController.getRequests)

/**
 * POST /api/timeoff/requests
 * Request time off
 * Body: policyId, startDate, endDate, reason (optional), memberId (optional)
 */
router.post('/requests', validateBody(createTimeOffRequestSchema), timeOffController.createRequest)

/**
 * PUT /api/timeoff/requests/:id/review
 * Review (approve/reject) time off request
 * Body: approved (boolean), notes (optional)
 */
router.put('/requests/:id/review', validateBody(reviewTimeOffRequestSchema), timeOffController.reviewRequest)

/**
 * PUT /api/timeoff/requests/:id/cancel
 * Cancel a pending request
 */
router.put('/requests/:id/cancel', timeOffController.cancelRequest)

/**
 * GET /api/timeoff/member/:memberId/upcoming
 * Get upcoming time off for an employee
 */
router.get('/member/:memberId/upcoming', timeOffController.getUpcomingTimeOff)

export default router
