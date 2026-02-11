import { Router } from 'express'
import { invoicesController } from '../controllers/invoices.controller.js'
import { authenticate, requireOrganization } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)
router.use(requireOrganization)

router.get('/', invoicesController.getAll)
router.get('/stats', invoicesController.getStats)
router.get('/overdue', invoicesController.getOverdue)
router.get('/generate-number', invoicesController.generateNumber)
router.get('/:id', invoicesController.getById)
router.post('/', invoicesController.create)
router.post('/update-overdue', invoicesController.updateOverdueStatus)
router.put('/:id', invoicesController.update)
router.delete('/:id', invoicesController.delete)

export default router
