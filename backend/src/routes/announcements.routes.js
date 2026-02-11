import { Router } from 'express'
import { announcementsController } from '../controllers/announcements.controller.js'
import { authenticate, requireOrganization } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)
router.use(requireOrganization)

router.get('/', announcementsController.getAll)
router.get('/recent', announcementsController.getRecent)
router.get('/:id', announcementsController.getById)
router.post('/', announcementsController.create)
router.put('/:id', announcementsController.update)
router.put('/:id/toggle-pin', announcementsController.togglePin)
router.delete('/:id', announcementsController.delete)

export default router
