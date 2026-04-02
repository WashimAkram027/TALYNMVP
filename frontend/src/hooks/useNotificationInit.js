import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useNotificationStore } from '../store/notificationStore'

export function useNotificationInit() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const fetchNotifications = useNotificationStore(state => state.fetchNotifications)
  const startPolling = useNotificationStore(state => state.startPolling)
  const reset = useNotificationStore(state => state.reset)

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications()
      startPolling()
    } else {
      reset()
    }

    return () => {
      reset()
    }
  }, [isAuthenticated])
}
