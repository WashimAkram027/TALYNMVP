import { Router } from 'express'
import { authenticateAdmin } from '../../middleware/adminAuth.js'
import { supabase } from '../../config/supabase.js'
import { successResponse, errorResponse } from '../../utils/response.js'

const router = Router()

router.use(authenticateAdmin)

// List email logs
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, emailType, search, sortOrder = 'desc' } = req.query
    const from = (parseInt(page) - 1) * parseInt(limit)

    let query = supabase
      .from('email_logs')
      .select('*', { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (emailType) query = query.eq('email_type', emailType)
    if (search) query = query.ilike('recipient_email', `%${search}%`)

    query = query.order('created_at', { ascending: sortOrder === 'asc' })
      .range(from, from + parseInt(limit) - 1)

    const { data, error, count } = await query
    if (error) throw error

    return successResponse(res, {
      data: data || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit))
    })
  } catch (error) {
    return errorResponse(res, error.message, 500)
  }
})

export default router
