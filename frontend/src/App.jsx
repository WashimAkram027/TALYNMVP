import { useEffect, useState } from 'react'
import AppRoutes from './routes'
import { useAuthStore } from './store/authStore'

export default function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const initAuth = async () => {
      await checkAuth()
      setAuthChecked(true)
    }
    initAuth()
  }, []) // Empty dependency - only run once on mount

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-subtext-light dark:text-subtext-dark">Loading...</p>
        </div>
      </div>
    )
  }

  return <AppRoutes />
}
