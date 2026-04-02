import { create } from 'zustand'
import { notificationsService } from '../services/notificationsService'

const POLL_INTERVAL = 30000 // 30 seconds

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  _pollInterval: null,

  fetchNotifications: async () => {
    try {
      set({ isLoading: true })
      const [notifications, unreadCount] = await Promise.all([
        notificationsService.getNotifications({ dismissed: false, limit: 50 }),
        notificationsService.getUnreadCount()
      ])
      set({ notifications: notifications || [], unreadCount, isLoading: false })
    } catch (err) {
      console.error('[NotificationStore] Fetch failed:', err.message)
      set({ isLoading: false })
    }
  },

  fetchUnreadCount: async () => {
    try {
      const unreadCount = await notificationsService.getUnreadCount()
      set({ unreadCount })
    } catch (err) {
      console.error('[NotificationStore] Unread count fetch failed:', err.message)
    }
  },

  dismiss: async (id) => {
    // Optimistic update
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, dismissed_at: new Date().toISOString() } : n
      )
    }))
    try {
      await notificationsService.dismiss(id)
    } catch (err) {
      console.error('[NotificationStore] Dismiss failed:', err.message)
      // Revert on failure
      get().fetchNotifications()
    }
  },

  markRead: async (id) => {
    // Optimistic update
    const wasUnread = get().notifications.find(n => n.id === id && !n.read_at)
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      ),
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
    }))
    try {
      await notificationsService.markRead(id)
    } catch (err) {
      console.error('[NotificationStore] Mark read failed:', err.message)
      get().fetchNotifications()
    }
  },

  markAllRead: async () => {
    // Optimistic update
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })),
      unreadCount: 0
    }))
    try {
      await notificationsService.markAllRead()
    } catch (err) {
      console.error('[NotificationStore] Mark all read failed:', err.message)
      get().fetchNotifications()
    }
  },

  startPolling: () => {
    const existing = get()._pollInterval
    if (existing) clearInterval(existing)

    const interval = setInterval(() => {
      get().fetchUnreadCount()
    }, POLL_INTERVAL)

    set({ _pollInterval: interval })
  },

  stopPolling: () => {
    const interval = get()._pollInterval
    if (interval) {
      clearInterval(interval)
      set({ _pollInterval: null })
    }
  },

  reset: () => {
    get().stopPolling()
    set({ notifications: [], unreadCount: 0, isLoading: false })
  }
}))
