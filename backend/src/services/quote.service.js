import { supabase } from '../config/supabase.js'
import { anvilClient } from '../config/anvil.js'
import { buildQuoteHtml } from './pdfTemplate.service.js'
import { BadRequestError, NotFoundError } from '../utils/errors.js'

export const quoteService = {
  /**
   * Get active cost config for a country
   */
  async getCostConfig(countryCode = 'NPL') {
    const { data, error } = await supabase
      .from('eor_cost_config')
      .select('*')
      .eq('country_code', countryCode)
      .eq('is_active', true)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      throw new NotFoundError(`No active cost config found for country: ${countryCode}`)
    }

    return data
  },

  /**
   * Generate sequential quote number: TQ-YYYY-NNN
   */
  async generateQuoteNumber(orgId) {
    const year = new Date().getFullYear()
    const prefix = `TQ-${year}-`

    const { data, error } = await supabase
      .from('eor_quotes')
      .select('quote_number')
      .eq('organization_id', orgId)
      .like('quote_number', `${prefix}%`)
      .order('quote_number', { ascending: false })
      .limit(1)

    if (error) throw error

    let seq = 1
    if (data && data.length > 0) {
      const lastNum = parseInt(data[0].quote_number.replace(prefix, ''), 10)
      if (!isNaN(lastNum)) seq = lastNum + 1
    }

    return `${prefix}${String(seq).padStart(3, '0')}`
  },

  /**
   * Generate a cost quote for an employee
   * All monetary amounts stored in minor units (paisa for NPR, cents for USD)
   */
  async generateQuote(userId, orgId, employeeData) {
    const config = await this.getCostConfig(employeeData.countryCode || 'NPL')
    const quoteNumber = await this.generateQuoteNumber(orgId)

    const annualSalary = employeeData.salaryAmount
    if (!annualSalary || annualSalary <= 0) {
      throw new BadRequestError('Annual salary is required and must be positive')
    }

    const periodsPerYear = config.periods_per_year
    // Monthly gross in minor units (paisa)
    const monthlyGross = Math.round((annualSalary / periodsPerYear) * 100)

    // SSF calculations on monthly gross (already in minor units)
    const employerSsfAmount = Math.round(monthlyGross * parseFloat(config.employer_ssf_rate))
    const employeeSsfAmount = Math.round(monthlyGross * parseFloat(config.employee_ssf_rate))
    const estimatedNetSalary = monthlyGross - employeeSsfAmount

    // Total monthly cost to employer in local currency (salary + employer SSF)
    const totalMonthlyCostLocal = monthlyGross + employerSsfAmount
    const totalAnnualCostLocal = totalMonthlyCostLocal * periodsPerYear

    // Quote valid for 30 days
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + 30)

    const quoteData = {
      organization_id: orgId,
      quote_number: quoteNumber,
      status: 'draft',

      employee_email: employeeData.email,
      employee_first_name: employeeData.firstName || null,
      employee_last_name: employeeData.lastName || null,
      job_title: employeeData.jobTitle || null,
      department: employeeData.department || null,
      employment_type: employeeData.employmentType || 'full_time',
      start_date: employeeData.startDate || null,

      annual_salary: Math.round(annualSalary * 100), // store in minor units
      salary_currency: employeeData.salaryCurrency || 'NPR',
      pay_frequency: employeeData.payFrequency || 'monthly',
      periods_per_year: periodsPerYear,
      monthly_gross_salary: monthlyGross,

      employer_ssf_rate: config.employer_ssf_rate,
      employer_ssf_amount: employerSsfAmount,
      employee_ssf_rate: config.employee_ssf_rate,
      employee_ssf_amount: employeeSsfAmount,
      estimated_net_salary: estimatedNetSalary,
      platform_fee_amount: config.platform_fee_amount,
      platform_fee_currency: config.platform_fee_currency,
      total_monthly_cost_local: totalMonthlyCostLocal,
      total_annual_cost_local: totalAnnualCostLocal,

      config_snapshot: {
        country_code: config.country_code,
        country_name: config.country_name,
        employer_ssf_rate: config.employer_ssf_rate,
        employee_ssf_rate: config.employee_ssf_rate,
        platform_fee_amount: config.platform_fee_amount,
        platform_fee_currency: config.platform_fee_currency,
        effective_from: config.effective_from
      },
      country_code: config.country_code,

      valid_until: validUntil.toISOString(),
      generated_by: userId
    }

    const { data, error } = await supabase
      .from('eor_quotes')
      .insert(quoteData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Accept a quote — validates it's draft and not expired
   */
  async acceptQuote(quoteId, userId) {
    const { data: quote, error: fetchError } = await supabase
      .from('eor_quotes')
      .select('*')
      .eq('id', quoteId)
      .single()

    if (fetchError || !quote) {
      throw new NotFoundError('Quote not found')
    }

    if (quote.status !== 'draft') {
      throw new BadRequestError(`Quote cannot be accepted — current status: ${quote.status}`)
    }

    if (new Date(quote.valid_until) < new Date()) {
      // Mark as expired
      await supabase
        .from('eor_quotes')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', quoteId)

      throw new BadRequestError('Quote has expired. Please generate a new quote.')
    }

    const { data, error } = await supabase
      .from('eor_quotes')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Get a single quote by ID (org-scoped)
   */
  async getQuoteById(quoteId, orgId) {
    const { data, error } = await supabase
      .from('eor_quotes')
      .select('*')
      .eq('id', quoteId)
      .eq('organization_id', orgId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundError('Quote not found')
      throw error
    }

    return data
  },

  /**
   * List quotes for an organization with optional status filter
   */
  async getQuotesByOrg(orgId, filters = {}) {
    let query = supabase
      .from('eor_quotes')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  /**
   * Generate a PDF for a quote using Anvil
   * Returns { pdfBuffer, pdfUrl } — buffer for immediate download, url for future access
   * Caches the PDF in Supabase Storage and stores the URL on the quote record
   */
  async generateQuotePdf(quoteId, orgId) {
    if (!anvilClient) {
      throw new BadRequestError('PDF generation is not configured. Set ANVIL_API_KEY in environment.')
    }

    // Fetch quote
    const quote = await this.getQuoteById(quoteId, orgId)

    // If PDF already generated, fetch from storage
    if (quote.pdf_url) {
      const storagePath = `quotes/${orgId}/${quote.quote_number}.pdf`
      const { data, error } = await supabase.storage
        .from('documents')
        .download(storagePath)

      if (!error && data) {
        const buffer = Buffer.from(await data.arrayBuffer())
        return { pdfBuffer: buffer, pdfUrl: quote.pdf_url, quoteNumber: quote.quote_number }
      }
      // If download failed, regenerate below
    }

    // Fetch organization and generating user for the template
    const [orgResult, userResult] = await Promise.all([
      supabase.from('organizations').select('*').eq('id', orgId).single(),
      supabase.from('profiles').select('full_name, email').eq('id', quote.generated_by).single()
    ])

    const organization = orgResult.data
    const generatedByUser = userResult.data

    // Build HTML/CSS template
    const { html, css } = buildQuoteHtml(quote, organization, generatedByUser)

    // Generate PDF via Anvil
    const { statusCode, data: pdfData } = await anvilClient.generatePDF({
      title: `EOR Quote ${quote.quote_number}`,
      type: 'html',
      data: { html, css }
    })

    if (statusCode !== 200 || !pdfData) {
      throw new BadRequestError(`PDF generation failed with status: ${statusCode}`)
    }

    // Upload to Supabase Storage
    const storagePath = `quotes/${orgId}/${quote.quote_number}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, pdfData, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) {
      console.error('[QuoteService] PDF upload error:', uploadError)
      // Still return the buffer even if storage fails
      return { pdfBuffer: pdfData, pdfUrl: null }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath)

    // Update quote record with PDF URL
    await supabase
      .from('eor_quotes')
      .update({ pdf_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', quoteId)

    return { pdfBuffer: pdfData, pdfUrl: publicUrl, quoteNumber: quote.quote_number }
  }
}
