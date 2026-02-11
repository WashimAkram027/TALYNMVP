import { Router } from 'express'
import { payrollController } from '../controllers/payroll.controller.js'
import { authenticate, requireOrganization } from '../middleware/auth.js'

const router = Router()

// All payroll routes require authentication and organization membership
router.use(authenticate)
router.use(requireOrganization)

/**
 * GET /api/payroll/runs
 * Get all payroll runs for the organization
 * Query params: status, fromDate, toDate
 */
router.get('/runs', payrollController.getRuns)

/**
 * GET /api/payroll/upcoming
 * Get upcoming payroll for the organization
 */
router.get('/upcoming', payrollController.getUpcoming)

/**
 * GET /api/payroll/runs/:id
 * Get a single payroll run with items
 */
router.get('/runs/:id', payrollController.getRun)

/**
 * POST /api/payroll/runs
 * Create a new payroll run
 * Body: payPeriodStart, payPeriodEnd, payDate
 */
router.post('/runs', payrollController.createRun)

/**
 * PUT /api/payroll/runs/:id/status
 * Update payroll run status
 * Body: status (draft, processing, completed, cancelled)
 */
router.put('/runs/:id/status', payrollController.updateRunStatus)

/**
 * DELETE /api/payroll/runs/:id
 * Delete a payroll run (only if draft)
 */
router.delete('/runs/:id', payrollController.deleteRun)

/**
 * PUT /api/payroll/items/:id
 * Update a payroll item
 */
router.put('/items/:id', payrollController.updateItem)

/**
 * GET /api/payroll/member/:memberId/history
 * Get payroll history for a specific member
 * Query params: limit (default 12)
 */
router.get('/member/:memberId/history', payrollController.getMemberHistory)

export default router
