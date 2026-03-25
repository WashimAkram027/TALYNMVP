import { useEffect } from 'react'
import useAdminAuthStore from './store/adminAuthStore'
import AppRoutes from './routes/index'

export default function App() {
  const { checkAuth, isLoading } = useAdminAuthStore()

  useEffect(() => {
    checkAuth()
  }, [])

  return <AppRoutes />
}
