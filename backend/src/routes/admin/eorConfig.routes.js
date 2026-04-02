import { Router } from 'express'
import { authenticateAdmin, requireAdminRole } from '../../middleware/adminAuth.js'
import { adminEorConfigService } from '../../services/admin/eorConfig.service.js'
import { successResponse, errorResponse } from '../../utils/response.js'

const router = Router()

router.use(authenticateAdmin)

// List all
router.get('/', async (req, res) => {
  try {
    const data = await adminEorConfigService.list()
    return successResponse(res, data)
  } catch (error) {
    if (!error.isOperational) console.error('[EorConfig] List error:', error)
    return errorResponse(res, error.isOperational ? error.message : 'Failed to list EOR configs', 500)
  }
})

// Get single
router.get('/:id', async (req, res) => {
  try {
    const data = await adminEorConfigService.getById(req.params.id)
    return successResponse(res, data)
  } catch (error) {
    const status = error.statusCode || 500
    const message = error.isOperational ? error.message : 'Failed to retrieve EOR config'
    if (status === 500) console.error('[EorConfig] Get error:', error)
    return errorResponse(res, message, status)
  }
})

// Create
router.post('/', requireAdminRole('super_admin', 'finance_admin'), async (req, res) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for']
    const data = await adminEorConfigService.create(req.body, req.admin.id, ip)
    return successResponse(res, data, 'EOR config created', 201)
  } catch (error) {
    const status = error.statusCode || (error.name === 'BadRequestError' ? 400 : 500)
    const message = error.isOperational ? error.message : 'Failed to create EOR config'
    if (status === 500) console.error('[EorConfig] Create error:', error)
    return errorResponse(res, message, status)
  }
})

// Update
router.put('/:id', requireAdminRole('super_admin', 'finance_admin'), async (req, res) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for']
    const data = await adminEorConfigService.update(req.params.id, req.body, req.admin.id, ip)
    return successResponse(res, data, 'EOR config updated')
  } catch (error) {
    const status = error.statusCode || (error.name === 'BadRequestError' ? 400 : 500)
    const message = error.isOperational ? error.message : 'Failed to update EOR config'
    if (status === 500) console.error('[EorConfig] Update error:', error)
    return errorResponse(res, message, status)
  }
})

// Delete
router.delete('/:id', requireAdminRole('super_admin'), async (req, res) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for']
    await adminEorConfigService.delete(req.params.id, req.admin.id, ip)
    return successResponse(res, null, 'EOR config deleted')
  } catch (error) {
    const status = error.statusCode || 500
    const message = error.isOperational ? error.message : 'Failed to delete EOR config'
    if (status === 500) console.error('[EorConfig] Delete error:', error)
    return errorResponse(res, message, status)
  }
})

export default router
