import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../../store/authStore'

export default function ProtectedRoute({ children, allowedRoles = [], requireOnboarding = true }) {
  const { isAuthenticated, isLoading, profile } = useAuthStore()

  // Don't redirect while still checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-subtext-light dark:text-subtext-dark">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Not authenticated - redirect to role-appropriate login
  if (!isAuthenticated) {
    const lastRole = localStorage.getItem('user_role')
    const loginPath = lastRole === 'candidate' ? '/login/employee' : '/login/employer'
    return <Navigate to={loginPath} replace />
  }

  // Onboarding checks for employers
  if (profile?.role === 'employer') {
    const onboardingComplete = profile.onboarding_completed === true

    // Protected routes require completed onboarding
    if (requireOnboarding && !onboardingComplete) {
      return <Navigate to="/onboarding/employer" replace />
    }

    // Onboarding page should redirect away if already complete
    if (!requireOnboarding && onboardingComplete) {
      return <Navigate to="/dashboard" replace />
    }
  }

  // Onboarding checks for candidates
  if (profile?.role === 'candidate') {
    const onboardingComplete = profile.onboarding_completed === true

    if (requireOnboarding && !onboardingComplete) {
      return <Navigate to="/onboarding/employee" replace />
    }

    if (!requireOnboarding && onboardingComplete) {
      return <Navigate to="/employee/overview" replace />
    }
  }

  // Role-based access control
  if (allowedRoles.length > 0 && profile?.role && !allowedRoles.includes(profile.role)) {
    const redirectPath = profile.role === 'employer' ? '/dashboard' : '/employee/overview'
    return <Navigate to={redirectPath} replace />
  }

  return children
}
