import { Router } from 'express'
import { holidaysController } from '../controllers/holidays.controller.js'
import { authenticate, requireOrganization } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { createHolidaySchema, updateHolidaySchema, copyGlobalHolidaysSchema } from '../utils/validators.js'

const router = Router()

router.use(authenticate)
router.use(requireOrganization)

router.get('/', holidaysController.getAll)
router.get('/upcoming', holidaysController.getUpcoming)
router.post('/', validateBody(createHolidaySchema), holidaysController.create)
router.post('/copy-global', validateBody(copyGlobalHolidaysSchema), holidaysController.copyGlobal)
router.put('/:id', validateBody(updateHolidaySchema), holidaysController.update)
router.delete('/:id', holidaysController.delete)

export default router
