import { Router } from 'express'
import { cronController } from '../controllers/cron.controller.js'

const router = Router()

// Cron endpoints — protected by x-cron-secret header, not JWT
router.post('/generate-invoices', cronController.generateMonthlyInvoices)
router.post('/collect-payments', cronController.collectApprovedPayments)
router.post('/mark-overdue', cronController.markOverdueInvoices)

export default router
