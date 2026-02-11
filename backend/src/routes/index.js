import { Router } from 'express'
import authRoutes from './auth.routes.js'
import profileRoutes from './profile.routes.js'
import organizationRoutes from './organization.routes.js'
import membersRoutes from './members.routes.js'
import invitationsRoutes from './invitations.routes.js'
import dashboardRoutes from './dashboard.routes.js'
import documentsRoutes from './documents.routes.js'
import payrollRoutes from './payroll.routes.js'
import timeoffRoutes from './timeoff.routes.js'
import invoicesRoutes from './invoices.routes.js'
import holidaysRoutes from './holidays.routes.js'
import announcementsRoutes from './announcements.routes.js'
import jobPostingsRoutes from './jobpostings.routes.js'
import applicationsRoutes from './applications.routes.js'
import complianceRoutes from './compliance.routes.js'
import benefitsRoutes from './benefits.routes.js'

const router = Router()

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Talyn API is running',
    timestamp: new Date().toISOString()
  })
})

// Mount routes
router.use('/auth', authRoutes)
router.use('/profile', profileRoutes)
router.use('/organization', organizationRoutes)
router.use('/members', membersRoutes)
router.use('/invitations', invitationsRoutes)
router.use('/dashboard', dashboardRoutes)
router.use('/documents', documentsRoutes)
router.use('/payroll', payrollRoutes)
router.use('/timeoff', timeoffRoutes)
router.use('/invoices', invoicesRoutes)
router.use('/holidays', holidaysRoutes)
router.use('/announcements', announcementsRoutes)
router.use('/jobs', jobPostingsRoutes)
router.use('/applications', applicationsRoutes)
router.use('/compliance', complianceRoutes)
router.use('/benefits', benefitsRoutes)

export default router
