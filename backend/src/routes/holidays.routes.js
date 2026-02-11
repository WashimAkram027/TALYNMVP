import { Router } from 'express'
import { holidaysController } from '../controllers/holidays.controller.js'
import { authenticate, requireOrganization } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)
router.use(requireOrganization)

router.get('/', holidaysController.getAll)
router.get('/upcoming', holidaysController.getUpcoming)
router.post('/', holidaysController.create)
router.post('/copy-global', holidaysController.copyGlobal)
router.put('/:id', holidaysController.update)
router.delete('/:id', holidaysController.delete)

export default router
