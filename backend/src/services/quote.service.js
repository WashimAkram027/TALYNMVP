import { supabase } from '../config/supabase.js'
import { anvilClient } from '../config/anvil.js'
import { buildQuoteHtml } from './pdfTemplate.service.js'
import { BadRequestError, NotFoundError } from '../utils/errors.js'

export const quoteService = {
  /**
   * Delete (cancel) a draft quote. Only draft quotes can be deleted.
   */
  async deleteQuote(quoteId, orgId) {
    const { data: quote, error: findError } = await supabase
      .from('eor_quotes')
      .select('id, status')
      .eq('id', quoteId)
      .eq('organization_id', orgId)
      .single()

    if (findError || !quote) {
      throw new NotFoundError('Quote not found')
    }

    if (quote.status !== 'draft') {
      throw new BadRequestError(`Only draft quotes can be deleted (current status: ${quote.status})`)
    }

    const { error: deleteError } = await supabase
      .from('eor_quotes')
      .delete()
      .eq('id', quoteId)

    if (deleteError) throw deleteError
    return { success: true }
  },

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
   * Fetches all quotes for the org/year and finds the highest numeric suffix,
   * skipping any non-numeric suffixes (e.g. TQ-2026-T01 from test data).
   */
  async generateQuoteNumber(orgId) {
    const year = new Date().getFullYear()
    const prefix = `TQ-${year}-`

    const { data, error } = await supabase
      .from('eor_quotes')
      .select('quote_number')
      .eq('organization_id', orgId)
      .like('quote_number', `${prefix}%`)

    if (error) throw error

    let maxSeq = 0
    if (data && data.length > 0) {
      for (const row of data) {
        const suffix = row.quote_number.replace(prefix, '')
        const num = parseInt(suffix, 10)
        if (!isNaN(num) && num > maxSeq) maxSeq = num
      }
    }

    return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`
  },

  /**
   * Generate a cost quote for an employee
   * All monetary amounts stored in minor units (paisa for NPR, cents for USD)
   */
  async generateQuote(userId, orgId, employeeData) {
    const config = await this.getCostConfig(employeeData.countryCode || 'NPL')

    const annualSalary = employeeData.salaryAmount
    if (!annualSalary || annualSalary <= 0) {
      throw new BadRequestError('Annual salary is required and must be positive')
    }

    const periodsPerYear = config.periods_per_year
    const basicSalaryRatio = parseFloat(config.basic_salary_ratio ?? 0.6)
    if (!isFinite(basicSalaryRatio) || basicSalaryRatio < 0 || basicSalaryRatio > 1) {
      throw new BadRequestError('Invalid basic_salary_ratio in config')
    }
    const employerSsfRate = parseFloat(config.employer_ssf_rate)
    const employeeSsfRate = parseFloat(config.employee_ssf_rate)

    // MONTHLY (all in paisa = NPR x 100)
    const monthlyGross = Math.round((annualSalary / periodsPerYear) * 100)
    const basicSalaryAmount = Math.round(monthlyGross * basicSalaryRatio)
    const employerSsfAmount = Math.round(basicSalaryAmount * employerSsfRate)
    const employeeSsfAmount = Math.round(basicSalaryAmount * employeeSsfRate)
    const severanceAmount = Math.round(basicSalaryAmount / periodsPerYear)
    const estimatedNetSalary = monthlyGross - employeeSsfAmount
    const totalMonthlyCostLocal = monthlyGross + employerSsfAmount + severanceAmount

    // ANNUAL (computed from annual figures to avoid rounding drift)
    const annualSalaryMinor = Math.round(annualSalary * 100)
    const annualBasicSalary = Math.round(annualSalaryMinor * basicSalaryRatio)
    const annualEmployerSsf = Math.round(annualBasicSalary * employerSsfRate)
    const annualSeverance = Math.round(annualBasicSalary / periodsPerYear) * periodsPerYear
    const annualCostLocal = annualSalaryMinor + annualEmployerSsf + annualSeverance
    const thirteenthMonthAmount = config.thirteenth_month_included !== false ? monthlyGross : 0
    const totalAnnualCostLocal = annualCostLocal + thirteenthMonthAmount

    // USD conversions (when exchange rate is set)
    const exchangeRate = config.exchange_rate ? parseFloat(config.exchange_rate) : null
    let monthlyGrossUsdCents = null
    let monthlyCostUsdCents = null
    let totalAnnualCostUsdCents = null
    if (exchangeRate && isFinite(exchangeRate) && exchangeRate >= 0.001 && exchangeRate <= 0.05) {
      monthlyGrossUsdCents = Math.round((monthlyGross / 100) * exchangeRate * 100)
      monthlyCostUsdCents = Math.round((totalMonthlyCostLocal / 100) * exchangeRate * 100) + config.platform_fee_amount
      const docFee = config.document_handling_fee ?? 8000
      totalAnnualCostUsdCents = Math.round((totalAnnualCostLocal / 100) * exchangeRate * 100)
        + (config.platform_fee_amount * periodsPerYear) + docFee
    }

    // Quote valid for 30 days
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + 30)

    // Retry loop to handle duplicate quote number race conditions
    const maxRetries = 3
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const quoteNumber = await this.generateQuoteNumber(orgId)

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

        annual_salary: annualSalaryMinor,
        salary_currency: employeeData.salaryCurrency || 'NPR',
        pay_frequency: employeeData.payFrequency || 'monthly',
        periods_per_year: periodsPerYear,
        monthly_gross_salary: monthlyGross,

        basic_salary_ratio: basicSalaryRatio,
        basic_salary_amount: basicSalaryAmount,
        employer_ssf_rate: config.employer_ssf_rate,
        employer_ssf_amount: employerSsfAmount,
        employee_ssf_rate: config.employee_ssf_rate,
        employee_ssf_amount: employeeSsfAmount,
        severance_amount: severanceAmount,
        estimated_net_salary: estimatedNetSalary,
        platform_fee_amount: config.platform_fee_amount,
        platform_fee_currency: config.platform_fee_currency,
        total_monthly_cost_local: totalMonthlyCostLocal,
        total_annual_cost_local: totalAnnualCostLocal,

        exchange_rate: exchangeRate,
        monthly_gross_usd_cents: monthlyGrossUsdCents,
        monthly_cost_usd_cents: monthlyCostUsdCents,
        total_annual_cost_usd_cents: totalAnnualCostUsdCents,
        thirteenth_month_amount: thirteenthMonthAmount,
        document_handling_fee: config.document_handling_fee ?? 8000,
        document_handling_fee_currency: config.document_handling_fee_currency || 'USD',

        config_snapshot: {
          country_code: config.country_code,
          country_name: config.country_name,
          basic_salary_ratio: basicSalaryRatio,
          employer_ssf_rate: config.employer_ssf_rate,
          employee_ssf_rate: config.employee_ssf_rate,
          platform_fee_amount: config.platform_fee_amount,
          platform_fee_currency: config.platform_fee_currency,
          document_handling_fee: config.document_handling_fee,
          document_handling_fee_currency: config.document_handling_fee_currency,
          thirteenth_month_included: config.thirteenth_month_included,
          exchange_rate: exchangeRate,
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

      if (!error) return data

      // Retry on duplicate key (23505), otherwise throw immediately
      if (error.code !== '23505' || attempt === maxRetries - 1) {
        throw error
      }
      console.warn(`[QuoteService] Quote number ${quoteNumber} conflict, retrying (attempt ${attempt + 1})`)
    }
  },

  /**
   * Accept a quote — validates it's draft and not expired.
   * @param {string} quoteId
   * @param {string} userId
   * @param {Object} [options]
   * @param {string} [options.termsAcceptedAt] - ISO timestamp of terms acceptance
   */
  async acceptQuote(quoteId, userId, options = {}) {
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

    const updateData = {
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_by: userId,
      updated_at: new Date().toISOString()
    }

    if (options.termsAcceptedAt) {
      updateData.terms_accepted_at = options.termsAcceptedAt
    }

    const { data, error } = await supabase
      .from('eor_quotes')
      .update(updateData)
      .eq('id', quoteId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Reissue a quote for a member.
   *
   * If `newQuoteId` is provided the caller has already generated a quote via
   * the normal generateQuote flow (e.g. from the InviteMemberModal form).
   * In that case we accept the supplied quote, update the member record with
   * the new quote's data, and delete the old quote.
   *
   * If `newQuoteId` is NOT provided the legacy behaviour is used: a new quote
   * is generated from the member's current data, auto-accepted, and linked.
   *
   * @param {string} memberId
   * @param {string} orgId
   * @param {string} userId
   * @param {string} [newQuoteId] - Optional pre-generated quote ID
   */
  async reissueQuote(memberId, orgId, userId, newQuoteId = null) {
    // 1. Fetch the member record
    const { data: member, error: memberErr } = await supabase
      .from('organization_members')
      .select('*')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .single()

    if (memberErr || !member) {
      throw new NotFoundError('Member not found')
    }

    const oldQuoteId = member.quote_id

    let acceptedQuote

    if (newQuoteId) {
      // --- Path A: caller supplied a pre-generated quote ---

      // Accept the new quote
      acceptedQuote = await this.acceptQuote(newQuoteId, userId)

      // Build member update from the new quote data
      // annual_salary is stored in minor units (paisa); member.salary_amount is
      // in major units, so convert back.
      const memberUpdate = {
        quote_id: newQuoteId,
        quote_dispute_note: null,
        quote_verified: false
      }

      if (acceptedQuote.annual_salary != null) {
        memberUpdate.salary_amount = acceptedQuote.annual_salary / 100
      }
      if (acceptedQuote.salary_currency) {
        memberUpdate.salary_currency = acceptedQuote.salary_currency
      }
      if (acceptedQuote.job_title !== undefined) {
        memberUpdate.job_title = acceptedQuote.job_title
      }
      if (acceptedQuote.department !== undefined) {
        memberUpdate.department = acceptedQuote.department
      }
      if (acceptedQuote.employment_type !== undefined) {
        memberUpdate.employment_type = acceptedQuote.employment_type
      }
      if (acceptedQuote.start_date !== undefined) {
        memberUpdate.start_date = acceptedQuote.start_date
      }

      const { error: updateErr } = await supabase
        .from('organization_members')
        .update(memberUpdate)
        .eq('id', memberId)
        .eq('organization_id', orgId)

      if (updateErr) throw updateErr
    } else {
      // --- Path B: legacy — generate a new quote from member data ---

      const newQuote = await this.generateQuote(userId, orgId, {
        salaryAmount: member.salary_amount,
        salaryCurrency: member.salary_currency || 'NPR',
        jobTitle: member.job_title,
        department: member.department,
        employmentType: member.employment_type,
        startDate: member.start_date,
        firstName: member.first_name,
        lastName: member.last_name,
        email: member.invitation_email,
        countryCode: 'NPL'
      })

      acceptedQuote = await this.acceptQuote(newQuote.id, userId)

      const { error: updateErr } = await supabase
        .from('organization_members')
        .update({
          quote_id: newQuote.id,
          quote_dispute_note: null,
          quote_verified: false
        })
        .eq('id', memberId)
        .eq('organization_id', orgId)

      if (updateErr) throw updateErr
    }

    // Delete the old quote if one existed
    if (oldQuoteId && oldQuoteId !== (newQuoteId || acceptedQuote.id)) {
      const { error: deleteErr } = await supabase
        .from('eor_quotes')
        .delete()
        .eq('id', oldQuoteId)

      if (deleteErr) {
        console.error('[QuoteService] Failed to delete old quote:', deleteErr)
        // Non-fatal — the new quote was already created
      }
    }

    // Return the newly accepted quote
    return await this.getQuoteById(acceptedQuote.id, orgId)
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

    // Store the storage path (not a public URL) for security — PDFs are served through authenticated endpoints
    await supabase
      .from('eor_quotes')
      .update({ pdf_url: storagePath, updated_at: new Date().toISOString() })
      .eq('id', quoteId)

    return { pdfBuffer: pdfData, pdfUrl: storagePath, quoteNumber: quote.quote_number }
  }
}
