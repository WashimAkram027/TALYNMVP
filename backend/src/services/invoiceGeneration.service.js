import { supabase } from '../config/supabase.js'
import { anvilClient } from '../config/anvil.js'
import { quoteService } from './quote.service.js'
import { invoicesService } from './invoices.service.js'
import { leaveReconciliationService } from './leaveReconciliation.service.js'
import { buildInvoiceHtml, buildReceiptHtml } from './pdfTemplate.service.js'
import { BadRequestError, NotFoundError } from '../utils/errors.js'

export const invoiceGenerationService = {
  /**
   * Main entry point — called by cron on the 26th of each month.
   * Generates billing invoices for all eligible organizations.
   */
  async generateMonthlyInvoices() {
    // Billing period = current month (1st to last day)
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() // 0-indexed
    const periodStart = new Date(year, month, 1).toISOString().split('T')[0]
    const periodEnd = new Date(year, month + 1, 0).toISOString().split('T')[0] // last day of month

    // Find orgs with stripe_customer_id set and at least 1 active member
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, billing_email, email, payment_type, settings')
      .not('stripe_customer_id', 'is', null)

    if (orgError) throw orgError

    const summary = { generated: 0, skipped: 0, errors: [] }

    for (const org of orgs || []) {
      try {
        // Check if org has active members
        const { count, error: countError } = await supabase
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .eq('status', 'active')
          .neq('member_role', 'owner')

        if (countError) throw countError
        if (!count || count === 0) {
          summary.skipped++
          continue
        }

        const invoice = await this.generateInvoiceForOrg(org.id, periodStart, periodEnd)
        if (invoice) {
          summary.generated++
        } else {
          summary.skipped++ // already exists (idempotency)
        }
      } catch (err) {
        console.error(`[InvoiceGeneration] Error for org ${org.id}:`, err.message)
        summary.errors.push({ orgId: org.id, orgName: org.name, error: err.message })
      }
    }

    return summary
  },

  /**
   * Generate a billing invoice for a single organization.
   * Returns null if invoice already exists for this period (idempotent).
   */
  async generateInvoiceForOrg(orgId, periodStart, periodEnd) {
    // Idempotency: check if billing invoice already exists for this period
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('organization_id', orgId)
      .eq('billing_period_start', periodStart)
      .eq('type', 'billing')
      .limit(1)

    if (existing && existing.length > 0) {
      return null // already generated
    }

    // Fetch active members with profile data
    const { data: members, error: membersError } = await supabase
      .from('organization_members')
      .select(`
        id, first_name, last_name, invitation_email, job_title, department, salary_amount, salary_currency, employment_type, start_date,
        profile:profiles!organization_members_profile_id_fkey(full_name, email)
      `)
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .neq('member_role', 'owner')

    if (membersError) throw membersError
    if (!members || members.length === 0) {
      return null // no active employees
    }

    // Fetch EOR cost config for Nepal
    const config = await quoteService.getCostConfig('NPL')

    if (!config.exchange_rate) {
      throw new BadRequestError('Exchange rate not set in EOR config. Admin must set exchange_rate before generating invoices.')
    }

    // Fetch organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()

    if (orgError || !org) throw new NotFoundError('Organization not found')

    const exchangeRate = parseFloat(config.exchange_rate)
    const employerSsfRate = parseFloat(config.employer_ssf_rate)
    const employeeSsfRate = parseFloat(config.employee_ssf_rate)
    const platformFeePerEmployee = config.platform_fee_amount // in USD cents (59900 = $599)
    const periodsPerYear = config.periods_per_year

    // Build line items for each active employee (with day-count adjustment)
    const lineItems = await Promise.all(members.map(async (member) => {
      const annualSalary = member.salary_amount || 0
      // Full monthly gross in local currency minor units (paisa)
      const fullMonthlyGrossLocal = Math.round((annualSalary / periodsPerYear) * 100)

      // Calculate payable days (deducting unpaid leave)
      let dayCount = null
      let monthlyGrossLocal = fullMonthlyGrossLocal
      try {
        const { payrollDayCountService } = await import('./payrollDayCount.service.js')
        dayCount = await payrollDayCountService.calculatePayableDays(member.id, periodStart, periodEnd)

        if (dayCount.deductionDays > 0 && dayCount.calendarDays > 0) {
          // Prorate: daily rate × payable days
          const dailyRate = Math.round(fullMonthlyGrossLocal / dayCount.calendarDays)
          monthlyGrossLocal = dailyRate * dayCount.payableDays
        }
      } catch {
        // If day-count service fails, fall back to full month billing
        dayCount = null
      }

      const employerSsfLocal = Math.round(monthlyGrossLocal * employerSsfRate)
      const employeeSsfLocal = Math.round(monthlyGrossLocal * employeeSsfRate)
      const totalCostLocal = monthlyGrossLocal + employerSsfLocal

      // Convert local cost to USD cents
      const costUsdCents = Math.round(totalCostLocal * exchangeRate)

      return {
        member_id: member.id,
        member_name: member.profile?.full_name
          || `${member.first_name || ''} ${member.last_name || ''}`.trim()
          || member.invitation_email
          || 'Unknown',
        member_email: member.profile?.email || member.invitation_email || null,
        job_title: member.job_title || null,
        department: member.department || null,
        employment_type: member.employment_type || 'full_time',
        salary_currency: member.salary_currency || 'NPR',
        annual_salary: annualSalary,
        full_monthly_gross_local: fullMonthlyGrossLocal,
        monthly_gross_local: monthlyGrossLocal,
        employer_ssf_local: employerSsfLocal,
        employee_ssf_local: employeeSsfLocal,
        total_cost_local: totalCostLocal,
        cost_usd_cents: costUsdCents,
        platform_fee_cents: platformFeePerEmployee,
        // Day-count breakdown (for payslip/invoice detail)
        payable_days: dayCount?.payableDays ?? null,
        calendar_days: dayCount?.calendarDays ?? null,
        deduction_days: dayCount?.deductionDays ?? 0,
        paid_leave_days: dayCount?.paidLeaveDays ?? 0,
        unpaid_leave_days: dayCount?.unpaidLeaveDays ?? 0
      }
    }))

    // Calculate totals
    const subtotalLocalCents = lineItems.reduce((sum, item) => sum + item.total_cost_local, 0)
    const subtotalUsdCents = lineItems.reduce((sum, item) => sum + item.cost_usd_cents, 0)
    const totalPlatformFeeCents = platformFeePerEmployee * members.length
    const totalAmountCents = subtotalUsdCents + totalPlatformFeeCents

    // Generate invoice number
    const invoiceNumber = await invoicesService.generateInvoiceNumber(orgId)

    // Calculate due date = 1st of next month
    const periodStartDate = new Date(periodStart)
    const dueDate = new Date(periodStartDate.getFullYear(), periodStartDate.getMonth() + 1, 1)
      .toISOString().split('T')[0]

    // Config snapshot for historical reference
    const configSnapshot = {
      country_code: config.country_code,
      country_name: config.country_name,
      employer_ssf_rate: config.employer_ssf_rate,
      employee_ssf_rate: config.employee_ssf_rate,
      platform_fee_amount: config.platform_fee_amount,
      platform_fee_currency: config.platform_fee_currency,
      exchange_rate: config.exchange_rate,
      periods_per_year: config.periods_per_year,
      effective_from: config.effective_from
    }

    // Insert billing invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        organization_id: orgId,
        invoice_number: invoiceNumber,
        type: 'billing',
        status: 'pending',
        currency: 'USD',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: dueDate,
        billing_period_start: periodStart,
        billing_period_end: periodEnd,
        amount: totalAmountCents / 100, // populates legacy 'amount' field; total_amount is auto-generated
        subtotal_local_cents: subtotalLocalCents,
        platform_fee_cents: totalPlatformFeeCents,
        total_amount_cents: totalAmountCents,
        exchange_rate: exchangeRate,
        payment_type: org.payment_type,
        employee_count: members.length,
        line_items: lineItems,
        config_snapshot: configSnapshot,
        client_name: org.name,
        client_email: org.billing_email || org.email
      })
      .select()
      .single()

    if (invoiceError) throw invoiceError

    // Apply pending leave reconciliation credits from previous month
    try {
      const credits = await leaveReconciliationService.applyPendingCredits(orgId, invoice.id)
      if (credits.totalCreditCents > 0) {
        // Reduce the invoice total by the credit amount
        const adjustedTotal = Math.max(totalAmountCents - credits.totalCreditCents, 0)
        await supabase
          .from('invoices')
          .update({
            total_amount_cents: adjustedTotal,
            amount: adjustedTotal / 100,
            updated_at: new Date().toISOString()
          })
          .eq('id', invoice.id)

        console.log(`[InvoiceGeneration] Applied ${credits.adjustmentItems.length} leave adjustment credit(s) totaling $${(credits.totalCreditCents / 100).toFixed(2)} to invoice ${invoice.id}`)
      }
    } catch (creditErr) {
      // Credit application failure should not block invoice generation
      console.error(`[InvoiceGeneration] Leave credit application error for org ${orgId}:`, creditErr.message)
    }

    // Create corresponding payroll run (service-role, no auth.uid() needed)
    const { data: payrollRun, error: runError } = await supabase
      .from('payroll_runs')
      .insert({
        organization_id: orgId,
        pay_period_start: periodStart,
        pay_period_end: periodEnd,
        pay_date: dueDate,
        status: 'draft',
        currency: 'NPR',
        total_amount: subtotalLocalCents / 100, // in NPR (major units)
        invoice_id: invoice.id
      })
      .select()
      .single()

    if (runError) {
      console.error('[InvoiceGeneration] Payroll run creation error:', runError)
      // Invoice still valid even if run creation fails
    }

    // Create payroll items for each member with prorated data from line items
    if (payrollRun) {
      const payrollItems = lineItems.map(item => ({
        payroll_run_id: payrollRun.id,
        member_id: item.member_id,
        base_salary: item.monthly_gross_local / 100,
        gross_salary: item.full_monthly_gross_local / 100,
        employer_ssf: item.employer_ssf_local / 100,
        employee_ssf: item.employee_ssf_local / 100,
        leave_deduction: (item.full_monthly_gross_local - item.monthly_gross_local) / 100,
        deductions: item.employee_ssf_local / 100,
        net_amount: (item.monthly_gross_local - item.employee_ssf_local) / 100,
        payable_days: item.payable_days,
        calendar_days: item.calendar_days,
        deduction_days: item.deduction_days,
        paid_leave_days: item.paid_leave_days,
        unpaid_leave_days: item.unpaid_leave_days
      }))

      const { error: itemsError } = await supabase
        .from('payroll_items')
        .insert(payrollItems)

      if (itemsError) {
        console.error('[InvoiceGeneration] Payroll items creation error:', itemsError)
      }

      // Link invoice to payroll run
      await supabase
        .from('invoices')
        .update({ payroll_run_id: payrollRun.id })
        .eq('id', invoice.id)
    }

    return invoice
  },

  /**
   * Generate invoice PDF via Anvil, cache in Supabase Storage.
   * Returns { pdfBuffer, pdfUrl, invoiceNumber }
   */
  async generateInvoicePdf(invoiceId, orgId) {
    if (!anvilClient) {
      throw new BadRequestError('PDF generation is not configured. Set ANVIL_API_KEY in environment.')
    }

    const invoice = await this.getInvoiceWithDetails(invoiceId)
    if (orgId && invoice.organization_id !== orgId) {
      throw new NotFoundError('Invoice not found for this organization')
    }

    // If PDF already cached, download from storage
    if (invoice.pdf_url) {
      const storagePath = `invoices/${invoice.organization_id}/${invoice.invoice_number}.pdf`
      const { data, error } = await supabase.storage
        .from('documents')
        .download(storagePath)

      if (!error && data) {
        const buffer = Buffer.from(await data.arrayBuffer())
        return { pdfBuffer: buffer, pdfUrl: invoice.pdf_url, invoiceNumber: invoice.invoice_number }
      }
    }

    const { html, css } = buildInvoiceHtml(invoice, invoice.organization)

    const { statusCode, data: pdfData } = await anvilClient.generatePDF({
      title: `Invoice ${invoice.invoice_number}`,
      type: 'html',
      data: { html, css }
    })

    if (statusCode !== 200 || !pdfData) {
      throw new BadRequestError(`PDF generation failed with status: ${statusCode}`)
    }

    // Upload to Supabase Storage
    const storagePath = `invoices/${invoice.organization_id}/${invoice.invoice_number}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, pdfData, { contentType: 'application/pdf', upsert: true })

    if (uploadError) {
      console.error('[InvoiceGeneration] PDF upload error:', uploadError)
      return { pdfBuffer: pdfData, pdfUrl: null, invoiceNumber: invoice.invoice_number }
    }

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath)

    await supabase
      .from('invoices')
      .update({ pdf_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', invoiceId)

    return { pdfBuffer: pdfData, pdfUrl: publicUrl, invoiceNumber: invoice.invoice_number }
  },

  /**
   * Generate receipt PDF after payment confirmation.
   * Returns { pdfBuffer, pdfUrl, invoiceNumber }
   */
  async generateReceiptPdf(invoiceId, orgId) {
    if (!anvilClient) {
      throw new BadRequestError('PDF generation is not configured. Set ANVIL_API_KEY in environment.')
    }

    const invoice = await this.getInvoiceWithDetails(invoiceId)
    if (orgId && invoice.organization_id !== orgId) {
      throw new NotFoundError('Invoice not found for this organization')
    }

    // If receipt already cached, download from storage
    if (invoice.receipt_pdf_url) {
      const storagePath = `receipts/${invoice.organization_id}/${invoice.invoice_number}-receipt.pdf`
      const { data, error } = await supabase.storage
        .from('documents')
        .download(storagePath)

      if (!error && data) {
        const buffer = Buffer.from(await data.arrayBuffer())
        return { pdfBuffer: buffer, pdfUrl: invoice.receipt_pdf_url, invoiceNumber: invoice.invoice_number }
      }
    }

    const { html, css } = buildReceiptHtml(invoice, invoice.organization, invoice.paid_at)

    const { statusCode, data: pdfData } = await anvilClient.generatePDF({
      title: `Receipt ${invoice.invoice_number}`,
      type: 'html',
      data: { html, css }
    })

    if (statusCode !== 200 || !pdfData) {
      throw new BadRequestError(`Receipt PDF generation failed with status: ${statusCode}`)
    }

    const storagePath = `receipts/${invoice.organization_id}/${invoice.invoice_number}-receipt.pdf`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, pdfData, { contentType: 'application/pdf', upsert: true })

    if (uploadError) {
      console.error('[InvoiceGeneration] Receipt upload error:', uploadError)
      return { pdfBuffer: pdfData, pdfUrl: null, invoiceNumber: invoice.invoice_number }
    }

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath)

    await supabase
      .from('invoices')
      .update({ receipt_pdf_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', invoiceId)

    return { pdfBuffer: pdfData, pdfUrl: publicUrl, invoiceNumber: invoice.invoice_number }
  },

  /**
   * Get a billing invoice with full details including org and parsed line items
   */
  async getInvoiceWithDetails(invoiceId) {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        organization:organizations!invoices_organization_id_fkey(
          id, name, email, billing_email, phone,
          address_line1, address_line2, city, state, postal_code, country,
          logo_url, payment_type
        ),
        approved_by_profile:profiles!invoices_approved_by_fkey(full_name, email),
        rejected_by_profile:profiles!invoices_rejected_by_fkey(full_name, email)
      `)
      .eq('id', invoiceId)
      .eq('type', 'billing')
      .single()

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundError('Billing invoice not found')
      throw error
    }

    return data
  }
}
