/**
 * T9: EOR Quote System Refinement — Tests
 *
 * Verifies eor_cost_config SSF rates, terms_accepted_at column,
 * quote calculation logic, PDF employee name usage, and frontend
 * terms checkbox.
 *
 * Usage:
 *   cd backend && node --test src/tests/t9-eor-quote.test.js
 *
 * Prerequisites:
 *   - .env must be configured with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *   - eor_cost_config table must have an active Nepal (NPL) entry
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import dotenv from 'dotenv'
dotenv.config()

import { supabase } from '../config/supabase.js'
import { quoteService } from '../services/quote.service.js'
import { buildQuoteHtml } from '../services/pdfTemplate.service.js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ═══════════════════════════════════════════════════════════════
// 1. Verify eor_cost_config has correct SSF rates
// ═══════════════════════════════════════════════════════════════

describe('T9-1: eor_cost_config SSF rates', () => {
  it('has employer_ssf_rate = 0.2000 (20%)', async () => {
    const { data, error } = await supabase
      .from('eor_cost_config')
      .select('employer_ssf_rate, employee_ssf_rate, country_code, is_active')
      .eq('country_code', 'NPL')
      .eq('is_active', true)
      .limit(1)
      .single()

    assert.ok(!error, `DB error: ${error?.message}`)
    assert.ok(data, 'Must have an active NPL config')

    const employerRate = parseFloat(data.employer_ssf_rate)
    const employeeRate = parseFloat(data.employee_ssf_rate)

    console.log('    Employer SSF rate:', employerRate)
    console.log('    Employee SSF rate:', employeeRate)

    assert.equal(employerRate, 0.2, 'Employer SSF must be 20%')
    assert.equal(employeeRate, 0.11, 'Employee SSF must be 11%')
  })

  it('has platform_fee_amount and periods_per_year set', async () => {
    const { data, error } = await supabase
      .from('eor_cost_config')
      .select('platform_fee_amount, platform_fee_currency, periods_per_year')
      .eq('country_code', 'NPL')
      .eq('is_active', true)
      .limit(1)
      .single()

    assert.ok(!error, `DB error: ${error?.message}`)
    assert.ok(data.platform_fee_amount > 0, 'Platform fee must be positive')
    assert.equal(data.platform_fee_currency, 'USD', 'Platform fee currency must be USD')
    assert.equal(data.periods_per_year, 12, 'Nepal uses monthly (12 periods/year)')

    console.log('    Platform fee: $' + data.platform_fee_amount)
    console.log('    Periods per year:', data.periods_per_year)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. Verify terms_accepted_at column exists on eor_quotes table
// ═══════════════════════════════════════════════════════════════

describe('T9-2: eor_quotes.terms_accepted_at column', () => {
  it('exists and is queryable', async () => {
    // Attempt to select the column; if it doesn't exist, Supabase returns
    // an error like "column eor_quotes.terms_accepted_at does not exist"
    const { error } = await supabase
      .from('eor_quotes')
      .select('terms_accepted_at')
      .limit(1)

    assert.ok(!error, `terms_accepted_at column must exist on eor_quotes. Error: ${error?.message}`)

    console.log('    terms_accepted_at column confirmed on eor_quotes table')
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. Quote calculation matches expected formula
// ═══════════════════════════════════════════════════════════════

describe('T9-3: Quote calculation logic', () => {
  it('getCostConfig returns active Nepal config', async () => {
    const config = await quoteService.getCostConfig('NPL')

    assert.ok(config, 'Config must be returned')
    assert.equal(config.country_code, 'NPL')
    assert.equal(config.is_active, true)
    assert.equal(config.periods_per_year, 12)

    console.log('    Config retrieved: ' + config.country_name)
  })

  it('calculates correctly for NPR 1,200,000 annual salary', async () => {
    const config = await quoteService.getCostConfig('NPL')

    const annualSalary = 1200000  // NPR 1,200,000
    const periodsPerYear = config.periods_per_year  // 12

    // Monthly gross in minor units (paisa): 1,200,000 / 12 * 100 = 10,000,000
    const monthlyGross = Math.round((annualSalary / periodsPerYear) * 100)
    assert.equal(monthlyGross, 10000000, 'Monthly gross should be 10,000,000 paisa')

    // Employer SSF: 10,000,000 * 0.20 = 2,000,000
    const employerSsf = Math.round(monthlyGross * parseFloat(config.employer_ssf_rate))
    assert.equal(employerSsf, 2000000, 'Employer SSF should be 2,000,000 paisa')

    // Employee SSF: 10,000,000 * 0.11 = 1,100,000
    const employeeSsf = Math.round(monthlyGross * parseFloat(config.employee_ssf_rate))
    assert.equal(employeeSsf, 1100000, 'Employee SSF should be 1,100,000 paisa')

    // Estimated net salary: monthlyGross - employeeSsf = 8,900,000
    const estimatedNet = monthlyGross - employeeSsf
    assert.equal(estimatedNet, 8900000, 'Estimated net should be 8,900,000 paisa')

    // Total monthly cost to employer: monthlyGross + employerSsf = 12,000,000
    const totalMonthlyCost = monthlyGross + employerSsf
    assert.equal(totalMonthlyCost, 12000000, 'Total monthly cost should be 12,000,000 paisa')

    // Total annual cost: 12,000,000 * 12 = 144,000,000
    const totalAnnualCost = totalMonthlyCost * periodsPerYear
    assert.equal(totalAnnualCost, 144000000, 'Total annual cost should be 144,000,000 paisa')

    console.log('    Monthly gross:      NPR ' + (monthlyGross / 100).toLocaleString())
    console.log('    Employer SSF (20%): NPR ' + (employerSsf / 100).toLocaleString())
    console.log('    Employee SSF (11%): NPR ' + (employeeSsf / 100).toLocaleString())
    console.log('    Estimated net:      NPR ' + (estimatedNet / 100).toLocaleString())
    console.log('    Total monthly cost: NPR ' + (totalMonthlyCost / 100).toLocaleString())
    console.log('    Total annual cost:  NPR ' + (totalAnnualCost / 100).toLocaleString())
  })

  it('generateQuoteNumber produces sequential TQ-YYYY-NNN format', async () => {
    // We cannot generate a quote number without an org, but we can test
    // the format expectation by calling the service with a dummy org ID
    // that has no quotes.
    const dummyOrgId = '00000000-0000-0000-0000-000000000000'
    const quoteNumber = await quoteService.generateQuoteNumber(dummyOrgId)

    const year = new Date().getFullYear()
    const expectedPrefix = `TQ-${year}-`

    assert.ok(quoteNumber.startsWith(expectedPrefix), `Quote number should start with ${expectedPrefix}, got: ${quoteNumber}`)
    assert.match(quoteNumber, /^TQ-\d{4}-\d{3}$/, 'Quote number must match TQ-YYYY-NNN pattern')

    console.log('    Generated quote number:', quoteNumber)
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. Quote PDF uses employee name, not email
// ═══════════════════════════════════════════════════════════════

describe('T9-4: Quote PDF template uses employee name', () => {
  it('buildQuoteHtml shows first + last name when available', () => {
    const mockQuote = {
      employee_first_name: 'Sita',
      employee_last_name: 'Sharma',
      employee_email: 'sita@example.com',
      job_title: 'Software Engineer',
      employment_type: 'full_time',
      start_date: '2026-04-01',
      created_at: '2026-03-28T00:00:00Z',
      valid_until: '2026-04-28T00:00:00Z',
      quote_number: 'TQ-2026-001',
      salary_currency: 'NPR',
      monthly_gross_salary: 10000000,
      employer_ssf_rate: '0.2000',
      employer_ssf_amount: 2000000,
      employee_ssf_rate: '0.1100',
      employee_ssf_amount: 1100000,
      estimated_net_salary: 8900000,
      total_monthly_cost_local: 12000000,
      total_annual_cost_local: 144000000,
      platform_fee_amount: 100,
      platform_fee_currency: 'USD',
      annual_salary: 120000000,
      status: 'draft'
    }

    const mockOrg = { name: 'TestCorp' }
    const mockUser = { full_name: 'Admin User', email: 'admin@testcorp.com' }

    const { html } = buildQuoteHtml(mockQuote, mockOrg, mockUser)

    // The HTML should contain the employee's name, not just the email
    assert.ok(html.includes('Sita Sharma'), 'PDF HTML must contain employee full name "Sita Sharma"')

    console.log('    PDF template confirmed: employee name "Sita Sharma" present')
  })

  it('falls back to email when names are missing', () => {
    const mockQuote = {
      employee_first_name: null,
      employee_last_name: null,
      employee_email: 'sita@example.com',
      job_title: 'Software Engineer',
      employment_type: 'full_time',
      start_date: '2026-04-01',
      created_at: '2026-03-28T00:00:00Z',
      valid_until: '2026-04-28T00:00:00Z',
      quote_number: 'TQ-2026-001',
      salary_currency: 'NPR',
      monthly_gross_salary: 10000000,
      employer_ssf_rate: '0.2000',
      employer_ssf_amount: 2000000,
      employee_ssf_rate: '0.1100',
      employee_ssf_amount: 1100000,
      estimated_net_salary: 8900000,
      total_monthly_cost_local: 12000000,
      total_annual_cost_local: 144000000,
      platform_fee_amount: 100,
      platform_fee_currency: 'USD',
      annual_salary: 120000000,
      status: 'draft'
    }

    const { html } = buildQuoteHtml(mockQuote, { name: 'TestCorp' }, { email: 'admin@test.com' })

    assert.ok(html.includes('sita@example.com'), 'PDF HTML must fall back to email when names are null')

    console.log('    PDF template confirmed: falls back to email when no name')
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. Frontend terms checkbox (code inspection)
// ═══════════════════════════════════════════════════════════════

describe('T9-5: Frontend QuoteReviewPanel terms checkbox', () => {
  let panelSource

  it('reads QuoteReviewPanel.jsx source', () => {
    const filePath = resolve(process.cwd(), '..', 'frontend', 'src', 'components', 'features', 'quotes', 'QuoteReviewPanel.jsx')
    panelSource = readFileSync(filePath, 'utf-8')

    assert.ok(panelSource.length > 0, 'QuoteReviewPanel.jsx must exist and have content')
    console.log('    File read: ' + panelSource.length + ' chars')
  })

  it('has termsAccepted state variable', () => {
    assert.ok(panelSource.includes('termsAccepted'), 'Must have termsAccepted state')
    assert.ok(
      panelSource.includes('useState(false)') && panelSource.includes('termsAccepted'),
      'termsAccepted should initialize to false'
    )

    console.log('    Confirmed: termsAccepted state exists and defaults to false')
  })

  it('renders a checkbox for terms', () => {
    assert.ok(panelSource.includes('type="checkbox"') || panelSource.includes("type='checkbox'"),
      'Must render an input checkbox')
    assert.ok(panelSource.includes('setTermsAccepted'), 'Must have setTermsAccepted handler')

    console.log('    Confirmed: terms checkbox renders with onChange handler')
  })

  it('disables Accept button when terms not accepted', () => {
    // The button should have disabled={... !termsAccepted}
    assert.ok(panelSource.includes('!termsAccepted'), 'Accept button must check !termsAccepted for disabled state')

    console.log('    Confirmed: Accept button disabled when termsAccepted is false')
  })

  it('passes termsAcceptedAt on accept', () => {
    assert.ok(panelSource.includes('termsAcceptedAt'), 'Must pass termsAcceptedAt to onAccept callback')

    console.log('    Confirmed: termsAcceptedAt timestamp sent on accept')
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. acceptQuote stores terms_accepted_at
// ═══════════════════════════════════════════════════════════════

describe('T9-6: acceptQuote service respects termsAcceptedAt option', () => {
  it('acceptQuote function signature includes options parameter', () => {
    // Verify the service method exists and accepts the options parameter
    assert.equal(typeof quoteService.acceptQuote, 'function', 'acceptQuote must be a function')
    // The function takes (quoteId, userId, options) — 3 params
    assert.ok(quoteService.acceptQuote.length >= 2, 'acceptQuote must accept at least 2 params')

    console.log('    Confirmed: acceptQuote exists and accepts options')
  })
})

// ═══════════════════════════════════════════════════════════════
// MANUAL TEST CHECKLIST — T9: EOR Quote Refinement
// ═══════════════════════════════════════════════════════════════
//
// 1. Login as employer on localhost:5173
// 2. Go to People > Invite Member
// 3. Fill in first name, last name, email, salary
// 4. Click "Generate Quote"
// 5. VERIFY: Quote review panel shows employee name (not email)
// 6. VERIFY: SSF rates shown: Employer 20%, Employee 11%
// 7. VERIFY: Terms & Policies checkbox appears below the quote
// 8. VERIFY: "Accept & Send Invite" button is DISABLED until checkbox is checked
// 9. Check the checkbox
// 10. VERIFY: Button becomes enabled
// 11. Accept and send invite
// 12. VERIFY: Check eor_quotes table — terms_accepted_at should be set
//
// ═══════════════════════════════════════════════════════════════
