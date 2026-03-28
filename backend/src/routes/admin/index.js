import { Router } from 'express'
import adminAuthRoutes from './auth.routes.js'
import adminOrganizationsRoutes from './organizations.routes.js'
import adminDashboardRoutes from './dashboard.routes.js'
import adminUsersRoutes from './users.routes.js'
import adminPayrollRoutes from './payroll.routes.js'
import adminWebhooksRoutes from './webhooks.routes.js'
import adminEmailsRoutes from './emails.routes.js'
import adminPaymentsRoutes from './payments.routes.js'
import adminMembersRoutes from './members.routes.js'
import adminEorConfigRoutes from './eorConfig.routes.js'
import adminAuditLogRoutes from './auditLog.routes.js'
import adminInvoicesRoutes from './invoices.routes.js'
import adminPublicHolidaysRoutes from './publicHolidays.routes.js'

const router = Router()

// Admin auth (login doesn't need admin auth middleware)
router.use('/auth', adminAuthRoutes)
router.use('/dashboard', adminDashboardRoutes)
router.use('/organizations', adminOrganizationsRoutes)
router.use('/users', adminUsersRoutes)
router.use('/payroll', adminPayrollRoutes)
router.use('/webhooks', adminWebhooksRoutes)
router.use('/emails', adminEmailsRoutes)
router.use('/payments', adminPaymentsRoutes)
router.use('/members', adminMembersRoutes)
router.use('/eor-config', adminEorConfigRoutes)
router.use('/audit-log', adminAuditLogRoutes)
router.use('/invoices', adminInvoicesRoutes)
router.use('/public-holidays', adminPublicHolidaysRoutes)

export default router
