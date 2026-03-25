import { Navigate, Outlet } from 'react-router-dom'
import useAdminAuthStore from '../../../store/adminAuthStore'

export default function AdminProtectedRoute() {
  const { isAuthenticated, isLoading } = useAdminAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
