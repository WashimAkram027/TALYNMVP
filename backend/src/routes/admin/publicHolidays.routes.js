import { Router } from 'express'
import { adminPublicHolidayController } from '../../controllers/admin/publicHoliday.controller.js'

const router = Router()

// All routes require admin auth (applied at admin router level)

router.get('/', adminPublicHolidayController.listHolidays)
router.post('/seed', adminPublicHolidayController.seedHolidays)
router.post('/', adminPublicHolidayController.addHoliday)
router.patch('/:id', adminPublicHolidayController.updateHoliday)
router.patch('/:id/deactivate', adminPublicHolidayController.deactivateHoliday)
router.get('/compliance/:orgId', adminPublicHolidayController.checkCompliance)

export default router
