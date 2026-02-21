import { Router } from 'express'
import { announcementsController } from '../controllers/announcements.controller.js'
import { authenticate, requireOrganization } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { createAnnouncementSchema, updateAnnouncementSchema } from '../utils/validators.js'

const router = Router()

router.use(authenticate)
router.use(requireOrganization)

router.get('/', announcementsController.getAll)
router.get('/recent', announcementsController.getRecent)
router.get('/:id', announcementsController.getById)
router.post('/', validateBody(createAnnouncementSchema), announcementsController.create)
router.put('/:id', validateBody(updateAnnouncementSchema), announcementsController.update)
router.put('/:id/toggle-pin', announcementsController.togglePin)
router.delete('/:id', announcementsController.delete)

export default router
