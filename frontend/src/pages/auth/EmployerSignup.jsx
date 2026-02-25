import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../../services/api'

const validatePassword = (password) => {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password)
  }
  const isValid = Object.values(requirements).every(Boolean)
  return { isValid, requirements }
}

export default function EmployerSignup() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emailAvailable, setEmailAvailable] = useState(null)
  const [passwordValidation, setPasswordValidation] = useState({ isValid: false, requirements: {} })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [signupComplete, setSignupComplete] = useState(false)

  const checkEmailAvailability = useCallback(async (emailVal) => {
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setEmailAvailable(null)
      return
    }
    try {
      const response = await authAPI.checkEmail(emailVal)
      setEmailAvailable(!response.data?.exists)
    } catch {
      setEmailAvailable(null)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => checkEmailAvailability(email), 500)
    return () => clearTimeout(timer)
  }, [email, checkEmailAvailability])

  useEffect(() => {
    setPasswordValidation(validatePassword(password))
  }, [password])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (emailAvailable === false) {
      setError('This email is already registered')
      return
    }
    if (!passwordValidation.isValid) {
      setError('Password does not meet requirements')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await authAPI.signup({
        email,
        password,
        firstName,
        lastName,
        role: 'employer'
      })

      if (response.success) {
        setSignupComplete(true)
      } else {
        setError(response.error || 'Signup failed')
      }
    } catch (err) {
      setError(err.message || 'Signup failed')
    }
    setLoading(false)
  }

  if (signupComplete) {
    return (
      <div className="flex-grow flex items-center justify-center py-16 px-4 bg-background-light dark:bg-background-dark">
        <div className="max-w-md w-full bg-card-light dark:bg-card-dark rounded-2xl shadow-xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-4">
              <span className="material-icons text-primary text-4xl">mail</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Check your email
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            We've sent a verification link to:
          </p>
          <p className="text-primary font-medium mb-6">{email}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Click the link in your email to verify your account. The link will expire in 24 hours.
          </p>
          <div className="space-y-3">
            <Link
              to="/login/employer"
              className="block w-full py-3 px-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors text-center"
            >
              Go to Login
            </Link>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Didn't receive the email? Check your spam folder or try logging in to resend.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-grow flex items-center justify-center py-12 px-4 bg-background-light dark:bg-background-dark">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Employer Account</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Get started with hiring top talent</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="firstName">
                  First Name
                </label>
                <input
                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="lastName">
                  Last Name
                </label>
                <input
                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="email">
                Business Email
              </label>
              <input
                className={`block w-full rounded-lg shadow-sm sm:text-sm py-2.5 dark:bg-gray-800 dark:text-white ${
                  emailAvailable === false
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : emailAvailable === true
                    ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                    : 'border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary'
                }`}
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {emailAvailable === false && (
                <p className="mt-1 text-sm text-red-600">This email is already registered</p>
              )}
              {emailAvailable === true && email && (
                <p className="mt-1 text-sm text-green-600">Email is available</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="password">
                Password
              </label>
              <input
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {password && (
                <div className="mt-2 text-xs space-y-1">
                  <p className={passwordValidation.requirements.minLength ? 'text-green-600' : 'text-gray-500'}>
                    {passwordValidation.requirements.minLength ? '✓' : '○'} At least 8 characters
                  </p>
                  <p className={passwordValidation.requirements.hasUppercase ? 'text-green-600' : 'text-gray-500'}>
                    {passwordValidation.requirements.hasUppercase ? '✓' : '○'} One uppercase letter
                  </p>
                  <p className={passwordValidation.requirements.hasLowercase ? 'text-green-600' : 'text-gray-500'}>
                    {passwordValidation.requirements.hasLowercase ? '✓' : '○'} One lowercase letter
                  </p>
                  <p className={passwordValidation.requirements.hasNumber ? 'text-green-600' : 'text-gray-500'}>
                    {passwordValidation.requirements.hasNumber ? '✓' : '○'} One number
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link className="font-medium text-primary hover:text-primary-hover" to="/login/employer">
                Log in
              </Link>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Looking for work?{' '}
              <Link className="font-medium text-primary hover:text-primary-hover" to="/signup/employee">
                Sign up as Employee
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
