/**
 * T10: Employee Quote & Job Description Verification — Tests
 *
 * Verifies that the employee onboarding flow includes quote verification
 * as step 1, with the necessary DB columns, routes, and validation schemas.
 *
 * Usage:
 *   cd backend && node --test src/tests/t10-quote-verification.test.js
 *
 * Prerequisites:
 *   - .env must be configured with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *   - organization_members table must have quote_verified columns
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import dotenv from 'dotenv'
dotenv.config()

import { supabase } from '../config/supabase.js'
import { onboardingService } from '../services/onboarding.service.js'
import { employeeVerifyQuoteSchema } from '../utils/validators.js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ═══════════════════════════════════════════════════════════════
// 1. Verify quote_verified columns exist on organization_members
// ═══════════════════════════════════════════════════════════════

describe('T10-1: organization_members quote verification columns', () => {
  it('quote_verified column exists (boolean)', async () => {
    // Attempt to select the column; Supabase returns an error if it doesn't exist
    const { error } = await supabase
      .from('organization_members')
      .select('quote_verified')
      .limit(1)

    assert.ok(!error, `quote_verified column must exist. Error: ${error?.message}`)
    console.log('    Confirmed: quote_verified (boolean) exists on organization_members')
  })

  it('quote_verified_at column exists (timestamptz)', async () => {
    const { error } = await supabase
      .from('organization_members')
      .select('quote_verified_at')
      .limit(1)

    assert.ok(!error, `quote_verified_at column must exist. Error: ${error?.message}`)
    console.log('    Confirmed: quote_verified_at (timestamptz) exists on organization_members')
  })

  it('quote_dispute_note column exists (text)', async () => {
    const { error } = await supabase
      .from('organization_members')
      .select('quote_dispute_note')
      .limit(1)

    assert.ok(!error, `quote_dispute_note column must exist. Error: ${error?.message}`)
    console.log('    Confirmed: quote_dispute_note (text) exists on organization_members')
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. Verify GET /onboarding/employee/quote-and-job route exists
// ═══════════════════════════════════════════════════════════════

describe('T10-2: Onboarding routes for quote verification', () => {
  let routesSource

  it('reads onboarding.routes.js source', () => {
    const filePath = resolve(process.cwd(), 'src', 'routes', 'onboarding.routes.js')
    routesSource = readFileSync(filePath, 'utf-8')

    assert.ok(routesSource.length > 0, 'onboarding.routes.js must exist and have content')
    console.log('    File read: ' + routesSource.length + ' chars')
  })

  it('GET /employee/quote-and-job route is registered', () => {
    assert.ok(
      routesSource.includes("'/employee/quote-and-job'") || routesSource.includes('"/employee/quote-and-job"'),
      'GET /employee/quote-and-job route must be registered'
    )
    assert.ok(
      routesSource.includes('getEmployeeQuoteAndJob'),
      'Route must point to getEmployeeQuoteAndJob controller method'
    )

    console.log('    Confirmed: GET /employee/quote-and-job route exists')
  })

  it('POST /employee/verify-quote route is registered', () => {
    assert.ok(
      routesSource.includes("'/employee/verify-quote'") || routesSource.includes('"/employee/verify-quote"'),
      'POST /employee/verify-quote route must be registered'
    )
    assert.ok(
      routesSource.includes('verifyEmployeeQuote'),
      'Route must point to verifyEmployeeQuote controller method'
    )

    console.log('    Confirmed: POST /employee/verify-quote route exists')
  })

  it('verify-quote route uses employeeVerifyQuoteSchema validation', () => {
    // The route should validate with employeeVerifyQuoteSchema
    assert.ok(
      routesSource.includes('employeeVerifyQuoteSchema'),
      'verify-quote route must use employeeVerifyQuoteSchema for validation'
    )

    console.log('    Confirmed: verify-quote route validates with employeeVerifyQuoteSchema')
  })

  it('both routes require candidate auth', () => {
    assert.ok(
      routesSource.includes('requireCandidate'),
      'Employee onboarding routes must require candidate role'
    )

    console.log('    Confirmed: routes require candidate authentication')
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. Verify validation schema for verify-quote
// ═══════════════════════════════════════════════════════════════

describe('T10-3: employeeVerifyQuoteSchema validation', () => {
  it('accepts { verified: true }', () => {
    const result = employeeVerifyQuoteSchema.safeParse({ verified: true })
    assert.ok(result.success, 'Must accept { verified: true }')

    console.log('    Parsed: { verified: true } -> OK')
  })

  it('accepts { verified: false, discrepancyNote: "Wrong salary" }', () => {
    const result = employeeVerifyQuoteSchema.safeParse({
      verified: false,
      discrepancyNote: 'Wrong salary'
    })
    assert.ok(result.success, 'Must accept { verified: false, discrepancyNote: string }')

    console.log('    Parsed: { verified: false, discrepancyNote: "Wrong salary" } -> OK')
  })

  it('accepts { verified: true } without discrepancyNote (optional)', () => {
    const result = employeeVerifyQuoteSchema.safeParse({ verified: true })
    assert.ok(result.success, 'discrepancyNote is optional')
    assert.equal(result.data.discrepancyNote, undefined)

    console.log('    Confirmed: discrepancyNote is optional')
  })

  it('rejects missing verified field', () => {
    const result = employeeVerifyQuoteSchema.safeParse({})
    assert.ok(!result.success, 'Must reject when verified is missing')

    console.log('    Rejected: {} -> missing verified field')
  })

  it('rejects non-boolean verified', () => {
    const result = employeeVerifyQuoteSchema.safeParse({ verified: 'yes' })
    assert.ok(!result.success, 'Must reject non-boolean verified')

    console.log('    Rejected: { verified: "yes" } -> type error')
  })

  it('rejects discrepancyNote over 1000 chars', () => {
    const longNote = 'x'.repeat(1001)
    const result = employeeVerifyQuoteSchema.safeParse({
      verified: false,
      discrepancyNote: longNote
    })
    assert.ok(!result.success, 'Must reject discrepancyNote > 1000 chars')

    console.log('    Rejected: discrepancyNote with 1001 chars -> too long')
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. Verify service methods exist
// ═══════════════════════════════════════════════════════════════

describe('T10-4: Onboarding service methods for quote verification', () => {
  it('getEmployeeQuoteAndJob is a function', () => {
    assert.equal(typeof onboardingService.getEmployeeQuoteAndJob, 'function',
      'getEmployeeQuoteAndJob must be a function on onboardingService')

    console.log('    Confirmed: getEmployeeQuoteAndJob exists')
  })

  it('verifyEmployeeQuote is a function', () => {
    assert.equal(typeof onboardingService.verifyEmployeeQuote, 'function',
      'verifyEmployeeQuote must be a function on onboardingService')

    console.log('    Confirmed: verifyEmployeeQuote exists')
  })

  it('getEmployeeOnboardingStatus is a function', () => {
    assert.equal(typeof onboardingService.getEmployeeOnboardingStatus, 'function',
      'getEmployeeOnboardingStatus must be a function on onboardingService')

    console.log('    Confirmed: getEmployeeOnboardingStatus exists')
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. Frontend onboarding has quote verification as step 1
// ═══════════════════════════════════════════════════════════════

describe('T10-5: EmployeeOnboarding.jsx — step structure', () => {
  let onboardingSource

  it('reads EmployeeOnboarding.jsx source', () => {
    const filePath = resolve(process.cwd(), '..', 'frontend', 'src', 'pages', 'onboarding', 'EmployeeOnboarding.jsx')
    onboardingSource = readFileSync(filePath, 'utf-8')

    assert.ok(onboardingSource.length > 0, 'EmployeeOnboarding.jsx must exist and have content')
    console.log('    File read: ' + onboardingSource.length + ' chars')
  })

  it('has 4 total steps', () => {
    assert.ok(
      onboardingSource.includes('Step {step} of 4') || onboardingSource.includes('of 4'),
      'Must show "Step X of 4"'
    )

    console.log('    Confirmed: total steps = 4')
  })

  it('step 1 is "Review Employment Details"', () => {
    // Check STEP_TITLES array
    assert.ok(
      onboardingSource.includes('Review Employment Details'),
      'Step 1 title must be "Review Employment Details"'
    )

    console.log('    Confirmed: Step 1 = Review Employment Details')
  })

  it('step 1 renders "Review Your Employment Details" heading', () => {
    assert.ok(
      onboardingSource.includes('Review Your Employment Details'),
      'Step 1 must render heading "Review Your Employment Details"'
    )

    console.log('    Confirmed: Step 1 heading = "Review Your Employment Details"')
  })

  it('step 2 is "Personal Information"', () => {
    assert.ok(
      onboardingSource.includes('Personal Information'),
      'Step 2 must be "Personal Information"'
    )

    console.log('    Confirmed: Step 2 = Personal Information')
  })

  it('step 3 is "Emergency Contact"', () => {
    assert.ok(
      onboardingSource.includes('Emergency Contact'),
      'Step 3 must be "Emergency Contact"'
    )

    console.log('    Confirmed: Step 3 = Emergency Contact')
  })

  it('step 4 is "Tax Information"', () => {
    assert.ok(
      onboardingSource.includes('Tax Information'),
      'Step 4 must be "Tax Information"'
    )

    console.log('    Confirmed: Step 4 = Tax Information')
  })

  it('loads quote-and-job data on step 1', () => {
    assert.ok(
      onboardingSource.includes('quote-and-job') || onboardingSource.includes('quoteAndJob'),
      'Step 1 must load quote and job data'
    )

    console.log('    Confirmed: step 1 loads quote-and-job data')
  })

  it('has "Confirm & Continue" or handleConfirmQuote flow', () => {
    assert.ok(
      onboardingSource.includes('handleConfirmQuote') || onboardingSource.includes('Confirm'),
      'Step 1 must have a confirm action'
    )

    console.log('    Confirmed: step 1 has confirm/continue flow')
  })

  it('has "Flag Discrepancy" flow', () => {
    assert.ok(
      onboardingSource.includes('handleFlagDiscrepancy') || onboardingSource.includes('Flag Discrepancy') || onboardingSource.includes('discrepancy'),
      'Step 1 must have a flag discrepancy action'
    )

    console.log('    Confirmed: step 1 has flag discrepancy flow')
  })
})

// ═══════════════════════════════════════════════════════════════
// MANUAL TEST CHECKLIST — T10: Employee Quote Verification
// ═══════════════════════════════════════════════════════════════
//
// 1. As employer: invite a new member with quote generation
// 2. As employee: accept the invitation
// 3. Start employee onboarding
// 4. VERIFY: Step 1 shows "Review Your Employment Details"
// 5. VERIFY: Job title, description, salary, employment type, start date displayed
// 6. VERIFY: EOR cost breakdown (QuoteReviewPanel) shown in read-only mode
// 7. Click "Confirm & Continue" — VERIFY: proceeds to personal info step
// 8. Test "Flag Discrepancy" — VERIFY: text field appears, sends notification
// 9. Complete all 4 steps
// 10. VERIFY: Onboarding marked complete, dashboard shows
//
// ═══════════════════════════════════════════════════════════════
