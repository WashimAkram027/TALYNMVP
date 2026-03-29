import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const { checkAuth } = useAuthStore()

  const [status, setStatus] = useState('verifying') // verifying, success, error
  const [message, setMessage] = useState('')

  // Prevent duplicate verification calls (React StrictMode runs useEffect twice)
  const hasAttemptedVerification = useRef(false)

  useEffect(() => {
    if (hasAttemptedVerification.current) return
    hasAttemptedVerification.current = true

    const verify = async () => {
      if (!token) {
        setStatus('error')
        setMessage('No verification token provided')
        return
      }

      try {
        const response = await authAPI.verifyEmail(token)
        const data = response.data

        // Auto-login: store JWT and hydrate auth state
        if (data?.token) {
          localStorage.setItem('access_token', data.token)
          await checkAuth()
        }

        setStatus('success')
        setMessage('Your email has been verified successfully!')

        // Determine redirect based on the hydrated auth store profile first,
        // then fall back to the backend's redirectTo, then role-based fallback.
        // This ensures the redirect is correct even if the backend response
        // is missing or has stale redirect paths.
        const storeProfile = useAuthStore.getState().profile
        let redirectTo = data?.redirectTo

        if (storeProfile) {
          // Use the hydrated profile from the auth store for the most accurate redirect
          if (storeProfile.role === 'employer') {
            redirectTo = storeProfile.onboarding_completed ? '/dashboard' : '/onboarding/employer'
          } else if (storeProfile.role === 'candidate') {
            redirectTo = storeProfile.onboarding_completed ? '/employee/overview' : '/onboarding/employee'
          }
        }

        // Final fallback: if no redirectTo was determined, use role from backend response
        if (!redirectTo) {
          const role = data?.role || 'candidate'
          redirectTo = role === 'candidate' ? '/login/employee' : '/login/employer'
        }

        navigate(redirectTo, { replace: true })
      } catch (error) {
        setStatus('error')
        setMessage(error.message || 'Failed to verify email')
      }
    }

    verify()
  }, [token, navigate, checkAuth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark px-4">
      <div className="max-w-md w-full bg-card-light dark:bg-card-dark rounded-2xl shadow-xl p-8 text-center">
        {status === 'verifying' && (
          <>
            <div className="flex justify-center mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Verifying your email...
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we verify your email address.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
                <span className="material-icons text-green-600 dark:text-green-400 text-4xl">
                  check_circle
                </span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Email Verified!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {message}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Redirecting you automatically...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4">
                <span className="material-icons text-red-600 dark:text-red-400 text-4xl">
                  error
                </span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Verification Failed
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {message}
            </p>
            <div className="space-y-3">
              <Link
                to="/login/employee"
                className="block w-full py-3 px-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors text-center"
              >
                Log in as Employee
              </Link>
              <Link
                to="/login/employer"
                className="block w-full py-3 px-4 border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center"
              >
                Log in as Employer
              </Link>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Need a new verification link? Try logging in and we'll send you a new one.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
