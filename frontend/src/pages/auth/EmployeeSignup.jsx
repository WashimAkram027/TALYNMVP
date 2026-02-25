import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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

export default function EmployeeSignup() {
  const [searchParams] = useSearchParams()
  const fileInputRef = useRef(null)

  const inviteEmail = searchParams.get('email')
  const isInvite = searchParams.get('invite') === 'true'

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState(inviteEmail || '')
  const [linkedIn, setLinkedIn] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emailAvailable, setEmailAvailable] = useState(null)
  const [passwordValidation, setPasswordValidation] = useState({ isValid: false, requirements: {} })
  const [resumeFile, setResumeFile] = useState(null)
  const [resumeError, setResumeError] = useState('')
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

  const handleResumeSelect = (e) => {
    const file = e.target.files?.[0]
    setResumeError('')
    if (!file) { setResumeFile(null); return }

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      setResumeError('Please upload a PDF, DOC, or DOCX file')
      setResumeFile(null)
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setResumeError('File size must be less than 10MB')
      setResumeFile(null)
      return
    }
    setResumeFile(file)
  }

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
        role: 'candidate'
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Check your email</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-2">We've sent a verification link to:</p>
          <p className="text-primary font-medium mb-6">{email}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Click the link in your email to verify your account. The link will expire in 24 hours.
          </p>
          <div className="space-y-3">
            <Link
              to="/login/employee"
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Employee Account</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Find your next opportunity</p>
        </div>

        {isInvite && inviteEmail && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 px-4 py-3 rounded-lg flex items-center gap-3">
            <span className="material-icons">celebration</span>
            <span>You've been invited! Create your account with <strong>{inviteEmail}</strong> to accept the invitation.</span>
          </div>
        )}

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
                Email
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="linkedin">
                LinkedIn URL (Optional)
              </label>
              <input
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5 placeholder-gray-400 dark:placeholder-gray-500"
                id="linkedin"
                type="url"
                placeholder="https://www.linkedin.com/in/yourprofile"
                value={linkedIn}
                onChange={(e) => setLinkedIn(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Resume/Portfolio (Optional)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleResumeSelect}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`flex justify-center px-6 pt-4 pb-4 border-2 ${resumeFile ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600'} border-dashed rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer`}
              >
                <div className="text-center">
                  {resumeFile ? (
                    <>
                      <span className="material-icons-outlined text-green-500 text-2xl">check_circle</span>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">{resumeFile.name}</p>
                      <p className="text-xs text-gray-500">Click to change file</p>
                    </>
                  ) : (
                    <>
                      <span className="material-icons-outlined text-gray-400 text-2xl">upload_file</span>
                      <p className="text-sm text-primary font-medium">Click to upload</p>
                      <p className="text-xs text-gray-500">PDF, DOC, DOCX up to 10MB</p>
                    </>
                  )}
                </div>
              </div>
              {resumeError && <p className="mt-1 text-sm text-red-600">{resumeError}</p>}
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
              <Link className="font-medium text-primary hover:text-primary-hover" to="/login/employee">
                Log in
              </Link>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Are you an employer?{' '}
              <Link className="font-medium text-primary hover:text-primary-hover" to="/signup/employer">
                Sign up as Employer
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
