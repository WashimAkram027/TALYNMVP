/**
 * Notification API Endpoint Tests
 *
 * Tests Express routes end-to-end using Supertest.
 *
 * Usage:
 *   cd backend && node --test src/tests/notification-api.test.js
 *
 * Prerequisites:
 *   - .env must be configured with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import dotenv from 'dotenv'
dotenv.config()

import supertest from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import { supabase } from '../config/supabase.js'
import { env } from '../config/env.js'
import { notificationService } from '../services/notification.service.js'

// ═══════════════════════════════════════════════════════════════
// Test Constants
// ═══════════════════════════════════════════════════════════════

const EMPLOYER_PROFILE_ID = '2aefe58f-ed76-4f30-b75d-e4bd04db6a65'
const EMPLOYEE_PROFILE_ID = 'b01f461b-5030-4a02-8f45-56e3adea3d5e'
const ORG_ID = '7bfd018b-25a0-4cde-b31c-0857df375c66'

const request = supertest(app)
const createdNotificationIds = []

// Generate a valid JWT for test requests
function makeToken(userId) {
  return jwt.sign({ userId }, env.jwtSecret, { expiresIn: '1h' })
}

const employerToken = makeToken(EMPLOYER_PROFILE_ID)
const employeeToken = makeToken(EMPLOYEE_PROFILE_ID)

// ═══════════════════════════════════════════════════════════════
// Setup & Cleanup
// ═══════════════════════════════════════════════════════════════

let testNotif1, testNotif2, testNotif3

before(async () => {
  // Create test notifications directly
  testNotif1 = await notificationService.create({
    recipientId: EMPLOYER_PROFILE_ID,
    type: '__api_test__',
    title: 'API Test 1',
    message: 'First test notification',
    actionUrl: '/test',
    organizationId: ORG_ID
  })
  if (testNotif1?.id) createdNotificationIds.push(testNotif1.id)

  testNotif2 = await notificationService.create({
    recipientId: EMPLOYER_PROFILE_ID,
    type: 'leave_rejected',
    title: 'API Test 2',
    organizationId: ORG_ID
  })
  if (testNotif2?.id) createdNotificationIds.push(testNotif2.id)

  testNotif3 = await notificationService.create({
    recipientId: EMPLOYEE_PROFILE_ID,
    type: '__api_test__',
    title: 'Employee notification',
    organizationId: ORG_ID
  })
  if (testNotif3?.id) createdNotificationIds.push(testNotif3.id)
})

after(async () => {
  console.log('\n    -- CLEANUP --')
  if (createdNotificationIds.length > 0) {
    await supabase.from('notifications').delete().in('id', createdNotificationIds)
    console.log(`    Deleted ${createdNotificationIds.length} test notification(s)`)
  }
  await supabase.from('notifications').delete().eq('type', '__api_test__')
  console.log('    Cleanup complete.\n')
})

// ═══════════════════════════════════════════════════════════════
// 1. Auth tests
// ═══════════════════════════════════════════════════════════════

describe('Notification API — Authentication', () => {
  it('GET /api/notifications returns 401 without token', async () => {
    const res = await request.get('/api/notifications')
    assert.equal(res.status, 401)
  })

  it('GET /api/notifications/unread-count returns 401 without token', async () => {
    const res = await request.get('/api/notifications/unread-count')
    assert.equal(res.status, 401)
  })

  it('PATCH /api/notifications/:id/read returns 401 without token', async () => {
    const res = await request.patch(`/api/notifications/${testNotif1.id}/read`)
    assert.equal(res.status, 401)
  })

  it('PATCH /api/notifications/:id/dismiss returns 401 without token', async () => {
    const res = await request.patch(`/api/notifications/${testNotif1.id}/dismiss`)
    assert.equal(res.status, 401)
  })

  it('PATCH /api/notifications/read-all returns 401 without token', async () => {
    const res = await request.patch('/api/notifications/read-all')
    assert.equal(res.status, 401)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. GET /api/notifications
// ═══════════════════════════════════════════════════════════════

describe('GET /api/notifications', () => {
  it('returns notifications for the authenticated user', async () => {
    const res = await request
      .get('/api/notifications')
      .set('Authorization', `Bearer ${employerToken}`)

    assert.equal(res.status, 200)
    assert.ok(res.body.success)
    assert.ok(Array.isArray(res.body.data))
    // Should include our test notifications
    const ids = res.body.data.map(n => n.id)
    assert.ok(ids.includes(testNotif1.id), 'Should include testNotif1')
  })

  it('does not return notifications belonging to other users', async () => {
    const res = await request
      .get('/api/notifications')
      .set('Authorization', `Bearer ${employerToken}`)

    const ids = res.body.data.map(n => n.id)
    assert.ok(!ids.includes(testNotif3.id), 'Should not include employee notification')
  })

  it('supports ?unread=true filter', async () => {
    // Mark one as read first
    await notificationService.markRead(testNotif1.id, EMPLOYER_PROFILE_ID)

    const res = await request
      .get('/api/notifications?unread=true')
      .set('Authorization', `Bearer ${employerToken}`)

    assert.equal(res.status, 200)
    const ids = res.body.data.map(n => n.id)
    assert.ok(!ids.includes(testNotif1.id), 'Should not include read notification')
  })

  it('supports ?type=leave_rejected filter', async () => {
    const res = await request
      .get('/api/notifications?type=leave_rejected')
      .set('Authorization', `Bearer ${employerToken}`)

    assert.equal(res.status, 200)
    const wrongType = res.body.data.some(n => n.type !== 'leave_rejected')
    assert.ok(!wrongType, 'All results should be leave_rejected type')
  })

  it('supports ?limit=1 parameter', async () => {
    const res = await request
      .get('/api/notifications?limit=1')
      .set('Authorization', `Bearer ${employerToken}`)

    assert.equal(res.status, 200)
    assert.ok(res.body.data.length <= 1)
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. GET /api/notifications/unread-count
// ═══════════════════════════════════════════════════════════════

describe('GET /api/notifications/unread-count', () => {
  it('returns { count: N } for authenticated user', async () => {
    const res = await request
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${employeeToken}`)

    assert.equal(res.status, 200)
    assert.ok(res.body.success)
    assert.ok(typeof res.body.data.count === 'number')
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. PATCH /api/notifications/:id/read
// ═══════════════════════════════════════════════════════════════

describe('PATCH /api/notifications/:id/read', () => {
  let freshNotif

  before(async () => {
    freshNotif = await notificationService.create({
      recipientId: EMPLOYER_PROFILE_ID,
      type: '__api_test__',
      title: 'To be read via API',
      organizationId: ORG_ID
    })
    if (freshNotif?.id) createdNotificationIds.push(freshNotif.id)
  })

  it('sets read_at and returns updated notification', async () => {
    const res = await request
      .patch(`/api/notifications/${freshNotif.id}/read`)
      .set('Authorization', `Bearer ${employerToken}`)

    assert.equal(res.status, 200)
    assert.ok(res.body.data.read_at)
  })

  it('returns error for non-existent notification ID', async () => {
    const res = await request
      .patch('/api/notifications/00000000-0000-0000-0000-000000000000/read')
      .set('Authorization', `Bearer ${employerToken}`)

    assert.ok(res.status >= 400)
  })

  it('returns error for another user\'s notification', async () => {
    const res = await request
      .patch(`/api/notifications/${testNotif3.id}/read`)
      .set('Authorization', `Bearer ${employerToken}`)

    assert.ok(res.status >= 400, 'Should not allow reading another user\'s notification')
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. PATCH /api/notifications/:id/dismiss
// ═══════════════════════════════════════════════════════════════

describe('PATCH /api/notifications/:id/dismiss', () => {
  let freshNotif

  before(async () => {
    freshNotif = await notificationService.create({
      recipientId: EMPLOYER_PROFILE_ID,
      type: '__api_test__',
      title: 'To be dismissed via API',
      organizationId: ORG_ID
    })
    if (freshNotif?.id) createdNotificationIds.push(freshNotif.id)
  })

  it('sets dismissed_at and returns updated notification', async () => {
    const res = await request
      .patch(`/api/notifications/${freshNotif.id}/dismiss`)
      .set('Authorization', `Bearer ${employerToken}`)

    assert.equal(res.status, 200)
    assert.ok(res.body.data.dismissed_at)
  })

  it('returns error for another user\'s notification', async () => {
    const res = await request
      .patch(`/api/notifications/${testNotif3.id}/dismiss`)
      .set('Authorization', `Bearer ${employerToken}`)

    assert.ok(res.status >= 400)
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. PATCH /api/notifications/read-all
// ═══════════════════════════════════════════════════════════════

describe('PATCH /api/notifications/read-all', () => {
  before(async () => {
    // Create fresh unread notifications
    const n = await notificationService.create({
      recipientId: EMPLOYEE_PROFILE_ID,
      type: '__api_test__',
      title: 'Batch read test',
      organizationId: ORG_ID
    })
    if (n?.id) createdNotificationIds.push(n.id)
  })

  it('marks all unread as read and returns success', async () => {
    const res = await request
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${employeeToken}`)

    assert.equal(res.status, 200)
    assert.ok(res.body.success)
  })

  it('subsequent unread-count returns 0', async () => {
    const res = await request
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${employeeToken}`)

    assert.equal(res.status, 200)
    assert.equal(res.body.data.count, 0)
  })
})
