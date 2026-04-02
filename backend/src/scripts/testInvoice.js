/**
 * Test Invoice Generator
 *
 * Creates a $2 test billing invoice for an employer, including
 * linked payroll run and payroll items (mirrors the real cron flow).
 *
 * Usage:
 *   node src/scripts/testInvoice.js <employer-email>
 *
 * Example:
 *   node src/scripts/testInvoice.js akramwashim027@gmail.com
 */

import dotenv from 'dotenv'
dotenv.config()

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const employerEmail = process.argv[2]

if (!employerEmail) {
  console.error('Usage: node src/scripts/testInvoice.js <employer-email>')
  process.exit(1)
}

async function run() {
  console.log(`\nGenerating test invoice for: ${employerEmail}\n`)

  // 1. Find employer profile + org
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, organization_id')
    .eq('email', employerEmail)
    .eq('role', 'employer')
    .single()

  if (profileErr || !profile) {
    console.error('Employer not found:', profileErr?.message || 'No match')
    process.exit(1)
  }

  const orgId = profile.organization_id
  console.log(`  Org ID: ${orgId}`)

  // 2. Get org details
  const { data: org } = await supabase
    .from('organizations')
    .select('name, stripe_customer_id, payment_type, billing_email, email, settings')
    .eq('id', orgId)
    .single()

  if (!org) {
    console.error('Organization not found')
    process.exit(1)
  }
  console.log(`  Org: ${org.name}`)
  console.log(`  Stripe Customer: ${org.stripe_customer_id || 'NONE'}`)
  console.log(`  Payment Type: ${org.payment_type}`)

  // 3. Save original platform fee, then set to $1 for testing
  const { data: originalConfig } = await supabase
    .from('eor_cost_config')
    .select('platform_fee_amount')
    .eq('country_code', 'NPL')
    .eq('is_active', true)
    .single()

  const originalPlatformFee = originalConfig?.platform_fee_amount

  await supabase
    .from('eor_cost_config')
    .update({ platform_fee_amount: 100 })
    .eq('country_code', 'NPL')
    .eq('is_active', true)
  console.log(`  Platform fee set to: $1.00 (was $${((originalPlatformFee || 0) / 100).toFixed(2)})`)

  // 4. Set all active employees to small test salary (16000 NPR/year ≈ $1/month)
  const { data: members } = await supabase
    .from('organization_members')
    .select('id, first_name, last_name, job_title, department, employment_type, salary_currency, start_date, profile:profiles!organization_members_profile_id_fkey(full_name, email)')
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .neq('member_role', 'owner')
    .neq('member_role', 'authorized_user')

  if (!members || members.length === 0) {
    console.error('No active employees found. Invite at least one employee first.')
    process.exit(1)
  }

  for (const m of members) {
    await supabase
      .from('organization_members')
      .update({ salary_amount: 16000 })
      .eq('id', m.id)
  }
  console.log(`  ${members.length} employee(s) salary set to 16,000 NPR/year`)
  members.forEach(m => console.log(`    - ${m.profile?.full_name || m.first_name || 'Unknown'}`))

  // 5. Get EOR config
  const { data: config } = await supabase
    .from('eor_cost_config')
    .select('*')
    .eq('country_code', 'NPL')
    .eq('is_active', true)
    .single()

  if (!config || !config.exchange_rate) {
    console.error('EOR config or exchange_rate not set. Run: UPDATE eor_cost_config SET exchange_rate = 0.0075 WHERE country_code = \'NPL\';')
    process.exit(1)
  }

  const exchangeRate = parseFloat(config.exchange_rate)
  const employerSsfRate = parseFloat(config.employer_ssf_rate)
  const employeeSsfRate = parseFloat(config.employee_ssf_rate)
  const platformFee = config.platform_fee_amount
  const periodsPerYear = config.periods_per_year || 12

  // 6. Determine billing period
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0]
  const calendarDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  // 7. Check for existing invoice this period — delete if found
  const { data: existing } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, payroll_run_id')
    .eq('organization_id', orgId)
    .eq('billing_period_start', periodStart)
    .eq('type', 'billing')

  if (existing && existing.length > 0) {
    console.log(`\n  Deleting existing invoice(s) for this period...`)
    for (const inv of existing) {
      if (inv.payroll_run_id) {
        await supabase.from('payroll_items').delete().eq('payroll_run_id', inv.payroll_run_id)
        await supabase.from('invoices').update({ payroll_run_id: null }).eq('id', inv.id)
        await supabase.from('payroll_runs').delete().eq('id', inv.payroll_run_id)
      }
      await supabase.from('invoices').delete().eq('id', inv.id)
      console.log(`    Deleted: ${inv.invoice_number} (${inv.status})`)
    }
  }

  // 8. Build line items (matching real generateInvoiceForOrg structure)
  const lineItems = members.map(member => {
    const annualSalary = 16000
    const fullMonthlyGrossLocal = Math.round((annualSalary / periodsPerYear) * 100) // paisa
    const monthlyGrossLocal = fullMonthlyGrossLocal // no leave deductions in test
    const employerSsf = Math.round(monthlyGrossLocal * employerSsfRate)
    const employeeSsf = Math.round(monthlyGrossLocal * employeeSsfRate)
    const totalCostLocal = monthlyGrossLocal + employerSsf
    const totalCostNpr = totalCostLocal / 100
    const totalCostUsd = totalCostNpr * exchangeRate
    const costUsdCents = Math.round(totalCostUsd * 100)

    return {
      member_id: member.id,
      member_name: member.profile?.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unknown',
      member_email: member.profile?.email || null,
      job_title: member.job_title || null,
      department: member.department || null,
      employment_type: member.employment_type || 'full_time',
      salary_currency: member.salary_currency || 'NPR',
      annual_salary: annualSalary,
      full_monthly_gross_local: fullMonthlyGrossLocal,
      monthly_gross_local: monthlyGrossLocal,
      employer_ssf_local: employerSsf,
      employee_ssf_local: employeeSsf,
      total_cost_local: totalCostLocal,
      cost_usd_cents: costUsdCents,
      platform_fee_cents: platformFee,
      payable_days: calendarDays,
      calendar_days: calendarDays,
      deduction_days: 0,
      paid_leave_days: 0,
      unpaid_leave_days: 0
    }
  })

  const subtotalLocalCents = lineItems.reduce((s, i) => s + i.total_cost_local, 0)
  const subtotalUsdCents = lineItems.reduce((s, i) => s + i.cost_usd_cents, 0)
  const totalPlatformFee = platformFee * members.length
  const totalAmountCents = subtotalUsdCents + totalPlatformFee

  // 9. Generate invoice number
  const { data: invNum } = await supabase.rpc('generate_invoice_number', { p_org_id: orgId })
  const invoiceNumber = invNum || `INV-TEST-${Date.now()}`

  // 10. Insert invoice
  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      organization_id: orgId,
      invoice_number: invoiceNumber,
      type: 'billing',
      status: 'pending',
      currency: 'USD',
      issue_date: now.toISOString().split('T')[0],
      due_date: dueDate,
      billing_period_start: periodStart,
      billing_period_end: periodEnd,
      amount: totalAmountCents / 100,
      subtotal_local_cents: subtotalLocalCents,
      platform_fee_cents: totalPlatformFee,
      total_amount_cents: totalAmountCents,
      exchange_rate: exchangeRate,
      payment_type: org.payment_type,
      employee_count: members.length,
      line_items: lineItems,
      config_snapshot: {
        country_code: config.country_code,
        employer_ssf_rate: config.employer_ssf_rate,
        employee_ssf_rate: config.employee_ssf_rate,
        platform_fee_amount: config.platform_fee_amount,
        exchange_rate: config.exchange_rate,
        periods_per_year: periodsPerYear
      },
      client_name: org.name,
      client_email: org.billing_email || org.email
    })
    .select()
    .single()

  if (invErr) {
    console.error('Failed to create invoice:', invErr.message)
    process.exit(1)
  }

  // 11. Create payroll run linked to invoice
  const { data: payrollRun, error: runErr } = await supabase
    .from('payroll_runs')
    .insert({
      organization_id: orgId,
      pay_period_start: periodStart,
      pay_period_end: periodEnd,
      pay_date: periodEnd,
      status: 'draft',
      currency: 'NPR',
      total_amount: subtotalLocalCents / 100,
      invoice_id: invoice.id
    })
    .select()
    .single()

  if (runErr) {
    console.error('Failed to create payroll run:', runErr.message)
  }

  // 12. Create payroll items for each employee
  if (payrollRun) {
    const payrollItems = lineItems.map(item => ({
      payroll_run_id: payrollRun.id,
      member_id: item.member_id,
      base_salary: item.monthly_gross_local / 100,
      gross_salary: item.full_monthly_gross_local / 100,
      employer_ssf: item.employer_ssf_local / 100,
      employee_ssf: item.employee_ssf_local / 100,
      leave_deduction: 0,
      deductions: item.employee_ssf_local / 100,
      payable_days: item.payable_days,
      calendar_days: item.calendar_days,
      deduction_days: item.deduction_days,
      paid_leave_days: item.paid_leave_days,
      unpaid_leave_days: item.unpaid_leave_days
    }))

    const { error: itemsErr } = await supabase
      .from('payroll_items')
      .insert(payrollItems)

    if (itemsErr) {
      console.error('Failed to create payroll items:', itemsErr.message)
    } else {
      // Link invoice to payroll run
      await supabase
        .from('invoices')
        .update({ payroll_run_id: payrollRun.id })
        .eq('id', invoice.id)

      console.log(`  Payroll run created: ${payrollRun.id} (${payrollItems.length} items)`)
    }
  }

  // 13. Restore original platform fee
  if (originalPlatformFee) {
    await supabase
      .from('eor_cost_config')
      .update({ platform_fee_amount: originalPlatformFee })
      .eq('country_code', 'NPL')
      .eq('is_active', true)
    console.log(`  Platform fee restored to: $${(originalPlatformFee / 100).toFixed(2)}`)
  }

  console.log(`\n  ✓ Invoice created: ${invoiceNumber}`)
  console.log(`  Total: $${(totalAmountCents / 100).toFixed(2)} USD`)
  console.log(`    - Payroll cost (USD): $${(subtotalUsdCents / 100).toFixed(2)}`)
  console.log(`    - Platform fee: $${(totalPlatformFee / 100).toFixed(2)} (${members.length} × $${(platformFee / 100).toFixed(2)})`)
  console.log(`  Status: pending`)
  console.log(`  Due: ${dueDate}`)
  console.log(`  Period: ${periodStart} to ${periodEnd}`)
  console.log(`\n  Go to /billing to approve and trigger Stripe ACH payment.\n`)
}

run().catch(err => {
  console.error('Script failed:', err)
  process.exit(1)
})
