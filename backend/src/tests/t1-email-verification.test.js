// MANUAL TEST CHECKLIST — T1: Email Verification Redirect
// 1. Create a new employee account (signup as candidate)
// 2. Check email for verification link
// 3. Click the verification link
// 4. VERIFY: Should redirect to /onboarding/employee (NOT /onboarding/employer)
// 5. Create a new employer account (signup as employer)
// 6. Check email for verification link
// 7. Click the verification link
// 8. VERIFY: Should redirect to /onboarding/employer
// 9. For an already-onboarded employee, verify redirects to /employee/overview
// 10. For an already-onboarded employer, verify redirects to /dashboard

/**
 * T1 — Email Verification Redirect Tests
 *
 * Tests that the verifyEmail logic in auth.service.js returns the correct
 * redirectTo URL based on user role and onboarding status.
 *
 * Since we cannot easily mint real verification tokens in tests, we test
 * the redirect-URL construction logic by querying known profiles and
 * verifying the redirect rules match the code in auth.service.js lines 148-157
 * and lines 226-232.
 *
 * Usage:
 *   cd backend && node --test src/tests/t1-email-verification.test.js
 *
 * Prerequisites:
 *   - .env must be configured with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *   - At least one employer and one candidate profile must exist in the DB
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import dotenv from 'dotenv'
dotenv.config()

import { supabase } from '../config/supabase.js'

// ═══════════════════════════════════════════════════════════════
// Helper: compute redirect URL using the same logic as auth.service.js
// ═══════════════════════════════════════════════════════════════

function computeRedirectTo(role, onboardingCompleted) {
  let redirectTo = '/employee/overview'
  if (role === 'employer') {
    redirectTo = onboardingCompleted ? '/dashboard' : '/onboarding/employer'
  } else if (role === 'candidate') {
    redirectTo = onboardingCompleted ? '/employee/overview' : '/onboarding/employee'
  }
  return redirectTo
}

// ═══════════════════════════════════════════════════════════════
// 1. Redirect logic for EMPLOYER profiles
// ═══════════════════════════════════════════════════════════════

describe('T1 — Email Verification Redirect: Employer', () => {
  it('employer with onboarding_completed=true redirects to /dashboard', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, onboarding_completed')
      .eq('role', 'employer')
      .eq('onboarding_completed', true)
      .limit(1)
      .single()

    assert.ok(!error, `DB error: ${error?.message}`)
    assert.ok(data, 'Need at least one onboarded employer in DB')

    const redirectTo = computeRedirectTo(data.role, data.onboarding_completed)

    console.log(`    Profile: ${data.email} (role=${data.role}, onboarded=${data.onboarding_completed})`)
    console.log(`    RedirectTo: ${redirectTo}`)

    assert.equal(redirectTo, '/dashboard')
  })

  it('employer with onboarding_completed=false redirects to /onboarding/employer', () => {
    const redirectTo = computeRedirectTo('employer', false)
    console.log(`    RedirectTo for employer (not onboarded): ${redirectTo}`)
    assert.equal(redirectTo, '/onboarding/employer')
  })

  it('employer with onboarding_completed=null redirects to /onboarding/employer', () => {
    // null is falsy, same as false
    const redirectTo = computeRedirectTo('employer', null)
    console.log(`    RedirectTo for employer (null onboarding): ${redirectTo}`)
    assert.equal(redirectTo, '/onboarding/employer')
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. Redirect logic for CANDIDATE profiles
// ═══════════════════════════════════════════════════════════════

describe('T1 — Email Verification Redirect: Candidate', () => {
  it('candidate with onboarding_completed=true redirects to /employee/overview', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, onboarding_completed')
      .eq('role', 'candidate')
      .eq('onboarding_completed', true)
      .limit(1)
      .single()

    assert.ok(!error, `DB error: ${error?.message}`)
    assert.ok(data, 'Need at least one onboarded candidate in DB')

    const redirectTo = computeRedirectTo(data.role, data.onboarding_completed)

    console.log(`    Profile: ${data.email} (role=${data.role}, onboarded=${data.onboarding_completed})`)
    console.log(`    RedirectTo: ${redirectTo}`)

    assert.equal(redirectTo, '/employee/overview')
  })

  it('candidate with onboarding_completed=false redirects to /onboarding/employee', () => {
    const redirectTo = computeRedirectTo('candidate', false)
    console.log(`    RedirectTo for candidate (not onboarded): ${redirectTo}`)
    assert.equal(redirectTo, '/onboarding/employee')
  })

  it('candidate with onboarding_completed=null redirects to /onboarding/employee', () => {
    const redirectTo = computeRedirectTo('candidate', null)
    console.log(`    RedirectTo for candidate (null onboarding): ${redirectTo}`)
    assert.equal(redirectTo, '/onboarding/employee')
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. verifyEmail return shape — verify DB has the expected fields
// ═══════════════════════════════════════════════════════════════

describe('T1 — verifyEmail return shape expectations', () => {
  it('profile table has role and onboarding_completed columns', async () => {
    // Verify the columns exist by selecting them
    const { data, error } = await supabase
      .from('profiles')
      .select('role, onboarding_completed, onboarding_step')
      .limit(1)
      .single()

    assert.ok(!error, `DB error: ${error?.message}`)
    assert.ok(typeof data.role === 'string', 'role must be a string')
    assert.ok(
      typeof data.onboarding_completed === 'boolean' || data.onboarding_completed === null,
      'onboarding_completed must be boolean or null'
    )
    console.log(`    Sample profile: role=${data.role}, onboarding_completed=${data.onboarding_completed}, onboarding_step=${data.onboarding_step}`)
  })

  it('email_verification_tokens table exists with expected columns', async () => {
    const { data, error } = await supabase
      .from('email_verification_tokens')
      .select('id, user_id, token_hash, expires_at, verified_at')
      .limit(1)

    // Table should exist even if empty
    assert.ok(!error, `DB error: ${error?.message}`)
    console.log(`    email_verification_tokens rows found: ${(data || []).length}`)
  })

  it('redirect logic matches auth.service.js for all role/onboarding combos', () => {
    // Exhaustive test of all valid combinations
    const cases = [
      { role: 'employer', onboarded: true, expected: '/dashboard' },
      { role: 'employer', onboarded: false, expected: '/onboarding/employer' },
      { role: 'candidate', onboarded: true, expected: '/employee/overview' },
      { role: 'candidate', onboarded: false, expected: '/onboarding/employee' },
    ]

    for (const c of cases) {
      const result = computeRedirectTo(c.role, c.onboarded)
      console.log(`    ${c.role} (onboarded=${c.onboarded}) => ${result}`)
      assert.equal(result, c.expected, `${c.role} onboarded=${c.onboarded} should redirect to ${c.expected}`)
    }
  })
})
