import { Router } from 'express'
import { authenticate, requireOrganization, requireEmployer } from '../middleware/auth.js'
import { leaveController } from '../controllers/leave.controller.js'

const router = Router()

// All leave routes require authentication + organization
router.use(authenticate, requireOrganization)

// ─── Leave Balances ───────────────────────────────────────────
router.get('/balance/:memberId', leaveController.getBalanceSummary)
router.get('/balance/:memberId/:type', leaveController.getBalance)

// ─── Leave Requests ───────────────────────────────────────────
router.get('/requests', leaveController.listRequests)
router.post('/requests', leaveController.createRequest)
router.put('/requests/:id/approve', requireEmployer, leaveController.approveRequest)
router.put('/requests/:id/reject', requireEmployer, leaveController.rejectRequest)

// ─── Event-Triggered Leave ────────────────────────────────────
router.post('/requests/maternity', leaveController.createMaternityRequest)
router.post('/requests/paternity', leaveController.createPaternityRequest)
router.post('/requests/mourning', leaveController.createMourningRequest)
router.post('/requests/special', leaveController.createSpecialRequest)
router.post('/compensatory-work', leaveController.recordCompensatoryWork)

// ─── Public Holidays ──────────────────────────────────────────
router.get('/public-holidays', leaveController.listPublicHolidays)

// ─── Encashment ───────────────────────────────────────────────
router.post('/encashment/:memberId', requireEmployer, leaveController.calculateEncashment)

export default router
