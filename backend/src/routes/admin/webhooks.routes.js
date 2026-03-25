import { Router } from 'express'
import { authenticateAdmin } from '../../middleware/adminAuth.js'
import { supabase } from '../../config/supabase.js'
import { successResponse, errorResponse } from '../../utils/response.js'

const router = Router()

router.use(authenticateAdmin)

// List webhook events
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, provider, eventType, sortOrder = 'desc' } = req.query
    const from = (parseInt(page) - 1) * parseInt(limit)

    let query = supabase
      .from('webhook_events')
      .select('*', { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (provider) query = query.eq('provider', provider)
    if (eventType) query = query.eq('event_type', eventType)

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

// Get single webhook event
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error || !data) return errorResponse(res, 'Webhook event not found', 404)
    return successResponse(res, data)
  } catch (error) {
    return errorResponse(res, error.message, 500)
  }
})

export default router
