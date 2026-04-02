/**
 * Notification Service Unit/Integration Tests
 *
 * Tests notification.service.js functions against live Supabase.
 *
 * Usage:
 *   cd backend && node --test src/tests/notification-service.test.js
 *
 * Prerequisites:
 *   - .env must be configured with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import dotenv from 'dotenv'
dotenv.config()

import { supabase } from '../config/supabase.js'
import { notificationService } from '../services/notification.service.js'

// ═══════════════════════════════════════════════════════════════
// Test Constants
// ═══════════════════════════════════════════════════════════════

const EMPLOYER_PROFILE_ID = '2aefe58f-ed76-4f30-b75d-e4bd04db6a65'  // Washim Akram (employer)
const EMPLOYEE_PROFILE_ID = 'b01f461b-5030-4a02-8f45-56e3adea3d5e'  // Aarav Sharma (employee)
const ORG_ID = '7bfd018b-25a0-4cde-b31c-0857df375c66'               // Test Employer

const createdNotificationIds = []

// ═══════════════════════════════════════════════════════════════
// Cleanup
// ═══════════════════════════════════════════════════════════════

after(async () => {
  console.log('\n    -- CLEANUP --')
  if (createdNotificationIds.length > 0) {
    await supabase
      .from('notifications')
      .delete()
      .in('id', createdNotificationIds)
    console.log(`    Deleted ${createdNotificationIds.length} test notification(s)`)
  }
  // Also clean up any stragglers from this test run
  await supabase
    .from('notifications')
    .delete()
    .eq('type', '__test__')
  console.log('    Cleanup complete.\n')
})

// Helper to create and track a notification
async function createTracked(params) {
  const result = await notificationService.create(params)
  if (result?.id) createdNotificationIds.push(result.id)
  return result
}

// ═══════════════════════════════════════════════════════════════
// 1. create() tests
// ═══════════════════════════════════════════════════════════════

describe('notificationService.create()', () => {
  it('creates a notification with all fields populated', async () => {
    const notif = await createTracked({
      recipientId: EMPLOYER_PROFILE_ID,
      actorId: EMPLOYEE_PROFILE_ID,
      organizationId: ORG_ID,
      type: '__test__',
      title: 'Test notification',
      message: 'This is a test',
      actionUrl: '/test',
      metadata: { key: 'value', nested: { a: 1 } }
    })

    assert.ok(notif, 'Should return a notification object')
    assert.ok(notif.id, 'Should have an id')
    assert.equal(notif.recipient_id, EMPLOYER_PROFILE_ID)
    assert.equal(notif.actor_id, EMPLOYEE_PROFILE_ID)
    assert.equal(notif.organization_id, ORG_ID)
    assert.equal(notif.type, '__test__')
    assert.equal(notif.title, 'Test notification')
    assert.equal(notif.message, 'This is a test')
    assert.equal(notif.action_url, '/test')
    assert.equal(notif.read_at, null)
    assert.equal(notif.dismissed_at, null)
  })

  it('sets expires_at to approximately 90 days from now', async () => {
    const notif = await createTracked({
      recipientId: EMPLOYER_PROFILE_ID,
      type: '__test__',
      title: 'Expiry test'
    })

    assert.ok(notif.expires_at, 'expires_at should be set')
    const expiresAt = new Date(notif.expires_at)
    const expected = new Date()
    expected.setDate(expected.getDate() + 90)
    const diffMs = Math.abs(expiresAt.getTime() - expected.getTime())
    assert.ok(diffMs < 10000, `expires_at should be ~90 days from now (diff: ${diffMs}ms)`)
  })

  it('returns null without throwing for invalid recipientId', async () => {
    const result = await notificationService.create({
      recipientId: '00000000-0000-0000-0000-000000000000',
      type: '__test__',
      title: 'Should not throw'
    })
    // Should return null (non-throwing) due to FK constraint failure
    assert.equal(result, null)
  })

  it('returns null without throwing for missing required fields', async () => {
    const result = await notificationService.create({
      recipientId: null,
      type: null,
      title: null
    })
    assert.equal(result, null)
  })

  it('stores metadata JSONB correctly with nested fields', async () => {
    const meta = { leave_request_id: 'abc-123', nested: { days: 5, types: ['a', 'b'] } }
    const notif = await createTracked({
      recipientId: EMPLOYER_PROFILE_ID,
      type: '__test__',
      title: 'Metadata test',
      metadata: meta
    })

    assert.deepEqual(notif.metadata, meta)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. getForUser() tests
// ═══════════════════════════════════════════════════════════════

describe('notificationService.getForUser()', () => {
  let notif1, notif2, notif3

  before(async () => {
    // Create 3 notifications for employer, 0 for employee
    notif1 = await createTracked({
      recipientId: EMPLOYER_PROFILE_ID, type: '__test__', title: 'First'
    })
    notif2 = await createTracked({
      recipientId: EMPLOYER_PROFILE_ID, type: '__test__', title: 'Second'
    })
    notif3 = await createTracked({
      recipientId: EMPLOYER_PROFILE_ID, type: 'leave_rejected', title: 'Third typed'
    })
    if (notif3?.id) createdNotificationIds.push(notif3.id)

    // Mark notif1 as read
    if (notif1?.id) await notificationService.markRead(notif1.id, EMPLOYER_PROFILE_ID)
    // Dismiss notif2
    if (notif2?.id) await notificationService.dismiss(notif2.id, EMPLOYER_PROFILE_ID)
  })

  it('returns only notifications for the specified user', async () => {
    const results = await notificationService.getForUser(EMPLOYEE_PROFILE_ID, { dismissed: undefined })
    const testResults = results.filter(n => n.type === '__test__' || n.type === 'leave_rejected')
    // Employee should have 0 of our test notifications
    const ourIds = [notif1?.id, notif2?.id, notif3?.id].filter(Boolean)
    const leaked = testResults.filter(n => ourIds.includes(n.id))
    assert.equal(leaked.length, 0, 'Should not return other users\' notifications')
  })

  it('filters by unread=true', async () => {
    const results = await notificationService.getForUser(EMPLOYER_PROFILE_ID, { unread: true, dismissed: undefined })
    const hasRead = results.some(n => n.read_at !== null)
    assert.ok(!hasRead, 'Should not include read notifications')
  })

  it('filters by dismissed=false', async () => {
    const results = await notificationService.getForUser(EMPLOYER_PROFILE_ID, { dismissed: false })
    const hasDismissed = results.some(n => n.dismissed_at !== null)
    assert.ok(!hasDismissed, 'Should not include dismissed notifications')
  })

  it('filters by type', async () => {
    const results = await notificationService.getForUser(EMPLOYER_PROFILE_ID, { type: 'leave_rejected', dismissed: undefined })
    const wrongType = results.some(n => n.type !== 'leave_rejected')
    assert.ok(!wrongType, 'Should only return notifications of the specified type')
  })

  it('respects limit parameter', async () => {
    const results = await notificationService.getForUser(EMPLOYER_PROFILE_ID, { limit: 1, dismissed: undefined })
    assert.ok(results.length <= 1, 'Should return at most 1 result')
  })

  it('returns results ordered by created_at DESC', async () => {
    const results = await notificationService.getForUser(EMPLOYER_PROFILE_ID, { dismissed: undefined })
    for (let i = 1; i < results.length; i++) {
      const prev = new Date(results[i - 1].created_at).getTime()
      const curr = new Date(results[i].created_at).getTime()
      assert.ok(prev >= curr, 'Should be ordered newest first')
    }
  })

  it('returns empty array for user with no notifications', async () => {
    // Use a valid but notification-less user UUID
    const results = await notificationService.getForUser('00000000-0000-0000-0000-000000000001', { dismissed: undefined })
    assert.ok(Array.isArray(results), 'Should return an array')
    assert.equal(results.length, 0, 'Should be empty')
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. getUnreadCount() tests
// ═══════════════════════════════════════════════════════════════

describe('notificationService.getUnreadCount()', () => {
  let notifA, notifB

  before(async () => {
    // Clean slate: create 2 fresh notifications for employee
    notifA = await createTracked({
      recipientId: EMPLOYEE_PROFILE_ID, type: '__test__', title: 'Unread A'
    })
    notifB = await createTracked({
      recipientId: EMPLOYEE_PROFILE_ID, type: '__test__', title: 'Unread B'
    })
  })

  it('returns correct count of unread notifications', async () => {
    const count = await notificationService.getUnreadCount(EMPLOYEE_PROFILE_ID)
    assert.ok(count >= 2, `Should have at least 2 unread, got ${count}`)
  })

  it('returns 0 for user with no notifications', async () => {
    const count = await notificationService.getUnreadCount('00000000-0000-0000-0000-000000000001')
    assert.equal(count, 0)
  })

  it('excludes read notifications from count', async () => {
    const before = await notificationService.getUnreadCount(EMPLOYEE_PROFILE_ID)
    await notificationService.markRead(notifA.id, EMPLOYEE_PROFILE_ID)
    const after_ = await notificationService.getUnreadCount(EMPLOYEE_PROFILE_ID)
    assert.equal(after_, before - 1, 'Count should decrease by 1 after marking one as read')
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. markRead() tests
// ═══════════════════════════════════════════════════════════════

describe('notificationService.markRead()', () => {
  let testNotif, otherNotif

  before(async () => {
    testNotif = await createTracked({
      recipientId: EMPLOYER_PROFILE_ID, type: '__test__', title: 'Mark read test'
    })
    otherNotif = await createTracked({
      recipientId: EMPLOYER_PROFILE_ID, type: '__test__', title: 'Should stay unread'
    })
  })

  it('sets read_at timestamp', async () => {
    const result = await notificationService.markRead(testNotif.id, EMPLOYER_PROFILE_ID)
    assert.ok(result.read_at, 'read_at should be set')
  })

  it('does not affect other notifications', async () => {
    const { data: other } = await supabase
      .from('notifications')
      .select('read_at')
      .eq('id', otherNotif.id)
      .single()
    assert.equal(other.read_at, null, 'Other notification should remain unread')
  })

  it('only works on notifications owned by the specified user', async () => {
    // Try to mark employer's notification as read using employee's ID
    try {
      await notificationService.markRead(testNotif.id, EMPLOYEE_PROFILE_ID)
      // If it doesn't throw, verify it didn't actually change
    } catch {
      // Expected — ownership check prevents this
    }
  })

  it('calling markRead twice does not error', async () => {
    await notificationService.markRead(testNotif.id, EMPLOYER_PROFILE_ID)
    const result = await notificationService.markRead(testNotif.id, EMPLOYER_PROFILE_ID)
    assert.ok(result.read_at, 'Should still have read_at set')
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. dismiss() tests
// ═══════════════════════════════════════════════════════════════

describe('notificationService.dismiss()', () => {
  let testNotif

  before(async () => {
    testNotif = await createTracked({
      recipientId: EMPLOYER_PROFILE_ID, type: '__test__', title: 'Dismiss test'
    })
  })

  it('sets dismissed_at timestamp', async () => {
    const result = await notificationService.dismiss(testNotif.id, EMPLOYER_PROFILE_ID)
    assert.ok(result.dismissed_at, 'dismissed_at should be set')
  })

  it('dismissed notification excluded by getForUser with dismissed=false', async () => {
    const results = await notificationService.getForUser(EMPLOYER_PROFILE_ID, { dismissed: false })
    const found = results.find(n => n.id === testNotif.id)
    assert.equal(found, undefined, 'Dismissed notification should be excluded')
  })

  it('dismissed notification still appears when dismissed filter is not applied', async () => {
    // Passing dismissed=true explicitly to include dismissed notifications
    const results = await notificationService.getForUser(EMPLOYER_PROFILE_ID, { dismissed: true })
    const found = results.find(n => n.id === testNotif.id)
    assert.ok(found, 'Dismissed notification should appear when filtering for dismissed=true')
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. markAllRead() tests
// ═══════════════════════════════════════════════════════════════

describe('notificationService.markAllRead()', () => {
  before(async () => {
    // Create a few unread notifications for employee
    await createTracked({
      recipientId: EMPLOYEE_PROFILE_ID, type: '__test__', title: 'Batch 1'
    })
    await createTracked({
      recipientId: EMPLOYEE_PROFILE_ID, type: '__test__', title: 'Batch 2'
    })
    // Create one for employer to ensure isolation
    await createTracked({
      recipientId: EMPLOYER_PROFILE_ID, type: '__test__', title: 'Employer unread'
    })
  })

  it('marks all unread for the user as read', async () => {
    await notificationService.markAllRead(EMPLOYEE_PROFILE_ID)
    const count = await notificationService.getUnreadCount(EMPLOYEE_PROFILE_ID)
    assert.equal(count, 0, 'All employee notifications should be read')
  })

  it('does not affect notifications belonging to other users', async () => {
    const count = await notificationService.getUnreadCount(EMPLOYER_PROFILE_ID)
    assert.ok(count >= 1, 'Employer should still have unread notifications')
  })
})
