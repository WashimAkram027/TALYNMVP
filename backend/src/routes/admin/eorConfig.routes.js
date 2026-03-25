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
    return errorResponse(res, error.message, 500)
  }
})

// Get single
router.get('/:id', async (req, res) => {
  try {
    const data = await adminEorConfigService.getById(req.params.id)
    return successResponse(res, data)
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500)
  }
})

// Create
router.post('/', requireAdminRole('super_admin', 'finance_admin'), async (req, res) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for']
    const data = await adminEorConfigService.create(req.body, req.admin.id, ip)
    return successResponse(res, data, 'EOR config created', 201)
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500)
  }
})

// Update
router.put('/:id', requireAdminRole('super_admin', 'finance_admin'), async (req, res) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for']
    const data = await adminEorConfigService.update(req.params.id, req.body, req.admin.id, ip)
    return successResponse(res, data, 'EOR config updated')
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500)
  }
})

// Delete
router.delete('/:id', requireAdminRole('super_admin'), async (req, res) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for']
    await adminEorConfigService.delete(req.params.id, req.admin.id, ip)
    return successResponse(res, null, 'EOR config deleted')
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500)
  }
})

export default router
