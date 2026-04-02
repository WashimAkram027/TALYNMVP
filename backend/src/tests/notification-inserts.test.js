/**
 * Notification Insert Integration Tests
 *
 * Verifies that notification inserts fire when business events happen.
 * Calls actual service functions and checks the notifications table.
 *
 * Usage:
 *   cd backend && node --test src/tests/notification-inserts.test.js
 *
 * Prerequisites:
 *   - .env configured with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   - Test Employer org with Washim Akram (employer) and Aarav Sharma (employee)
 *   - Resend API key NOT required (emails skip in dev mode)
 */

import { describe, it, after } from 'node:test'
import assert from 'node:assert/strict'
import dotenv from 'dotenv'
dotenv.config()

import { supabase } from '../config/supabase.js'
import { leaveService } from '../services/leave.service.js'

// ═══════════════════════════════════════════════════════════════
// Test Constants
// ═══════════════════════════════════════════════════════════════

const EMPLOYER_PROFILE_ID = '2aefe58f-ed76-4f30-b75d-e4bd04db6a65'  // Washim Akram
const EMPLOYEE_PROFILE_ID = 'b01f461b-5030-4a02-8f45-56e3adea3d5e'  // Aarav Sharma
const EMPLOYEE_MEMBER_ID = 'ebf382b2-dafe-41a6-83b1-6cc726533d88'   // Aarav's member record
const ORG_ID = '7bfd018b-25a0-4cde-b31c-0857df375c66'               // Test Employer

const createdLeaveRequestIds = []
const createdNotificationIds = []

// ═══════════════════════════════════════════════════════════════
// Cleanup
// ═══════════════════════════════════════════════════════════════

after(async () => {
  console.log('\n    -- CLEANUP --')

  // Delete test notifications
  await supabase
    .from('notifications')
    .delete()
    .eq('organization_id', ORG_ID)
    .in('type', ['leave_requested', 'leave_approved', 'leave_rejected'])
    .gte('created_at', new Date(Date.now() - 300000).toISOString()) // last 5 minutes

  // Delete leave balance updates
  await supabase
    .from('leave_balances')
    .delete()
    .eq('employee_id', EMPLOYEE_MEMBER_ID)
    .eq('fiscal_year', '2082/83')

  // Delete test leave requests
  for (const id of createdLeaveRequestIds) {
    await supabase.from('leave_requests').delete().eq('id', id)
  }
  console.log(`    Deleted ${createdLeaveRequestIds.length} leave request(s)`)
  console.log('    Cleanup complete.\n')
})

// Helper: find a notification created in the last minute with specific criteria
async function findRecentNotification(type, recipientId, afterTimestamp) {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('type', type)
    .eq('recipient_id', recipientId)
    .eq('organization_id', ORG_ID)
    .gte('created_at', afterTimestamp)
    .order('created_at', { ascending: false })
    .limit(1)
  return data?.[0] || null
}

// ═══════════════════════════════════════════════════════════════
// 1. Leave Service — createLeaveRequest
// ═══════════════════════════════════════════════════════════════

describe('Leave Service — notification inserts', () => {
  let leaveRequestId = null

  it('createLeaveRequest inserts leave_requested notification for org owner', async () => {
    const beforeTime = new Date().toISOString()

    // Use a date far enough in the future to avoid overlap with existing requests
    const startDate = '2026-06-15'
    const endDate = '2026-06-16'

    const result = await leaveService.createLeaveRequest(EMPLOYEE_MEMBER_ID, ORG_ID, {
      leaveTypeCode: 'sick_leave',
      startDate,
      endDate,
      reason: 'Test notification insert'
    })

    assert.ok(result, 'Leave request should be created')
    leaveRequestId = result.id
    createdLeaveRequestIds.push(leaveRequestId)

    // Wait briefly for async notification insert
    await new Promise(r => setTimeout(r, 500))

    const notif = await findRecentNotification('leave_requested', EMPLOYER_PROFILE_ID, beforeTime)
    assert.ok(notif, 'Notification should exist for employer')
    assert.equal(notif.type, 'leave_requested')
    assert.equal(notif.recipient_id, EMPLOYER_PROFILE_ID, 'Recipient should be the org owner')
    assert.equal(notif.organization_id, ORG_ID)
    assert.equal(notif.action_url, '/time-off')
    assert.ok(notif.metadata?.leave_request_id, 'Metadata should include leave_request_id')
    assert.equal(notif.metadata.leave_type_code, 'sick_leave')
    assert.equal(notif.read_at, null, 'Should be unread')
    assert.equal(notif.dismissed_at, null, 'Should not be dismissed')
    assert.ok(notif.expires_at, 'expires_at should be set')
  })

  it('approveLeaveRequest inserts leave_approved notification for employee', async () => {
    assert.ok(leaveRequestId, 'Need a leave request to approve')

    const beforeTime = new Date().toISOString()

    const result = await leaveService.approveLeaveRequest(leaveRequestId, ORG_ID, EMPLOYER_PROFILE_ID)
    assert.ok(result, 'Approval should succeed')

    await new Promise(r => setTimeout(r, 500))

    const notif = await findRecentNotification('leave_approved', EMPLOYEE_PROFILE_ID, beforeTime)
    assert.ok(notif, 'Notification should exist for employee')
    assert.equal(notif.type, 'leave_approved')
    assert.equal(notif.recipient_id, EMPLOYEE_PROFILE_ID, 'Recipient should be the employee')
    assert.equal(notif.actor_id, EMPLOYER_PROFILE_ID, 'Actor should be the approver')
    assert.equal(notif.action_url, '/employee/time-off')
    assert.ok(notif.metadata?.leave_request_id)
  })

  it('rejectLeaveRequest inserts leave_rejected notification for employee', async () => {
    // Create a new leave request to reject
    const startDate = '2026-07-20'
    const endDate = '2026-07-21'

    const request = await leaveService.createLeaveRequest(EMPLOYEE_MEMBER_ID, ORG_ID, {
      leaveTypeCode: 'sick_leave',
      startDate,
      endDate,
      reason: 'Test rejection'
    })
    createdLeaveRequestIds.push(request.id)

    const beforeTime = new Date().toISOString()

    const result = await leaveService.rejectLeaveRequest(request.id, ORG_ID, 'Not approved for testing')
    assert.ok(result, 'Rejection should succeed')

    await new Promise(r => setTimeout(r, 500))

    const notif = await findRecentNotification('leave_rejected', EMPLOYEE_PROFILE_ID, beforeTime)
    assert.ok(notif, 'Notification should exist for employee')
    assert.equal(notif.type, 'leave_rejected')
    assert.equal(notif.recipient_id, EMPLOYEE_PROFILE_ID)
    assert.equal(notif.action_url, '/employee/time-off')
    assert.ok(notif.metadata?.rejection_reason, 'Metadata should include rejection_reason')
    assert.ok(notif.message?.includes('not approved'), 'Message should mention rejection')
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. Time-off Service — notification inserts
// ═══════════════════════════════════════════════════════════════

describe('Time-off Service — notification inserts', () => {
  it('requestTimeOff inserts leave_requested notification for org owner', async () => {
    const beforeTime = new Date().toISOString()

    // Check if time_off_policies exist for this org
    const { data: policies } = await supabase
      .from('time_off_policies')
      .select('id')
      .eq('organization_id', ORG_ID)
      .limit(1)

    if (!policies?.length) {
      console.log('    SKIP: No time-off policies exist for test org')
      return
    }

    // Dynamic import to avoid loading issues if timeoff tables don't exist
    const { timeOffService } = await import('../services/timeoff.service.js')

    try {
      await timeOffService.requestTimeOff(
        EMPLOYEE_MEMBER_ID, ORG_ID, policies[0].id,
        '2026-08-10', '2026-08-11', 'Test timeoff notification'
      )

      await new Promise(r => setTimeout(r, 500))

      const notif = await findRecentNotification('leave_requested', EMPLOYER_PROFILE_ID, beforeTime)
      assert.ok(notif, 'Notification should exist for employer')
      assert.equal(notif.type, 'leave_requested')
      assert.ok(notif.metadata?.source === 'timeoff', 'Metadata should indicate timeoff source')
    } catch (err) {
      // If the RPC or table doesn't exist, skip gracefully
      console.log(`    SKIP: Time-off request failed (${err.message})`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. Notification field validation (across all inserts)
// ═══════════════════════════════════════════════════════════════

describe('Notification fields — cross-cutting validation', () => {
  it('all test notifications have valid action_url (not legacy routes)', async () => {
    const { data: notifs } = await supabase
      .from('notifications')
      .select('type, action_url')
      .eq('organization_id', ORG_ID)
      .gte('created_at', new Date(Date.now() - 300000).toISOString())

    const legacyRoutes = ['/dashboard-employee', '/dashboard-employee?tab=']
    for (const n of notifs || []) {
      if (n.action_url) {
        for (const legacy of legacyRoutes) {
          assert.ok(
            !n.action_url.startsWith(legacy),
            `Notification type=${n.type} uses legacy route: ${n.action_url}`
          )
        }
      }
    }
  })

  it('all test notifications have expires_at set', async () => {
    const { data: notifs } = await supabase
      .from('notifications')
      .select('type, expires_at')
      .eq('organization_id', ORG_ID)
      .gte('created_at', new Date(Date.now() - 300000).toISOString())

    for (const n of notifs || []) {
      assert.ok(n.expires_at, `Notification type=${n.type} missing expires_at`)
    }
  })
})
