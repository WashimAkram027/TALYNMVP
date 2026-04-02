import { Router } from 'express'
import { notificationsController } from '../controllers/notifications.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/', notificationsController.list)
router.get('/unread-count', notificationsController.getUnreadCount)
router.patch('/:id/read', notificationsController.markRead)
router.patch('/:id/dismiss', notificationsController.dismiss)
router.patch('/read-all', notificationsController.markAllRead)

export default router
