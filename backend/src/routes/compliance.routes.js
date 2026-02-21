import { Router } from 'express'
import { complianceController } from '../controllers/compliance.controller.js'
import { authenticate, requireOrganization } from '../middleware/auth.js'
import { validateBody, validateQuery } from '../middleware/validate.js'
import { createComplianceItemSchema, updateComplianceItemSchema, createComplianceAlertSchema, complianceFiltersSchema } from '../utils/validators.js'

const router = Router()

router.use(authenticate)
router.use(requireOrganization)

// Items
router.get('/items', validateQuery(complianceFiltersSchema), complianceController.getItems)
router.get('/items/due-soon', complianceController.getDueSoon)
router.get('/items/member/:memberId', complianceController.getMemberItems)
router.post('/items', validateBody(createComplianceItemSchema), complianceController.createItem)
router.put('/items/:id', validateBody(updateComplianceItemSchema), complianceController.updateItem)
router.delete('/items/:id', complianceController.deleteItem)

// Alerts
router.get('/alerts', complianceController.getAlerts)
router.post('/alerts', validateBody(createComplianceAlertSchema), complianceController.createAlert)
router.put('/alerts/:id/read', complianceController.markAlertRead)
router.put('/alerts/:id/dismiss', complianceController.dismissAlert)

// Score
router.get('/score', complianceController.getScore)

export default router
