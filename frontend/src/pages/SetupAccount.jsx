import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authorizedUsersService } from '../services/authorizedUsersService'
import { useAuthStore } from '../store/authStore'

export default function SetupAccount() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const checkAuth = useAuthStore(state => state.checkAuth)

  const [inviteInfo, setInviteInfo] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invitation link.')
      setValidating(false)
      return
    }

    const validate = async () => {
      try {
        const result = await authorizedUsersService.validateToken(token)
        setInviteInfo(result.data || result)
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'This invitation link is invalid or has expired.')
      } finally {
        setValidating(false)
      }
    }
    validate()
  }, [token])

  const validatePassword = (pwd) => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters'
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!/\d/.test(pwd)) {
      return 'Password must contain at least one number'
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    setLoading(true)

    try {
      const result = await authorizedUsersService.setupAccount({ token, password })
      const data = result.data || result

      // Store token and role
      localStorage.setItem('access_token', data.token)
      localStorage.setItem('user_role', 'employer')

      setSuccess(true)

      // Hydrate auth store then redirect
      await checkAuth()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to set up account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-grow flex flex-col justify-center py-16 px-4 sm:px-6 lg:px-8 bg-background-light dark:bg-background-dark">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/home" className="inline-flex items-center gap-2 font-bold text-2xl text-primary mb-6">
            <span className="material-icons-outlined text-3xl">language</span>
            <span>Talyn</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Set up your account
          </h1>
          {inviteInfo && (
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Join <strong>{inviteInfo.organizationName}</strong> on Talyn
            </p>
          )}
        </div>

        {/* Card */}
        <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-8">
            {validating ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Validating invitation...</p>
              </div>
            ) : error && !inviteInfo ? (
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                  <span className="material-icons text-red-600 dark:text-red-400">error_outline</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Invalid Invitation
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  {error}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Please contact your organization administrator to resend the invitation.
                </p>
              </div>
            ) : success ? (
              <div className="text-center py-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                  <span className="material-icons text-green-600 dark:text-green-400">check</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Account created!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Redirecting to dashboard...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Name display (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Name
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 rounded-lg py-3 px-4 border border-gray-200 dark:border-gray-600">
                    {inviteInfo?.firstName} {inviteInfo?.lastName}
                  </p>
                </div>

                {/* Email display (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 rounded-lg py-3 px-4 border border-gray-200 dark:border-gray-600">
                    {inviteInfo?.email}
                  </p>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="password">
                    Create a password
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="material-icons text-gray-400 text-[20px]">lock</span>
                    </div>
                    <input
                      className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg py-3 transition-colors"
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Min 8 characters with uppercase, lowercase, and number
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="confirm-password">
                    Confirm password
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="material-icons text-gray-400 text-[20px]">lock</span>
                    </div>
                    <input
                      className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg py-3 transition-colors"
                      id="confirm-password"
                      name="confirm-password"
                      type="password"
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Setting up...' : 'Set up account'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
