import { supabase } from '../../config/supabase.js'

export const adminPaymentsService = {
  /**
   * List ACH payment methods with PaymentIntent tracking
   */
  async listAchPayments({ page = 1, limit = 20, status }) {
    const from = (page - 1) * limit

    let query = supabase
      .from('payment_methods')
      .select('*, organization:organizations!payment_methods_organization_id_fkey(id, name, email)', { count: 'exact' })

    if (status) query = query.eq('status', status)

    query = query.order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }
  }
}
