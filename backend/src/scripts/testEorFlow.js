/**
 * EOR Math End-to-End Flow Test
 *
 * Tests the full employee financial lifecycle using REAL service functions:
 *   Quote -> Accept -> Invoice Generation -> Mark Paid -> All PDFs
 *
 * Usage:
 *   cd backend && node src/scripts/testEorFlow.js 780000
 *
 * Where 780000 is the annual salary in NPR (major units).
 *
 * Output:
 *   - PDFs (or HTML fallbacks) written to: src/scripts/test-output/
 *   - Math summary table printed at end
 *   - All test DB rows cleaned up on exit
 */

import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { supabase } from '../config/supabase.js'
import { anvilClient } from '../config/anvil.js'
import { quoteService } from '../services/quote.service.js'
import { invoiceGenerationService } from '../services/invoiceGeneration.service.js'
import {
  buildQuoteHtml,
  buildInvoiceHtml,
  buildReceiptHtml,
  buildPayslipHtml,
  buildPerEmployeeInvoiceHtml
} from '../services/pdfTemplate.service.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.resolve(__dirname, 'test-output')

// Future period to guarantee no idempotency collision with real billing data
const TEST_PERIOD_START = '2099-01-01'
const TEST_PERIOD_END = '2099-01-31'

// ─── CLI Argument ─────────────────────────────────────────────────────────────

function parseAnnualSalary() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage: node src/scripts/testEorFlow.js <annual_salary_npr>')
    console.error('Example: node src/scripts/testEorFlow.js 780000')
    process.exit(1)
  }
  const salary = parseFloat(arg)
  if (!isFinite(salary) || salary <= 0) {
    console.error(`Invalid salary: "${arg}". Must be a positive number (NPR major units).`)
    process.exit(1)
  }
  return salary
}

// ─── Output Directory ─────────────────────────────────────────────────────────

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }
}

function savePdf(name, buffer) {
  const filePath = path.join(OUTPUT_DIR, `${name}.pdf`)
  fs.writeFileSync(filePath, buffer)
  console.log(`    -> PDF saved: ${name}.pdf (${(buffer.length / 1024).toFixed(1)} KB)`)
  return filePath
}

function saveHtml(name, html) {
  const filePath = path.join(OUTPUT_DIR, `${name}.html`)
  fs.writeFileSync(filePath, html, 'utf8')
  console.log(`    -> HTML saved (no Anvil): ${name}.html (${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(1)} KB)`)
  return filePath
}

// ─── Database Discovery ───────────────────────────────────────────────────────

async function discoverOrgWithEmployee() {
  // Step 1: Find active orgs
  const { data: orgs, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name, owner_id')
    .eq('status', 'active')
    .limit(20)

  if (orgErr) throw new Error(`Org query failed: ${orgErr.message}`)
  if (!orgs || orgs.length === 0) {
    throw new Error('No active organizations found. Set up an org first.')
  }

  const activeOrgIds = orgs.map(o => o.id)

  // Step 2: Find active employee members in those orgs
  const { data: members, error: memErr } = await supabase
    .from('organization_members')
    .select(`
      id, organization_id, first_name, last_name, invitation_email, salary_amount,
      profile_id,
      profile:profiles!organization_members_profile_id_fkey(id, full_name, email)
    `)
    .eq('status', 'active')
    .neq('member_role', 'owner')
    .neq('member_role', 'authorized_user')
    .in('organization_id', activeOrgIds)
    .limit(5)

  if (memErr) throw new Error(`Member query failed: ${memErr.message}`)
  if (!members || members.length === 0) {
    throw new Error('No active employee members found in any active org.')
  }

  const member = members[0]
  const org = orgs.find(o => o.id === member.organization_id)

  return {
    orgId: member.organization_id,
    orgName: org.name,
    ownerId: org.owner_id,
    member: {
      id: member.id,
      profileId: member.profile_id || member.profile?.id,
      name: member.profile?.full_name
        || `${member.first_name || ''} ${member.last_name || ''}`.trim()
        || member.invitation_email || 'Unknown',
      email: member.profile?.email || member.invitation_email,
      salaryAmount: member.salary_amount
    }
  }
}

// ─── Pre-flight ───────────────────────────────────────────────────────────────

async function verifyEorConfig() {
  const config = await quoteService.getCostConfig('NPL')

  if (!config.exchange_rate) {
    throw new Error('eor_cost_config.exchange_rate is not set. Admin must set it before running this test.')
  }

  const rate = parseFloat(config.exchange_rate)
  if (!isFinite(rate) || rate < 0.001 || rate > 0.05) {
    throw new Error(`exchange_rate ${config.exchange_rate} outside safe bounds (0.001-0.05).`)
  }

  return config
}

// ─── Math Logging ─────────────────────────────────────────────────────────────

function logQuoteMath(quote, config) {
  const basicRatio = parseFloat(config.basic_salary_ratio ?? 0.6)
  const pad = (label) => label.padEnd(32)

  console.log('  Math Breakdown (Quote):')
  console.log(`    ${pad('Annual salary')} NPR ${((quote.annual_salary || 0) / 100).toLocaleString()}`)
  console.log(`    ${pad('Monthly gross')} NPR ${((quote.monthly_gross_salary || 0) / 100).toFixed(2)}`)
  console.log(`    ${pad(`Basic salary (${(basicRatio * 100).toFixed(0)}%)`)} NPR ${((quote.basic_salary_amount || 0) / 100).toFixed(2)}`)
  console.log(`    ${pad(`Employer SSF (${(parseFloat(config.employer_ssf_rate) * 100).toFixed(0)}% of basic)`)} NPR ${((quote.employer_ssf_amount || 0) / 100).toFixed(2)}`)
  console.log(`    ${pad(`Employee SSF (${(parseFloat(config.employee_ssf_rate) * 100).toFixed(0)}% of basic)`)} NPR ${((quote.employee_ssf_amount || 0) / 100).toFixed(2)}`)
  console.log(`    ${pad(`Severance (basic / ${config.periods_per_year})`)} NPR ${((quote.severance_amount || 0) / 100).toFixed(2)}`)
  console.log(`    ${pad('Estimated net salary')} NPR ${((quote.estimated_net_salary || 0) / 100).toFixed(2)}`)
  console.log(`    ${pad('Total monthly cost (NPR)')} NPR ${((quote.total_monthly_cost_local || 0) / 100).toFixed(2)}`)
  console.log(`    ${pad('Total annual cost (NPR)')} NPR ${((quote.total_annual_cost_local || 0) / 100).toFixed(2)}`)

  if (quote.exchange_rate) {
    const exRate = parseFloat(quote.exchange_rate)
    console.log(`    ${pad('Exchange rate')} ${exRate} USD/NPR`)
    if (quote.monthly_cost_usd_cents) console.log(`    ${pad('Monthly cost (USD, w/ fee)')} $${(quote.monthly_cost_usd_cents / 100).toFixed(2)}`)
    if (quote.total_annual_cost_usd_cents) console.log(`    ${pad('Annual cost (USD, w/ fees)')} $${(quote.total_annual_cost_usd_cents / 100).toFixed(2)}`)
  }
}

function logInvoiceLineMath(li, config) {
  const basicRatio = parseFloat(config.basic_salary_ratio ?? 0.6)
  const pad = (label) => label.padEnd(36)

  console.log(`  Invoice Line (${li.member_name}):`)
  console.log(`    ${pad('Monthly gross (prorated)')} NPR ${((li.monthly_gross_local || 0) / 100).toFixed(2)}`)
  console.log(`    ${pad(`Basic salary (${(basicRatio * 100).toFixed(0)}%)`)} NPR ${((li.basic_salary_local || 0) / 100).toFixed(2)}`)
  console.log(`    ${pad(`Employer SSF (${(parseFloat(config.employer_ssf_rate) * 100).toFixed(0)}% of basic)`)} NPR ${((li.employer_ssf_local || 0) / 100).toFixed(2)}`)
  console.log(`    ${pad(`Severance (basic / ${config.periods_per_year})`)} NPR ${((li.severance_local || 0) / 100).toFixed(2)}`)
  console.log(`    ${pad('Total cost (local)')} NPR ${((li.total_cost_local || 0) / 100).toFixed(2)}`)
  console.log(`    ${pad('Cost (USD)')} $${((li.cost_usd_cents || 0) / 100).toFixed(2)}`)
  console.log(`    ${pad('Platform fee (USD)')} $${((li.platform_fee_cents || 0) / 100).toFixed(2)}`)
}

// ─── Document Generation Helper ──────────────────────────────────────────────

async function generateDocument(label, name, pdfFn, htmlFn) {
  process.stdout.write(`  ${label}... `)

  if (!anvilClient && htmlFn) {
    try {
      const { html } = htmlFn()
      console.log('OK (HTML)')
      const filePath = saveHtml(name, html)
      return filePath
    } catch (err) {
      console.log(`FAILED (HTML): ${err.message}`)
      return null
    }
  }

  if (!anvilClient) {
    console.log('SKIPPED (no Anvil)')
    return null
  }

  try {
    const result = await pdfFn()
    console.log('OK')
    return savePdf(name, result.pdfBuffer)
  } catch (err) {
    console.log(`FAILED: ${err.message}`)
    return null
  }
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanup(ids) {
  console.log('\n-- Cleanup -------------------------------------------------------')

  if (ids.payrollRunId) {
    const { error } = await supabase.from('payroll_items').delete().eq('payroll_run_id', ids.payrollRunId)
    console.log(error ? `  payroll_items: ${error.message}` : '  payroll_items deleted')
  }

  if (ids.invoiceId && ids.payrollRunId) {
    await supabase.from('invoices').update({ payroll_run_id: null }).eq('id', ids.invoiceId)
  }

  if (ids.payrollRunId) {
    const { error } = await supabase.from('payroll_runs').delete().eq('id', ids.payrollRunId)
    console.log(error ? `  payroll_run: ${error.message}` : '  payroll_run deleted')
  }

  if (ids.invoiceId) {
    const { error } = await supabase.from('invoices').delete().eq('id', ids.invoiceId)
    console.log(error ? `  invoice: ${error.message}` : '  invoice deleted')
  }

  if (ids.quoteId) {
    const { error } = await supabase.from('eor_quotes').delete().eq('id', ids.quoteId)
    console.log(error ? `  quote: ${error.message}` : '  quote deleted')
  }

  console.log('-- Cleanup complete ----------------------------------------------')
}

// ─── Summary ──────────────────────────────────────────────────────────────────

function printSummary(data) {
  const { annualSalary, config, quote, invoice, savedFiles } = data
  const basicRatio = parseFloat(config.basic_salary_ratio ?? 0.6)
  const empSsfRate = parseFloat(config.employer_ssf_rate)
  const eeSsfRate = parseFloat(config.employee_ssf_rate)
  const exRate = config.exchange_rate ? parseFloat(config.exchange_rate) : null

  const mg = (quote?.monthly_gross_salary || 0) / 100
  const bs = (quote?.basic_salary_amount || 0) / 100
  const es = (quote?.employer_ssf_amount || 0) / 100
  const ee = (quote?.employee_ssf_amount || 0) / 100
  const sv = (quote?.severance_amount || 0) / 100
  const tm = (quote?.total_monthly_cost_local || 0) / 100
  const ta = (quote?.total_annual_cost_local || 0) / 100

  console.log('\n')
  console.log('================================================================')
  console.log('  EOR MATH SUMMARY')
  console.log('================================================================')
  console.log(`  Input: NPR ${annualSalary.toLocaleString()} / year`)
  console.log('----------------------------------------------------------------')
  console.log('  MONTHLY BREAKDOWN')
  console.log(`    Monthly gross                     NPR ${mg.toFixed(2)}`)
  console.log(`    Basic salary (${(basicRatio * 100).toFixed(0)}% of gross)       NPR ${bs.toFixed(2)}`)
  console.log(`    Employer SSF (${(empSsfRate * 100).toFixed(0)}% of basic)       NPR ${es.toFixed(2)}`)
  console.log(`    Employee SSF (${(eeSsfRate * 100).toFixed(0)}% of basic)       NPR ${ee.toFixed(2)}`)
  console.log(`    Severance (basic / 12)            NPR ${sv.toFixed(2)}`)
  console.log(`    Total monthly employer cost       NPR ${tm.toFixed(2)}`)
  console.log('----------------------------------------------------------------')
  console.log('  ANNUAL TOTALS')
  console.log(`    Total annual cost (NPR)           NPR ${ta.toFixed(2)}`)
  if (exRate) {
    console.log(`    Exchange rate                     ${exRate.toFixed(6)} USD/NPR`)
    if (quote?.monthly_cost_usd_cents) console.log(`    Monthly cost (USD, incl fee)      $${(quote.monthly_cost_usd_cents / 100).toFixed(2)}`)
    if (quote?.total_annual_cost_usd_cents) console.log(`    Annual cost (USD, incl fees)      $${(quote.total_annual_cost_usd_cents / 100).toFixed(2)}`)
    if (invoice) console.log(`    Invoice total (1 month, USD)      $${((invoice.total_amount_cents || 0) / 100).toFixed(2)}`)
  }
  console.log('----------------------------------------------------------------')
  console.log('  OUTPUT FILES')
  if (savedFiles.length === 0) {
    console.log('    (none)')
  } else {
    savedFiles.forEach(f => console.log(`    ${path.basename(f)}`))
  }
  console.log(`  Output directory: ${OUTPUT_DIR}`)
  console.log('================================================================')
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const ids = { quoteId: null, invoiceId: null, payrollRunId: null }
  const savedFiles = []

  try {
    const annualSalary = parseAnnualSalary()

    console.log('\n==========================================================')
    console.log('  EOR FLOW END-TO-END TEST')
    console.log(`  Annual salary: NPR ${annualSalary.toLocaleString()}`)
    console.log(`  Anvil PDF:     ${anvilClient ? 'YES' : 'NO (HTML fallback)'}`)
    console.log('==========================================================\n')

    ensureOutputDir()

    // ── Pre-flight
    console.log('-- Pre-flight ----------------------------------------------------')
    const config = await verifyEorConfig()
    const exchangeRate = parseFloat(config.exchange_rate)
    console.log(`  Config: ${config.country_name} (${config.country_code})`)
    console.log(`  Exchange rate: ${exchangeRate} (~${(1 / exchangeRate).toFixed(0)} NPR/USD)`)
    console.log(`  SSF: employer ${(parseFloat(config.employer_ssf_rate) * 100).toFixed(0)}%, employee ${(parseFloat(config.employee_ssf_rate) * 100).toFixed(0)}%, on ${(parseFloat(config.basic_salary_ratio ?? 0.6) * 100).toFixed(0)}% basic`)
    console.log(`  Platform fee: $${(config.platform_fee_amount / 100).toFixed(2)}/employee/month`)

    // ── Discovery
    console.log('\n-- Discovery -----------------------------------------------------')
    const { orgId, orgName, ownerId, member } = await discoverOrgWithEmployee()
    console.log(`  Org: "${orgName}" (${orgId.substring(0, 8)}...)`)
    console.log(`  Owner: ${ownerId.substring(0, 8)}...`)
    console.log(`  Employee: "${member.name}" (${member.id.substring(0, 8)}...)`)
    console.log(`  Employee DB salary: NPR ${(member.salaryAmount || 0).toLocaleString()} (used for invoice)`)

    const { data: org } = await supabase.from('organizations').select('*').eq('id', orgId).single()

    // ════════════════════════════════════════════════════════════
    // STEP 1: QUOTE
    // ════════════════════════════════════════════════════════════
    console.log('\n-- Step 1: Generate & Accept Quote -------------------------------')

    const quote = await quoteService.generateQuote(ownerId, orgId, {
      salaryAmount: annualSalary,
      salaryCurrency: 'NPR',
      payFrequency: 'monthly',
      countryCode: 'NPL',
      email: member.email || 'test@example.com',
      firstName: member.name.split(' ')[0] || 'Test',
      lastName: member.name.split(' ').slice(1).join(' ') || 'Employee',
      jobTitle: 'Software Engineer',
      department: 'Engineering',
      employmentType: 'full_time',
      startDate: '2099-01-01'
    })
    ids.quoteId = quote.id
    console.log(`  Quote: ${quote.quote_number} (status: ${quote.status})`)
    logQuoteMath(quote, config)

    // Accept
    const accepted = await quoteService.acceptQuote(quote.id, ownerId, {
      termsAcceptedAt: new Date().toISOString()
    })
    console.log(`  Accepted: ${accepted.status}`)

    // Quote PDF
    const quotePath = await generateDocument(
      'Quote PDF', 'quote',
      () => quoteService.generateQuotePdf(quote.id, orgId),
      () => buildQuoteHtml(accepted, org, { full_name: 'Test System', email: 'system@test.local' })
    )
    if (quotePath) savedFiles.push(quotePath)

    // ════════════════════════════════════════════════════════════
    // STEP 2: INVOICE GENERATION
    // ════════════════════════════════════════════════════════════
    console.log('\n-- Step 2: Generate Billing Invoice ------------------------------')
    console.log(`  Period: ${TEST_PERIOD_START} to ${TEST_PERIOD_END}`)
    console.log(`  NOTE: Invoice uses employee DB salary (NPR ${(member.salaryAmount || 0).toLocaleString()}), not CLI arg`)

    const invoice = await invoiceGenerationService.generateInvoiceForOrg(orgId, TEST_PERIOD_START, TEST_PERIOD_END)

    if (!invoice) {
      throw new Error(
        'generateInvoiceForOrg returned null (2099-01 invoice already exists).\n' +
        `Fix: DELETE FROM invoices WHERE billing_period_start='2099-01-01' AND organization_id='${orgId}'`
      )
    }
    ids.invoiceId = invoice.id

    // Refresh to get payroll_run_id
    const { data: inv } = await supabase
      .from('invoices')
      .select('id, invoice_number, payroll_run_id, total_amount_cents, line_items, exchange_rate, config_snapshot')
      .eq('id', invoice.id)
      .single()

    ids.payrollRunId = inv?.payroll_run_id || null

    console.log(`  Invoice: ${inv.invoice_number} ($${((inv.total_amount_cents || 0) / 100).toFixed(2)} USD)`)
    console.log(`  Payroll run: ${ids.payrollRunId ? ids.payrollRunId.substring(0, 8) + '...' : 'NONE'}`)
    console.log(`  Employees billed: ${(inv.line_items || []).length}`)

    // Log math for each line item
    for (const li of inv.line_items || []) {
      logInvoiceLineMath(li, config)
    }

    // ════════════════════════════════════════════════════════════
    // STEP 3: INVOICE PDF
    // ════════════════════════════════════════════════════════════
    console.log('\n-- Step 3: Invoice PDF -------------------------------------------')

    const invWithOrg = { ...inv, organization: org }
    const invPath = await generateDocument(
      'Invoice PDF (detail)', 'invoice',
      () => invoiceGenerationService.generateInvoicePdf(invoice.id, orgId, 'detail'),
      () => buildInvoiceHtml(invWithOrg, org, 'detail')
    )
    if (invPath) savedFiles.push(invPath)

    // ════════════════════════════════════════════════════════════
    // STEP 4: MARK PAID
    // ════════════════════════════════════════════════════════════
    console.log('\n-- Step 4: Mark Invoice Paid -------------------------------------')

    const paidAt = new Date().toISOString()
    const { error: payErr } = await supabase
      .from('invoices')
      .update({ status: 'paid', paid_at: paidAt, updated_at: paidAt })
      .eq('id', invoice.id)

    if (payErr) throw new Error(`Mark paid failed: ${payErr.message}`)
    console.log(`  Marked paid at ${paidAt}`)

    // ════════════════════════════════════════════════════════════
    // STEP 5: RECEIPT PDF
    // ════════════════════════════════════════════════════════════
    console.log('\n-- Step 5: Receipt PDF -------------------------------------------')

    const invPaid = { ...invWithOrg, status: 'paid', paid_at: paidAt }
    const rcptPath = await generateDocument(
      'Receipt PDF', 'receipt',
      () => invoiceGenerationService.generateReceiptPdf(invoice.id, orgId, 'detail'),
      () => buildReceiptHtml(invPaid, org, paidAt, 'detail')
    )
    if (rcptPath) savedFiles.push(rcptPath)

    // ════════════════════════════════════════════════════════════
    // STEP 6: PAYSLIP PDF
    // ════════════════════════════════════════════════════════════
    console.log('\n-- Step 6: Payslip PDF -------------------------------------------')

    if (!ids.payrollRunId) {
      console.log('  SKIPPED (no payroll run)')
    } else {
      const { data: payrollItem } = await supabase
        .from('payroll_items')
        .select('member_id, base_salary, gross_salary, employer_ssf, employee_ssf, deductions, net_amount, payable_days, calendar_days')
        .eq('payroll_run_id', ids.payrollRunId)
        .limit(1)
        .single()

      if (!payrollItem) {
        console.log('  SKIPPED (no payroll items)')
      } else {
        const pmId = payrollItem.member_id
        const period = new Date(TEST_PERIOD_START).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })

        const payslipPath = await generateDocument(
          `Payslip (member ${pmId.substring(0, 8)}...)`, 'payslip',
          () => invoiceGenerationService.generatePayslipPdf(ids.payrollRunId, pmId, orgId),
          () => buildPayslipHtml(
            payrollItem,
            { full_name: member.name, email: member.email, job_title: 'Employee', start_date: '2099-01-01', member_id: pmId },
            org,
            period
          )
        )
        if (payslipPath) savedFiles.push(payslipPath)

        // ══════════════════════════════════════════════════════════
        // STEP 7: PER-EMPLOYEE INVOICE PDF
        // ══════════════════════════════════════════════════════════
        console.log('\n-- Step 7: Per-Employee Invoice PDF ------------------------------')

        const { data: runCheck } = await supabase
          .from('payroll_runs')
          .select('invoice_id')
          .eq('id', ids.payrollRunId)
          .single()

        if (!runCheck?.invoice_id) {
          console.log('  SKIPPED (payroll_runs.invoice_id not linked)')
        } else {
          const memberLi = (inv.line_items || []).find(li => li.member_id === pmId)
          const baseSalaryNPR = parseFloat(payrollItem.base_salary) || 0
          const employerSsfNPR = parseFloat(payrollItem.employer_ssf) || 0
          const severanceLocal = memberLi?.severance_local || 0
          const platformFeeCents = memberLi?.platform_fee_cents || 0
          const ssfLabel = `${(parseFloat(config.employer_ssf_rate) * 100).toFixed(0)}%`
          const basicLabel = `${(parseFloat(config.basic_salary_ratio ?? 0.6) * 100).toFixed(0)}%`

          const perEmpItems = [
            { description: 'Monthly salary', detail: 'Gross salary for January 2099', amountNPR: baseSalaryNPR, amountUSD: Math.round(baseSalaryNPR * exchangeRate * 100) / 100 },
            { description: `Employer SSF (${ssfLabel} of ${basicLabel} basic)`, detail: 'SSF employer contribution', amountNPR: employerSsfNPR, amountUSD: Math.round(employerSsfNPR * exchangeRate * 100) / 100 },
          ]
          if (severanceLocal > 0) {
            const sevNPR = severanceLocal / 100
            perEmpItems.push({ description: 'Severance accrual', detail: 'Monthly severance provision', amountNPR: sevNPR, amountUSD: Math.round(sevNPR * exchangeRate * 100) / 100 })
          }
          if (platformFeeCents > 0) {
            perEmpItems.push({ description: 'EOR platform fee', detail: 'Employer of Record service fee', amountUSD: platformFeeCents / 100 })
          }

          const perEmpTotal = perEmpItems.reduce((s, li) => s + (li.amountUSD || 0), 0)
          const docNumber = `${inv.invoice_number}-E${pmId.substring(0, 4).toUpperCase()}`

          const perEmpPath = await generateDocument(
            'Per-employee invoice', 'per-employee-invoice',
            () => invoiceGenerationService.generatePerEmployeeInvoicePdf(ids.payrollRunId, pmId, orgId),
            () => buildPerEmployeeInvoiceHtml({
              docNumber,
              issueDate: new Date().toISOString().split('T')[0],
              dueDate: '2099-02-01',
              organization: org,
              employee: { name: member.name, jobTitle: 'Employee' },
              period: 'January 1, 2099 to January 31, 2099',
              lineItems: perEmpItems,
              totalDue: perEmpTotal,
              paymentDetails: { exchangeFrom: 'NPR', exchangeTo: 'USD', exchangeRate: exchangeRate.toFixed(7) },
              refNumber: invoice.id.substring(0, 8)
            })
          )
          if (perEmpPath) savedFiles.push(perEmpPath)
        }
      }
    }

    // ════════════════════════════════════════════════════════════
    // CLEANUP + SUMMARY
    // ════════════════════════════════════════════════════════════
    await cleanup(ids)
    printSummary({ annualSalary, config, quote: accepted, invoice: inv, savedFiles })

    console.log('\nAll steps completed successfully.')
    process.exit(0)

  } catch (err) {
    console.error('\nFATAL ERROR:', err.message)
    console.error(err.stack)

    if (ids.quoteId || ids.invoiceId || ids.payrollRunId) {
      console.log('\nAttempting cleanup after failure...')
      await cleanup(ids).catch(e => console.error('Cleanup failed:', e.message))
    }

    process.exit(1)
  }
}

main()
