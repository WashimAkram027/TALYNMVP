/**
 * Test Invoice Generator
 *
 * Creates a $2 test billing invoice for an employer.
 * Sets employee salary and platform fee to produce a small test amount.
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

  // 3. Set platform fee to $1 (100 cents)
  await supabase
    .from('eor_cost_config')
    .update({ platform_fee_amount: 100 })
    .eq('country_code', 'NPL')
    .eq('is_active', true)
  console.log(`  Platform fee set to: $1.00`)

  // 4. Set all active employees to small test salary (16000 NPR/year ≈ $1/month)
  const { data: members } = await supabase
    .from('organization_members')
    .select('id, profile:profiles!organization_members_profile_id_fkey(full_name)')
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .neq('member_role', 'owner')

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
  members.forEach(m => console.log(`    - ${m.profile?.full_name || 'Unknown'}`))

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

  // 6. Determine billing period
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0]

  // 7. Check for existing invoice this period
  const { data: existing } = await supabase
    .from('invoices')
    .select('id, invoice_number, status')
    .eq('organization_id', orgId)
    .eq('billing_period_start', periodStart)
    .eq('type', 'billing')

  if (existing && existing.length > 0) {
    console.log(`\n  WARNING: Invoice already exists for this period: ${existing[0].invoice_number} (${existing[0].status})`)
    console.log(`  Deleting existing invoice to create fresh one...`)

    // Delete linked payroll items/runs first
    for (const inv of existing) {
      const { data: runs } = await supabase
        .from('payroll_runs')
        .select('id')
        .eq('invoice_id', inv.id)

      if (runs) {
        for (const run of runs) {
          await supabase.from('payroll_items').delete().eq('payroll_run_id', run.id)
        }
        await supabase.from('payroll_runs').delete().eq('invoice_id', inv.id)
      }
      await supabase.from('invoices').delete().eq('id', inv.id)
    }
  }

  // 8. Build line items
  const lineItems = members.map(member => {
    const monthlyGross = Math.round((16000 / 12) * 100) // paisa
    const employerSsf = Math.round(monthlyGross * employerSsfRate)
    const employeeSsf = Math.round(monthlyGross * employeeSsfRate)
    const totalCostLocal = monthlyGross + employerSsf
    const costUsdCents = Math.round(totalCostLocal * exchangeRate)

    return {
      member_id: member.id,
      member_name: member.profile?.full_name || 'Unknown',
      job_title: null,
      department: null,
      salary_currency: 'NPR',
      annual_salary: 16000,
      monthly_gross_local: monthlyGross,
      employer_ssf_local: employerSsf,
      employee_ssf_local: employeeSsf,
      total_cost_local: totalCostLocal,
      cost_usd_cents: costUsdCents,
      platform_fee_cents: platformFee
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
        exchange_rate: config.exchange_rate
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

  console.log(`\n  Invoice created: ${invoiceNumber}`)
  console.log(`  Total: $${(totalAmountCents / 100).toFixed(2)} USD`)
  console.log(`    - Payroll cost (USD): $${(subtotalUsdCents / 100).toFixed(2)}`)
  console.log(`    - Platform fee: $${(totalPlatformFee / 100).toFixed(2)}`)
  console.log(`  Status: pending`)
  console.log(`  Due: ${dueDate}`)
  console.log(`  Period: ${periodStart} to ${periodEnd}`)
  console.log(`\n  Go to /payslips to approve and trigger Stripe ACH payment.\n`)
}

run().catch(err => {
  console.error('Script failed:', err)
  process.exit(1)
})
