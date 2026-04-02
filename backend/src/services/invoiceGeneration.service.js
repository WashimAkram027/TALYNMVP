import { supabase } from '../config/supabase.js'
import { anvilClient } from '../config/anvil.js'
import { quoteService } from './quote.service.js'
import { invoicesService } from './invoices.service.js'
import { leaveReconciliationService } from './leaveReconciliation.service.js'
import { buildInvoiceHtml, buildReceiptHtml, buildPayslipHtml, buildPerEmployeeInvoiceHtml } from './pdfTemplate.service.js'
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
      .select('id, name, billing_email, email, payment_type, settings, status')
      .not('stripe_customer_id', 'is', null)
      .eq('status', 'active')

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
          .neq('member_role', 'authorized_user')

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

    summary.periodStart = periodStart
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
      .neq('member_role', 'authorized_user')

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
    if (isNaN(exchangeRate) || exchangeRate < 0.001 || exchangeRate > 0.05) {
      throw new BadRequestError(`Exchange rate ${config.exchange_rate} is outside safe bounds (0.001–0.05, i.e. 20–1000 NPR/USD). Admin must verify.`)
    }
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

      // Convert local cost to USD cents (explicit 3-step: paisa → NPR → USD → cents)
      const totalCostNpr = totalCostLocal / 100          // paisa → NPR
      const totalCostUsd = totalCostNpr * exchangeRate   // NPR → USD
      const costUsdCents = Math.round(totalCostUsd * 100) // USD → cents

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
    const subtotalLocalCents = Math.round(lineItems.reduce((sum, item) => sum + item.total_cost_local, 0))
    const subtotalUsdCents = Math.round(lineItems.reduce((sum, item) => sum + item.cost_usd_cents, 0))
    const totalPlatformFeeCents = Math.round(platformFeePerEmployee * members.length)
    const totalAmountCents = Math.round(subtotalUsdCents + totalPlatformFeeCents)

    // Generate invoice number
    const invoiceNumber = await invoicesService.generateInvoiceNumber(orgId)

    // Calculate due date = 1st of next month (UTC-safe string arithmetic)
    const [psYear, psMonth] = periodStart.split('-').map(Number)
    const dueDate = `${psMonth === 12 ? psYear + 1 : psYear}-${String(psMonth === 12 ? 1 : psMonth + 1).padStart(2, '0')}-01`

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
        pay_date: periodEnd, // Set to period end as default; updated to actual date when admin approves disbursement
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
    // Note: net_amount is a GENERATED ALWAYS column — do NOT include it in the insert.
    // It auto-computes as: base_salary + bonuses + allowances - deductions - tax_amount
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
        // Clean up orphaned payroll run to avoid inconsistent state
        await supabase.from('payroll_runs').delete().eq('id', payrollRun.id)
        await supabase.from('invoices').update({ payroll_run_id: null }).eq('id', invoice.id)
      } else {
        // Link invoice to payroll run only on successful items creation
        await supabase
          .from('invoices')
          .update({ payroll_run_id: payrollRun.id })
          .eq('id', invoice.id)
      }
    }

    return invoice
  },

  /**
   * Generate invoice PDF via Anvil, cache in Supabase Storage.
   * Returns { pdfBuffer, pdfUrl, invoiceNumber }
   */
  async generateInvoicePdf(invoiceId, orgId, variant = 'detail') {
    if (!anvilClient) {
      throw new BadRequestError('PDF generation is not configured. Set ANVIL_API_KEY in environment.')
    }

    const invoice = await this.getInvoiceWithDetails(invoiceId)
    if (orgId && invoice.organization_id !== orgId) {
      throw new NotFoundError('Invoice not found for this organization')
    }

    // If PDF already cached and requesting default variant, download from storage
    if (invoice.pdf_url && variant === 'detail') {
      const storagePath = `invoices/${invoice.organization_id}/${invoice.invoice_number}.pdf`
      const { data, error } = await supabase.storage
        .from('documents')
        .download(storagePath)

      if (!error && data) {
        const buffer = Buffer.from(await data.arrayBuffer())
        return { pdfBuffer: buffer, pdfUrl: invoice.pdf_url, invoiceNumber: invoice.invoice_number }
      }
    }

    const { html, css } = buildInvoiceHtml(invoice, invoice.organization, variant)

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

    // Store the storage path (not a public URL) for security — PDFs are served through authenticated endpoints
    await supabase
      .from('invoices')
      .update({ pdf_url: storagePath, updated_at: new Date().toISOString() })
      .eq('id', invoiceId)

    return { pdfBuffer: pdfData, pdfUrl: storagePath, invoiceNumber: invoice.invoice_number }
  },

  /**
   * Generate receipt PDF after payment confirmation.
   * Returns { pdfBuffer, pdfUrl, invoiceNumber }
   */
  async generateReceiptPdf(invoiceId, orgId, variant = 'detail') {
    if (!anvilClient) {
      throw new BadRequestError('PDF generation is not configured. Set ANVIL_API_KEY in environment.')
    }

    const invoice = await this.getInvoiceWithDetails(invoiceId)
    if (orgId && invoice.organization_id !== orgId) {
      throw new NotFoundError('Invoice not found for this organization')
    }

    // If receipt already cached and requesting default variant, download from storage
    if (invoice.receipt_pdf_url && variant === 'detail') {
      const storagePath = `receipts/${invoice.organization_id}/${invoice.invoice_number}-receipt.pdf`
      const { data, error } = await supabase.storage
        .from('documents')
        .download(storagePath)

      if (!error && data) {
        const buffer = Buffer.from(await data.arrayBuffer())
        return { pdfBuffer: buffer, pdfUrl: invoice.receipt_pdf_url, invoiceNumber: invoice.invoice_number }
      }
    }

    const { html, css } = buildReceiptHtml(invoice, invoice.organization, invoice.paid_at, variant)

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

    // Store the storage path (not a public URL) for security — receipts are served through authenticated endpoints
    await supabase
      .from('invoices')
      .update({ receipt_pdf_url: storagePath, updated_at: new Date().toISOString() })
      .eq('id', invoiceId)

    return { pdfBuffer: pdfData, pdfUrl: storagePath, invoiceNumber: invoice.invoice_number }
  },

  /**
   * Generate payslip PDF for a specific member in a payroll run.
   * Returns { pdfBuffer, pdfUrl, memberName }
   */
  async generatePayslipPdf(payrollRunId, memberId, orgId) {
    if (!anvilClient) {
      throw new BadRequestError('PDF generation is not configured. Set ANVIL_API_KEY in environment.')
    }

    const { item, org, period } = await this._getPayslipDataInternal(payrollRunId, memberId, orgId)
    const memberName = item.member?.profile?.full_name || 'employee'

    // Check for cached payslip PDF
    if (item.payslip_pdf_url) {
      const storagePath = `payslips/${orgId}/${payrollRunId}-${memberId}.pdf`
      const { data, error } = await supabase.storage
        .from('documents')
        .download(storagePath)

      if (!error && data) {
        const buffer = Buffer.from(await data.arrayBuffer())
        return { pdfBuffer: buffer, pdfUrl: item.payslip_pdf_url, memberName }
      }
    }

    const { html, css } = buildPayslipHtml(
      item,
      {
        full_name: item.member?.profile?.full_name,
        email: item.member?.profile?.email,
        job_title: item.member?.job_title,
        start_date: item.member?.start_date,
        member_id: item.member?.id || memberId,
      },
      org,
      period
    )

    const { statusCode, data: pdfData } = await anvilClient.generatePDF({
      title: `Payslip ${memberName} ${period}`,
      type: 'html',
      data: { html, css }
    })

    if (statusCode !== 200 || !pdfData) {
      throw new BadRequestError(`Payslip PDF generation failed with status: ${statusCode}`)
    }

    const storagePath = `payslips/${orgId}/${payrollRunId}-${memberId}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, pdfData, { contentType: 'application/pdf', upsert: true })

    let pdfUrl = null
    if (!uploadError) {
      // Store the storage path (not a public URL) for security — payslips are served through authenticated endpoints
      pdfUrl = storagePath

      // Cache the storage path on the payroll item for future requests
      await supabase.from('payroll_items')
        .update({ payslip_pdf_url: storagePath })
        .eq('payroll_run_id', payrollRunId)
        .eq('member_id', memberId)
    } else {
      console.error('[InvoiceGeneration] Payslip upload error:', uploadError)
    }

    return { pdfBuffer: pdfData, pdfUrl, memberName }
  },

  /**
   * Generate per-employee invoice PDF showing the employer's cost breakdown for one employee.
   * Returns { pdfBuffer, pdfUrl, memberName }
   */
  async generatePerEmployeeInvoicePdf(payrollRunId, memberId, orgId) {
    if (!anvilClient) {
      throw new BadRequestError('PDF generation is not configured. Set ANVIL_API_KEY in environment.')
    }

    const { item, org, period } = await this._getPayslipDataInternal(payrollRunId, memberId, orgId)
    const memberName = item.member?.profile?.full_name || 'employee'

    // Require a linked billing invoice for exchange rate, dates, and platform fee data
    const invoiceId = item.payroll_run?.invoice_id
    if (!invoiceId) {
      throw new BadRequestError('Per-employee invoice requires a linked billing invoice')
    }

    // Check for cached PDF first
    const storagePath = `employee-invoices/${orgId}/${payrollRunId}-${memberId}.pdf`
    const { data: cached, error: cacheErr } = await supabase.storage
      .from('documents')
      .download(storagePath)
    if (!cacheErr && cached) {
      const buffer = Buffer.from(await cached.arrayBuffer())
      return { pdfBuffer: buffer, pdfUrl: storagePath, memberName }
    }

    // Fetch the parent billing invoice
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('id, invoice_number, exchange_rate, config_snapshot, issue_date, due_date, line_items')
      .eq('id', invoiceId)
      .single()

    if (invError || !invoice) {
      throw new NotFoundError('Linked billing invoice not found')
    }

    const exchangeRate = parseFloat(invoice.exchange_rate) || 0
    const baseSalaryNPR = parseFloat(item.base_salary) || 0
    const employerSsfNPR = parseFloat(item.employer_ssf) || 0

    // Build line items
    const lineItems = [
      {
        description: 'Monthly salary',
        detail: `Gross salary for ${period}`,
        amountNPR: baseSalaryNPR,
        amountUSD: Math.round(baseSalaryNPR * exchangeRate * 100) / 100,
      },
      {
        description: `Employer SSF (${invoice.config_snapshot?.employer_ssf_rate ? (invoice.config_snapshot.employer_ssf_rate * 100).toFixed(0) + '%' : '20%'})`,
        detail: 'Social Security Fund — employer contribution',
        amountNPR: employerSsfNPR,
        amountUSD: Math.round(employerSsfNPR * exchangeRate * 100) / 100,
      },
    ]

    // Add platform fee from invoice line_items if available
    const memberLineItem = (invoice.line_items || []).find(li => li.member_id === memberId)
    const platformFeeCents = memberLineItem?.platform_fee_cents || 0
    if (platformFeeCents > 0) {
      lineItems.push({
        description: 'EOR platform fee',
        detail: 'Employer of Record service fee',
        amountUSD: platformFeeCents / 100,
      })
    }

    const totalDue = lineItems.reduce((sum, li) => sum + (li.amountUSD || 0), 0)

    // Construct doc number from parent invoice number + stable member ID suffix
    const docNumber = `${invoice.invoice_number}-E${memberId.substring(0, 4).toUpperCase()}`

    const periodStr = `${new Date(item.payroll_run.pay_period_start).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} to ${new Date(item.payroll_run.pay_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

    const { html, css } = buildPerEmployeeInvoiceHtml({
      docNumber,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      organization: org,
      employee: {
        name: memberName,
        jobTitle: item.member?.job_title || '',
      },
      period: periodStr,
      lineItems,
      totalDue,
      paymentDetails: exchangeRate ? {
        exchangeFrom: 'NPR',
        exchangeTo: 'USD',
        exchangeRate: exchangeRate.toFixed(7),
      } : undefined,
      refNumber: invoice.id?.substring(0, 8),
    })

    const { statusCode, data: pdfData } = await anvilClient.generatePDF({
      title: `Employee Invoice ${docNumber}`,
      type: 'html',
      data: { html, css }
    })

    if (statusCode !== 200 || !pdfData) {
      throw new BadRequestError(`Per-employee invoice PDF generation failed with status: ${statusCode}`)
    }

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, pdfData, { contentType: 'application/pdf', upsert: true })

    if (uploadError) {
      console.error('[InvoiceGeneration] Per-employee invoice upload error:', uploadError)
    }

    return { pdfBuffer: pdfData, pdfUrl: uploadError ? null : storagePath, memberName }
  },

  /**
   * Get payslip data as JSON for frontend rendering.
   */
  async getPayslipData(payrollRunId, memberId, orgId) {
    const { item, period } = await this._getPayslipDataInternal(payrollRunId, memberId, orgId)

    const baseSalary = parseFloat(item.base_salary) || 0
    const basic = baseSalary * 0.6
    const dearness = baseSalary * 0.4

    return {
      period,
      employee: {
        name: item.member?.profile?.full_name || '—',
        oid: `TLN-${String(item.member?.id || memberId).substring(0, 8).toUpperCase()}`,
        joinDate: item.member?.start_date || '—',
        designation: item.member?.job_title || '—',
        pan: '—',
        bankAccount: null,
        bankName: '—',
      },
      incomeItems: [
        { label: 'Basic salary', amount: basic },
        { label: 'Dearness allowance', amount: dearness },
        { label: 'Other allowance', amount: null },
        { label: 'Festival allowance', amount: null },
        { label: 'Bonus', amount: null },
        { label: 'Leave encashments', amount: null },
        { label: 'Other payments', amount: null },
      ],
      deductionItems: [
        { label: 'SSF (employee)', amount: parseFloat(item.employee_ssf) || null },
        { label: 'Income tax', amount: null },
      ],
      totalGross: baseSalary,
      totalDeductions: parseFloat(item.deductions) || 0,
      netSalary: parseFloat(item.net_amount) || 0,
      payableDays: item.payable_days,
      calendarDays: item.calendar_days,
    }
  },

  /**
   * Internal helper to fetch payslip data with validation.
   */
  async _getPayslipDataInternal(payrollRunId, memberId, orgId) {
    const { data: item, error } = await supabase
      .from('payroll_items')
      .select(`
        *,
        payroll_run:payroll_runs!payroll_items_payroll_run_id_fkey(
          id, organization_id, pay_period_start, pay_period_end, pay_date, invoice_id
        ),
        member:organization_members!payroll_items_member_id_fkey(
          id, job_title, start_date,
          profile:profiles!organization_members_profile_id_fkey(full_name, email)
        )
      `)
      .eq('payroll_run_id', payrollRunId)
      .eq('member_id', memberId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundError('Payslip not found')
      throw error
    }

    if (item.payroll_run?.organization_id !== orgId) {
      throw new NotFoundError('Payslip not found for this organization')
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, email, billing_email, phone, address_line1, address_line2, city, state, postal_code, country')
      .eq('id', orgId)
      .single()

    const period = new Date(item.payroll_run.pay_period_start).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long'
    })

    return { item, org, period }
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
