import { supabase } from '../config/supabase.js'
import { BadRequestError } from '../utils/errors.js'

/**
 * Public Holiday Service
 * Manages gazetted Nepal holidays per organization.
 * Holidays are org-scoped, seeded annually from MOHA gazette,
 * and filtered by employee gender/region for §41 compliance.
 */
export const publicHolidayService = {
  /**
   * Get holidays applicable to a specific employee in a date range.
   * Filters by gender (women_only for female employees) and category.
   */
  async getHolidaysForEmployee(employeeId, startDate, endDate) {
    // Get employee details for filtering
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, gender')
      .eq('id', employeeId)
      .single()

    if (!member) return []

    const categories = ['national']
    if (member.gender === 'female') categories.push('women_only')

    const { data, error } = await supabase
      .from('public_holidays')
      .select('*')
      .eq('organization_id', member.organization_id)
      .in('holiday_category', categories)
      .eq('is_active', true)
      .gte('date_ad', startDate)
      .lte('date_ad', endDate)
      .order('date_ad', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Check if a specific date is a public holiday for an organization.
   * Optionally filter by employee (gender-specific holidays).
   */
  async isPublicHoliday(orgId, dateAd, employeeId = null) {
    let query = supabase
      .from('public_holidays')
      .select('id, name, holiday_category')
      .eq('organization_id', orgId)
      .eq('date_ad', dateAd)
      .eq('is_active', true)

    if (employeeId) {
      const { data: member } = await supabase
        .from('organization_members')
        .select('gender')
        .eq('id', employeeId)
        .single()

      const categories = ['national']
      if (member?.gender === 'female') categories.push('women_only')
      query = query.in('holiday_category', categories)
    }

    const { data } = await query
    return data && data.length > 0 ? data[0] : null
  },

  /**
   * Get public holiday dates as a Set for fast lookup in working-day calculations.
   */
  async getHolidayDatesSet(orgId, startDate, endDate, employeeGender = null) {
    const categories = ['national']
    if (employeeGender === 'female') categories.push('women_only')

    const { data } = await supabase
      .from('public_holidays')
      .select('date_ad')
      .eq('organization_id', orgId)
      .in('holiday_category', categories)
      .eq('is_active', true)
      .gte('date_ad', startDate)
      .lte('date_ad', endDate)

    return new Set((data || []).map(h => h.date_ad))
  },

  /**
   * Seed holidays for a fiscal year for a specific organization.
   * Uses upsert (ON CONFLICT DO NOTHING) for idempotency.
   */
  async seedFiscalYearHolidays(orgId, fiscalYear, holidays, source = 'moha_gazette') {
    const results = { inserted: 0, skipped: 0, errors: [] }

    for (const h of holidays) {
      const { error } = await supabase
        .from('public_holidays')
        .upsert({
          organization_id: orgId,
          date_ad: h.date_ad,
          bs_year: h.bs_year,
          bs_month: h.bs_month,
          bs_day: h.bs_day,
          name: h.name,
          name_ne: h.name_ne || null,
          holiday_category: h.holiday_category || 'national',
          applies_to_gender: h.applies_to_gender || null,
          applies_to_region: h.applies_to_region || null,
          applies_to_community: h.applies_to_community || null,
          fiscal_year: fiscalYear,
          source,
          is_active: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'organization_id,date_ad' })

      if (error) {
        results.errors.push({ date: h.date_ad, error: error.message })
      } else {
        results.inserted++
      }
    }

    return results
  },

  /**
   * Seed holidays for ALL active organizations at once.
   */
  async seedForAllOrgs(fiscalYear, holidays, source = 'moha_gazette') {
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')

    const summary = { orgsProcessed: 0, totalInserted: 0, errors: [] }

    for (const org of (orgs || [])) {
      const result = await this.seedFiscalYearHolidays(org.id, fiscalYear, holidays, source)
      summary.orgsProcessed++
      summary.totalInserted += result.inserted
      if (result.errors.length) summary.errors.push({ orgId: org.id, errors: result.errors })
    }

    return summary
  },

  /**
   * Add a single holiday (mid-year government declaration).
   */
  async addHoliday(orgId, holidayData) {
    const { data, error } = await supabase
      .from('public_holidays')
      .insert({
        organization_id: orgId,
        ...holidayData,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update an existing holiday.
   */
  async updateHoliday(holidayId, updates) {
    const allowed = ['name', 'name_ne', 'date_ad', 'holiday_category', 'applies_to_gender',
      'applies_to_region', 'notes', 'is_active']
    const filtered = {}
    for (const key of allowed) {
      if (updates[key] !== undefined) filtered[key] = updates[key]
    }
    filtered.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('public_holidays')
      .update(filtered)
      .eq('id', holidayId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Deactivate a holiday (soft delete — preserves payroll audit trail).
   */
  async deactivateHoliday(holidayId) {
    return this.updateHoliday(holidayId, { is_active: false })
  },

  /**
   * List holidays for an organization with filters.
   */
  async listHolidays(orgId, filters = {}) {
    let query = supabase
      .from('public_holidays')
      .select('*')
      .eq('organization_id', orgId)
      .order('date_ad', { ascending: true })

    if (filters.fiscalYear) query = query.eq('fiscal_year', filters.fiscalYear)
    if (filters.category) query = query.in('holiday_category', filters.category.split(','))
    if (filters.startDate) query = query.gte('date_ad', filters.startDate)
    if (filters.endDate) query = query.lte('date_ad', filters.endDate)
    if (filters.activeOnly !== false) query = query.eq('is_active', true)

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  /**
   * Check Labour Act §41 compliance.
   * Male employees: minimum 13 national holidays.
   * Female employees: minimum 14 (13 national + women_only).
   */
  async checkHolidayCompliance(orgId, fiscalYear) {
    const { data: national } = await supabase
      .from('public_holidays')
      .select('id')
      .eq('organization_id', orgId)
      .eq('fiscal_year', fiscalYear)
      .eq('is_active', true)
      .eq('holiday_category', 'national')

    const { data: womenOnly } = await supabase
      .from('public_holidays')
      .select('id')
      .eq('organization_id', orgId)
      .eq('fiscal_year', fiscalYear)
      .eq('is_active', true)
      .eq('holiday_category', 'women_only')

    const nationalCount = (national || []).length
    const womenCount = (womenOnly || []).length

    return {
      fiscalYear,
      nationalHolidays: nationalCount,
      womenOnlyHolidays: womenCount,
      totalForMale: nationalCount,
      totalForFemale: nationalCount + womenCount,
      maleCompliant: nationalCount >= 13,
      femaleCompliant: (nationalCount + womenCount) >= 14,
      message: nationalCount >= 13
        ? 'Compliant with Labour Act §41'
        : `Non-compliant: only ${nationalCount} national holidays seeded (minimum 13 required)`
    }
  }
}
