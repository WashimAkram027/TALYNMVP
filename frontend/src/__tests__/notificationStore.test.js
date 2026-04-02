/**
 * Notification Store Tests
 *
 * Tests the Zustand notification store with mocked API.
 *
 * Usage:
 *   cd frontend && npx vitest run src/__tests__/notificationStore.test.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the notifications service before importing the store
vi.mock('../services/notificationsService', () => ({
  notificationsService: {
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markRead: vi.fn(),
    dismiss: vi.fn(),
    markAllRead: vi.fn()
  }
}))

import { useNotificationStore } from '../store/notificationStore'
import { notificationsService } from '../services/notificationsService'

// Reset store state before each test
beforeEach(() => {
  useNotificationStore.setState({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    _pollInterval: null
  })
  vi.clearAllMocks()
})

// ═══════════════════════════════════════════════════════════════
// fetchNotifications()
// ═══════════════════════════════════════════════════════════════

describe('fetchNotifications()', () => {
  it('calls API and populates notifications array', async () => {
    const mockNotifs = [
      { id: '1', type: 'leave_rejected', title: 'Test', read_at: null, dismissed_at: null },
      { id: '2', type: 'invoice_generated', title: 'Test 2', read_at: '2026-01-01', dismissed_at: null }
    ]
    notificationsService.getNotifications.mockResolvedValue(mockNotifs)
    notificationsService.getUnreadCount.mockResolvedValue(1)

    await useNotificationStore.getState().fetchNotifications()

    const state = useNotificationStore.getState()
    expect(state.notifications).toEqual(mockNotifs)
    expect(state.unreadCount).toBe(1)
    expect(state.isLoading).toBe(false)
  })

  it('sets isLoading during fetch', async () => {
    let loadingDuringFetch = false
    notificationsService.getNotifications.mockImplementation(async () => {
      loadingDuringFetch = useNotificationStore.getState().isLoading
      return []
    })
    notificationsService.getUnreadCount.mockResolvedValue(0)

    await useNotificationStore.getState().fetchNotifications()
    expect(loadingDuringFetch).toBe(true)
    expect(useNotificationStore.getState().isLoading).toBe(false)
  })

  it('handles API errors gracefully', async () => {
    notificationsService.getNotifications.mockRejectedValue(new Error('Network error'))
    notificationsService.getUnreadCount.mockRejectedValue(new Error('Network error'))

    await useNotificationStore.getState().fetchNotifications()

    const state = useNotificationStore.getState()
    expect(state.isLoading).toBe(false)
    // Should not throw — store handles errors internally
  })
})

// ═══════════════════════════════════════════════════════════════
// dismiss(id)
// ═══════════════════════════════════════════════════════════════

describe('dismiss(id)', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [
        { id: 'n1', type: 'test', title: 'A', dismissed_at: null, read_at: null },
        { id: 'n2', type: 'test', title: 'B', dismissed_at: null, read_at: null }
      ],
      unreadCount: 2
    })
  })

  it('optimistically sets dismissed_at on the notification', async () => {
    notificationsService.dismiss.mockResolvedValue({})

    // Don't await — check optimistic state immediately
    const promise = useNotificationStore.getState().dismiss('n1')

    const state = useNotificationStore.getState()
    const n1 = state.notifications.find(n => n.id === 'n1')
    expect(n1.dismissed_at).toBeTruthy()

    await promise
  })

  it('calls the API dismiss endpoint', async () => {
    notificationsService.dismiss.mockResolvedValue({})
    await useNotificationStore.getState().dismiss('n1')
    expect(notificationsService.dismiss).toHaveBeenCalledWith('n1')
  })

  it('reverts on API failure by refetching', async () => {
    notificationsService.dismiss.mockRejectedValue(new Error('fail'))
    notificationsService.getNotifications.mockResolvedValue([])
    notificationsService.getUnreadCount.mockResolvedValue(0)

    await useNotificationStore.getState().dismiss('n1')

    // Should have called fetchNotifications to revert
    expect(notificationsService.getNotifications).toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════
// markRead(id)
// ═══════════════════════════════════════════════════════════════

describe('markRead(id)', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [
        { id: 'n1', type: 'test', title: 'Unread', read_at: null, dismissed_at: null },
        { id: 'n2', type: 'test', title: 'Already read', read_at: '2026-01-01', dismissed_at: null }
      ],
      unreadCount: 1
    })
  })

  it('optimistically marks notification as read', async () => {
    notificationsService.markRead.mockResolvedValue({})

    const promise = useNotificationStore.getState().markRead('n1')
    const n1 = useNotificationStore.getState().notifications.find(n => n.id === 'n1')
    expect(n1.read_at).toBeTruthy()
    await promise
  })

  it('decrements unreadCount by 1', async () => {
    notificationsService.markRead.mockResolvedValue({})
    await useNotificationStore.getState().markRead('n1')
    expect(useNotificationStore.getState().unreadCount).toBe(0)
  })

  it('does not decrement unreadCount for already-read notification', async () => {
    notificationsService.markRead.mockResolvedValue({})
    await useNotificationStore.getState().markRead('n2')
    expect(useNotificationStore.getState().unreadCount).toBe(1)
  })

  it('calls the API read endpoint', async () => {
    notificationsService.markRead.mockResolvedValue({})
    await useNotificationStore.getState().markRead('n1')
    expect(notificationsService.markRead).toHaveBeenCalledWith('n1')
  })
})

// ═══════════════════════════════════════════════════════════════
// markAllRead()
// ═══════════════════════════════════════════════════════════════

describe('markAllRead()', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [
        { id: 'n1', read_at: null, dismissed_at: null },
        { id: 'n2', read_at: null, dismissed_at: null }
      ],
      unreadCount: 2
    })
  })

  it('sets unreadCount to 0', async () => {
    notificationsService.markAllRead.mockResolvedValue({})
    await useNotificationStore.getState().markAllRead()
    expect(useNotificationStore.getState().unreadCount).toBe(0)
  })

  it('marks all notifications as read in local state', async () => {
    notificationsService.markAllRead.mockResolvedValue({})
    await useNotificationStore.getState().markAllRead()
    const allRead = useNotificationStore.getState().notifications.every(n => n.read_at)
    expect(allRead).toBe(true)
  })

  it('calls the API read-all endpoint', async () => {
    notificationsService.markAllRead.mockResolvedValue({})
    await useNotificationStore.getState().markAllRead()
    expect(notificationsService.markAllRead).toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════
// startPolling() / stopPolling()
// ═══════════════════════════════════════════════════════════════

describe('startPolling / stopPolling', () => {
  it('startPolling sets an interval', () => {
    useNotificationStore.getState().startPolling()
    expect(useNotificationStore.getState()._pollInterval).toBeTruthy()
    useNotificationStore.getState().stopPolling()
  })

  it('stopPolling clears the interval', () => {
    useNotificationStore.getState().startPolling()
    useNotificationStore.getState().stopPolling()
    expect(useNotificationStore.getState()._pollInterval).toBeNull()
  })

  it('multiple startPolling calls do not create multiple intervals', () => {
    useNotificationStore.getState().startPolling()
    const first = useNotificationStore.getState()._pollInterval
    useNotificationStore.getState().startPolling()
    const second = useNotificationStore.getState()._pollInterval
    // Second call should have cleared the first and created a new one
    expect(second).toBeTruthy()
    useNotificationStore.getState().stopPolling()
  })
})
