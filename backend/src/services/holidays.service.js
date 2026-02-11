import { supabase } from '../config/supabase.js'
import { BadRequestError, NotFoundError } from '../utils/errors.js'

export const holidaysService = {
  async getHolidays(orgId, year = new Date().getFullYear()) {
    let query = supabase
      .from('holidays')
      .select('*')
      .eq('year', year)
      .order('date', { ascending: true })

    if (orgId) {
      query = query.or(`organization_id.is.null,organization_id.eq.${orgId}`)
    } else {
      query = query.is('organization_id', null)
    }

    const { data, error } = await query
    if (error) throw new BadRequestError(error.message)
    return data
  },

  async getUpcomingHolidays(orgId, limit = 6) {
    const today = new Date().toISOString().split('T')[0]

    let query = supabase
      .from('holidays')
      .select('*')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(limit)

    if (orgId) {
      query = query.or(`organization_id.is.null,organization_id.eq.${orgId}`)
    } else {
      query = query.is('organization_id', null)
    }

    const { data, error } = await query
    if (error) throw new BadRequestError(error.message)
    return data
  },

  async createHoliday(orgId, holiday) {
    const { data, error } = await supabase
      .from('holidays')
      .insert({ ...holiday, organization_id: orgId })
      .select()
      .single()

    if (error) throw new BadRequestError(error.message)
    return data
  },

  async updateHoliday(holidayId, orgId, updates) {
    const { data, error } = await supabase
      .from('holidays')
      .update(updates)
      .eq('id', holidayId)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundError('Holiday not found')
      throw new BadRequestError(error.message)
    }
    return data
  },

  async deleteHoliday(holidayId, orgId) {
    const { error } = await supabase
      .from('holidays')
      .delete()
      .eq('id', holidayId)
      .eq('organization_id', orgId)

    if (error) throw new BadRequestError(error.message)
    return { success: true }
  },

  async copyGlobalHolidays(orgId, year = new Date().getFullYear()) {
    const { data: globalHolidays, error: fetchError } = await supabase
      .from('holidays')
      .select('name, date, is_paid, country')
      .is('organization_id', null)
      .eq('year', year)

    if (fetchError) throw new BadRequestError(fetchError.message)

    const orgHolidays = globalHolidays.map(h => ({
      ...h,
      organization_id: orgId
    }))

    const { data, error } = await supabase
      .from('holidays')
      .insert(orgHolidays)
      .select()

    if (error) throw new BadRequestError(error.message)
    return data
  }
}
