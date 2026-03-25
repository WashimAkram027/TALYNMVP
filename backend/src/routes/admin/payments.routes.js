import { Router } from 'express'
import { authenticateAdmin, requireAdminRole } from '../../middleware/adminAuth.js'
import { adminPaymentsService } from '../../services/admin/payments.service.js'
import { successResponse, errorResponse } from '../../utils/response.js'

const router = Router()

router.use(authenticateAdmin)

// ACH payment methods
router.get('/ach', async (req, res) => {
  try {
    const { page, limit, status } = req.query
    const result = await adminPaymentsService.listAchPayments({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status
    })
    return successResponse(res, result)
  } catch (error) {
    return errorResponse(res, error.message, 500)
  }
})

export default router
