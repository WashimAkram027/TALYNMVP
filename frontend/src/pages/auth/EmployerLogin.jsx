import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { authAPI } from '../../services/api'

export default function EmployerLogin() {
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [resendingVerification, setResendingVerification] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return
    setResendingVerification(true)
    try {
      await authAPI.resendVerification(unverifiedEmail)
      setResendSuccess(true)
    } catch {
      setResendSuccess(true)
    }
    setResendingVerification(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setUnverifiedEmail('')
    setResendSuccess(false)

    const result = await login(email, password, 'employer')

    if (result.success) {
      // Check if employer needs onboarding
      const profile = result.profile
      if (profile?.onboarding_completed === false || profile?.onboarding_step) {
        navigate('/onboarding/employer', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } else {
      if (result.error === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(email)
        setError('Please verify your email before logging in.')
      } else {
        setError(result.error || 'Login failed')
      }
    }
    setLoading(false)
  }

  return (
    <div className="flex-grow flex items-center justify-center py-16 px-4 bg-background-light dark:bg-background-dark">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Employer Login</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Hire top talent & manage payroll</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
            <p>{error}</p>
            {unverifiedEmail && !resendSuccess && (
              <button
                onClick={handleResendVerification}
                disabled={resendingVerification}
                className="mt-2 text-sm font-medium text-primary hover:text-primary-hover underline disabled:opacity-50"
              >
                {resendingVerification ? 'Sending...' : 'Resend verification email'}
              </button>
            )}
            {resendSuccess && (
              <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                Verification email sent! Check your inbox.
              </p>
            )}
          </div>
        )}

        <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="email">
                Work Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-icons text-gray-400 text-[20px]">mail</span>
                </div>
                <input
                  className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg py-3"
                  id="email"
                  type="email"
                  placeholder="hr@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-icons text-gray-400 text-[20px]">lock</span>
                </div>
                <input
                  className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg py-3"
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-sm font-medium text-primary hover:text-primary-hover">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login as Employer'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link className="font-semibold text-primary hover:text-primary-hover" to="/signup/employer">
                Sign Up
              </Link>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Employee?{' '}
              <Link className="font-medium text-primary hover:text-primary-hover" to="/login/employee">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
