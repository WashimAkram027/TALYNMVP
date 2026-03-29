// MANUAL TEST CHECKLIST — T3: Admin Dashboard Pending Onboarding
// 1. Open admin panel (localhost:5174)
// 2. Login as admin
// 3. VERIFY: Dashboard shows "Pending Onboardings" metric card
// 4. VERIFY: Count matches number of invited/onboarding members in DB
// 5. VERIFY: Pending onboardings table shows below metrics
// 6. VERIFY: Each row shows member email, org name, status, days waiting
// 7. VERIFY: "View" link navigates to member detail page
// 8. VERIFY: Stale invitations (>7 days) show warning icon

/**
 * T3 — Admin Dashboard: Pending Onboarding Visibility Tests
 *
 * Tests the adminDashboardService methods: getMetrics, getAlerts,
 * and getPendingOnboardings to verify pending onboarding data
 * is correctly surfaced in the admin dashboard.
 *
 * Usage:
 *   cd backend && node --test src/tests/t3-admin-pending-onboarding.test.js
 *
 * Prerequisites:
 *   - .env must be configured with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import dotenv from 'dotenv'
dotenv.config()

import { supabase } from '../config/supabase.js'
import { adminDashboardService } from '../services/admin/dashboard.service.js'

// ═══════════════════════════════════════════════════════════════
// 1. Metrics include pending onboarding counts
// ═══════════════════════════════════════════════════════════════

describe('T3 — Dashboard Metrics', () => {
  let metrics = null

  it('getMetrics returns expected metric fields', async () => {
    metrics = await adminDashboardService.getMetrics()

    console.log('    Metrics:', JSON.stringify(metrics, null, 2))

    assert.ok(typeof metrics === 'object', 'metrics should be an object')
    assert.ok(typeof metrics.totalOrgs === 'number', 'totalOrgs must be a number')
    assert.ok(typeof metrics.totalUsers === 'number', 'totalUsers must be a number')
    assert.ok(typeof metrics.activeMembers === 'number', 'activeMembers must be a number')
    assert.ok(typeof metrics.pendingPayrollRuns === 'number', 'pendingPayrollRuns must be a number')
    assert.ok(typeof metrics.payrollVolumeMtd === 'number', 'payrollVolumeMtd must be a number')
  })

  it('pendingOnboardings count is a number >= 0', async () => {
    if (!metrics) metrics = await adminDashboardService.getMetrics()

    console.log(`    pendingOnboardings: ${metrics.pendingOnboardings}`)
    assert.ok(typeof metrics.pendingOnboardings === 'number', 'pendingOnboardings must be a number')
    assert.ok(metrics.pendingOnboardings >= 0, 'pendingOnboardings must be >= 0')
  })

  it('invitedMembers count is a number >= 0', async () => {
    if (!metrics) metrics = await adminDashboardService.getMetrics()

    console.log(`    invitedMembers: ${metrics.invitedMembers}`)
    assert.ok(typeof metrics.invitedMembers === 'number', 'invitedMembers must be a number')
    assert.ok(metrics.invitedMembers >= 0, 'invitedMembers must be >= 0')
  })

  it('staleInvitations count is a number >= 0', async () => {
    if (!metrics) metrics = await adminDashboardService.getMetrics()

    console.log(`    staleInvitations: ${metrics.staleInvitations}`)
    assert.ok(typeof metrics.staleInvitations === 'number', 'staleInvitations must be a number')
    assert.ok(metrics.staleInvitations >= 0, 'staleInvitations must be >= 0')
  })

  it('pendingOnboardings >= invitedMembers (invited is subset of pending)', async () => {
    if (!metrics) metrics = await adminDashboardService.getMetrics()

    console.log(`    pendingOnboardings (${metrics.pendingOnboardings}) >= invitedMembers (${metrics.invitedMembers})`)
    assert.ok(
      metrics.pendingOnboardings >= metrics.invitedMembers,
      'pendingOnboardings (invited+onboarding) should be >= invitedMembers (invited only)'
    )
  })

  it('staleInvitations <= invitedMembers', async () => {
    if (!metrics) metrics = await adminDashboardService.getMetrics()

    console.log(`    staleInvitations (${metrics.staleInvitations}) <= invitedMembers (${metrics.invitedMembers})`)
    assert.ok(
      metrics.staleInvitations <= metrics.invitedMembers,
      'staleInvitations (>7 days) should be <= total invitedMembers'
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. getPendingOnboardings returns correct data structure
// ═══════════════════════════════════════════════════════════════

describe('T3 — getPendingOnboardings', () => {
  it('returns an array with correct shape', async () => {
    const results = await adminDashboardService.getPendingOnboardings()

    console.log(`    Pending onboardings count: ${results.length}`)
    assert.ok(Array.isArray(results), 'should return an array')

    if (results.length > 0) {
      const item = results[0]
      console.log('    First item:', JSON.stringify(item, null, 2))

      // Check required fields exist
      assert.ok('id' in item, 'item must have id')
      assert.ok('status' in item, 'item must have status')
      assert.ok('organizationId' in item, 'item must have organizationId')
      assert.ok('invitedAt' in item, 'item must have invitedAt')
      assert.ok('daysSinceInvited' in item, 'item must have daysSinceInvited')

      // Check at least email or name is present
      assert.ok(
        item.email || item.name,
        'item must have either email or name'
      )

      // Check status is valid
      assert.ok(
        ['invited', 'onboarding'].includes(item.status),
        `status must be 'invited' or 'onboarding', got: ${item.status}`
      )

      // daysSinceInvited should be a non-negative number (or null if no invited_at)
      if (item.daysSinceInvited !== null) {
        assert.ok(typeof item.daysSinceInvited === 'number', 'daysSinceInvited must be a number')
        assert.ok(item.daysSinceInvited >= 0, 'daysSinceInvited must be >= 0')
      }
    } else {
      console.log('    No pending onboardings found — all checks pass vacuously')
    }
  })

  it('each item status is either invited or onboarding', async () => {
    const results = await adminDashboardService.getPendingOnboardings()

    for (const item of results) {
      assert.ok(
        ['invited', 'onboarding'].includes(item.status),
        `Item ${item.id} has invalid status: ${item.status}`
      )
    }

    console.log(`    All ${results.length} items have valid status`)
  })

  it('count matches metrics.pendingOnboardings (within limit of 50)', async () => {
    const [results, metrics] = await Promise.all([
      adminDashboardService.getPendingOnboardings(),
      adminDashboardService.getMetrics()
    ])

    console.log(`    getPendingOnboardings returned: ${results.length}`)
    console.log(`    metrics.pendingOnboardings: ${metrics.pendingOnboardings}`)

    if (metrics.pendingOnboardings <= 50) {
      assert.equal(
        results.length,
        metrics.pendingOnboardings,
        'List length should match metric count (when <= limit of 50)'
      )
    } else {
      // getPendingOnboardings has a LIMIT 50
      assert.equal(results.length, 50, 'Should cap at 50 results')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. getAlerts includes stale invitations
// ═══════════════════════════════════════════════════════════════

describe('T3 — Alerts: Stale Invitations', () => {
  it('getAlerts returns an array', async () => {
    const alerts = await adminDashboardService.getAlerts()

    console.log(`    Total alerts: ${alerts.length}`)
    assert.ok(Array.isArray(alerts), 'should return an array')
  })

  it('alerts have correct structure', async () => {
    const alerts = await adminDashboardService.getAlerts()

    if (alerts.length > 0) {
      const alert = alerts[0]
      console.log('    First alert:', JSON.stringify(alert, null, 2))

      assert.ok('type' in alert, 'alert must have type')
      assert.ok('severity' in alert, 'alert must have severity')
      assert.ok('title' in alert, 'alert must have title')
      assert.ok('description' in alert, 'alert must have description')
      assert.ok('link' in alert, 'alert must have link')

      // Severity must be one of the known values
      assert.ok(
        ['danger', 'warning', 'info'].includes(alert.severity),
        `severity must be danger/warning/info, got: ${alert.severity}`
      )
    } else {
      console.log('    No alerts — checks pass vacuously')
    }
  })

  it('stale invitation alerts have type=stale_invitation', async () => {
    const alerts = await adminDashboardService.getAlerts()
    const staleAlerts = alerts.filter(a => a.type === 'stale_invitation')

    console.log(`    Stale invitation alerts: ${staleAlerts.length}`)

    for (const alert of staleAlerts) {
      assert.equal(alert.type, 'stale_invitation')
      assert.equal(alert.severity, 'warning')
      assert.ok(alert.title.includes('Stale invitation'), `Title should mention stale invitation: ${alert.title}`)
      assert.ok(alert.link.startsWith('/members/'), `Link should point to member detail: ${alert.link}`)
      console.log(`    - ${alert.title}: ${alert.description}`)
    }
  })

  it('alerts are sorted by severity (danger first, then warning, then info)', async () => {
    const alerts = await adminDashboardService.getAlerts()

    if (alerts.length > 1) {
      const severityOrder = { danger: 0, warning: 1, info: 2 }
      for (let i = 1; i < alerts.length; i++) {
        const prevOrder = severityOrder[alerts[i - 1].severity] ?? 2
        const currOrder = severityOrder[alerts[i].severity] ?? 2
        assert.ok(
          prevOrder <= currOrder,
          `Alert at index ${i} (${alerts[i].severity}) should not come before ${alerts[i - 1].severity}`
        )
      }
      console.log('    Alerts are correctly sorted by severity')
    } else {
      console.log('    Not enough alerts to verify sort order')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. Cross-check: DB counts vs service counts
// ═══════════════════════════════════════════════════════════════

describe('T3 — DB Cross-Check', () => {
  it('invited+onboarding count in DB matches service metric', async () => {
    // Direct DB count
    const { count: dbCount } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .in('status', ['invited', 'onboarding'])

    // Service metric
    const metrics = await adminDashboardService.getMetrics()

    console.log(`    DB count (invited+onboarding): ${dbCount}`)
    console.log(`    Service pendingOnboardings: ${metrics.pendingOnboardings}`)

    assert.equal(metrics.pendingOnboardings, dbCount, 'Service count should match raw DB count')
  })

  it('stale invitations count matches DB query', async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { count: dbCount } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'invited')
      .lt('invited_at', sevenDaysAgo)

    const metrics = await adminDashboardService.getMetrics()

    console.log(`    DB stale invited count: ${dbCount}`)
    console.log(`    Service staleInvitations: ${metrics.staleInvitations}`)

    assert.equal(metrics.staleInvitations, dbCount, 'Service stale count should match raw DB count')
  })
})
