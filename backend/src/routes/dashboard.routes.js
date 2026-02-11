import { Router } from 'express'
import { dashboardController } from '../controllers/dashboard.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// All dashboard routes require authentication
router.use(authenticate)

// Employer dashboard
router.get('/employer', dashboardController.getEmployerStats)
router.get('/team-overview', dashboardController.getTeamOverview)

// Employee dashboard
router.get('/employee', dashboardController.getEmployeeStats)

// Shared dashboard data
router.get('/holidays', dashboardController.getHolidays)
router.get('/announcements', dashboardController.getAnnouncements)

export default router
