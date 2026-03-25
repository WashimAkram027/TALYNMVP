import { supabase } from '../../config/supabase.js'
import { NotFoundError } from '../../utils/errors.js'
import { auditLogService } from './auditLog.service.js'

export const adminEorConfigService = {
  /**
   * List all EOR cost configs
   */
  async list() {
    const { data, error } = await supabase
      .from('eor_cost_config')
      .select('*')
      .order('country_name', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Get single config
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('eor_cost_config')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) throw new NotFoundError('EOR config not found')
    return data
  },

  /**
   * Create a new config
   */
  async create(configData, adminId, ip) {
    const { data, error } = await supabase
      .from('eor_cost_config')
      .insert({
        country_code: configData.countryCode,
        country_name: configData.countryName,
        currency: configData.currency || 'NPR',
        employer_ssf_rate: configData.employerSsfRate || 0,
        employee_ssf_rate: configData.employeeSsfRate || 0,
        platform_fee_amount: configData.platformFeeAmount || 0,
        platform_fee_currency: configData.platformFeeCurrency || 'USD',
        periods_per_year: configData.periodsPerYear || 12,
        is_active: configData.isActive !== false,
        effective_from: configData.effectiveFrom || null,
        effective_to: configData.effectiveTo || null
      })
      .select()
      .single()

    if (error) throw error

    await auditLogService.log(adminId, 'eor_config_created', 'eor_cost_config', data.id, { countryCode: configData.countryCode }, ip)
    return data
  },

  /**
   * Update a config
   */
  async update(id, configData, adminId, ip) {
    const updates = {}
    if (configData.countryCode !== undefined) updates.country_code = configData.countryCode
    if (configData.countryName !== undefined) updates.country_name = configData.countryName
    if (configData.currency !== undefined) updates.currency = configData.currency
    if (configData.employerSsfRate !== undefined) updates.employer_ssf_rate = configData.employerSsfRate
    if (configData.employeeSsfRate !== undefined) updates.employee_ssf_rate = configData.employeeSsfRate
    if (configData.platformFeeAmount !== undefined) updates.platform_fee_amount = configData.platformFeeAmount
    if (configData.platformFeeCurrency !== undefined) updates.platform_fee_currency = configData.platformFeeCurrency
    if (configData.periodsPerYear !== undefined) updates.periods_per_year = configData.periodsPerYear
    if (configData.isActive !== undefined) updates.is_active = configData.isActive
    if (configData.effectiveFrom !== undefined) updates.effective_from = configData.effectiveFrom
    if (configData.effectiveTo !== undefined) updates.effective_to = configData.effectiveTo

    const { data, error } = await supabase
      .from('eor_cost_config')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await auditLogService.log(adminId, 'eor_config_updated', 'eor_cost_config', id, updates, ip)
    return data
  },

  /**
   * Delete a config
   */
  async delete(id, adminId, ip) {
    const { error } = await supabase
      .from('eor_cost_config')
      .delete()
      .eq('id', id)

    if (error) throw error

    await auditLogService.log(adminId, 'eor_config_deleted', 'eor_cost_config', id, {}, ip)
    return { success: true }
  }
}
