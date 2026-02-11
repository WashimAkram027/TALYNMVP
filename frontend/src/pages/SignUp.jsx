import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authAPI, profileAPI } from '../services/api'

// Password validation helper
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

export default function SignUp() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { signUp } = useAuthStore()
  const fileInputRef = useRef(null)

  // Check for invite params
  const inviteEmail = searchParams.get('email')
  const isInvite = searchParams.get('invite') === 'true'

  // Verification success state
  const [signupComplete, setSignupComplete] = useState(false)
  const [signupEmail, setSignupEmail] = useState('')

  // Employer form state
  const [empFirstName, setEmpFirstName] = useState('')
  const [empLastName, setEmpLastName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [otherIndustry, setOtherIndustry] = useState('')
  const [busEmail, setBusEmail] = useState('')
  const [empPassword, setEmpPassword] = useState('')
  const [empConfirmPassword, setEmpConfirmPassword] = useState('')
  const [empEmailAvailable, setEmpEmailAvailable] = useState(null)
  const [empPasswordValidation, setEmpPasswordValidation] = useState({ isValid: false, requirements: {} })

  // Candidate form state
  const [candFirstName, setCandFirstName] = useState('')
  const [candLastName, setCandLastName] = useState('')
  const [candEmail, setCandEmail] = useState(inviteEmail || '')
  const [linkedIn, setLinkedIn] = useState('')
  const [candPassword, setCandPassword] = useState('')
  const [candConfirmPassword, setCandConfirmPassword] = useState('')
  const [candEmailAvailable, setCandEmailAvailable] = useState(null)
  const [candPasswordValidation, setCandPasswordValidation] = useState({ isValid: false, requirements: {} })

  // Resume file state
  const [resumeFile, setResumeFile] = useState(null)
  const [resumeError, setResumeError] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Debounced email check
  const checkEmailAvailability = useCallback(async (email, setAvailable) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAvailable(null)
      return
    }
    try {
      const response = await authAPI.checkEmail(email)
      setAvailable(!response.data?.exists)
    } catch (err) {
      setAvailable(null)
    }
  }, [])

  // Check employer email with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      checkEmailAvailability(busEmail, setEmpEmailAvailable)
    }, 500)
    return () => clearTimeout(timer)
  }, [busEmail, checkEmailAvailability])

  // Check candidate email with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      checkEmailAvailability(candEmail, setCandEmailAvailable)
    }, 500)
    return () => clearTimeout(timer)
  }, [candEmail, checkEmailAvailability])

  // Validate passwords on change
  useEffect(() => {
    setEmpPasswordValidation(validatePassword(empPassword))
  }, [empPassword])

  useEffect(() => {
    setCandPasswordValidation(validatePassword(candPassword))
  }, [candPassword])

  // Handle resume file selection
  const handleResumeSelect = (e) => {
    const file = e.target.files?.[0]
    setResumeError('')

    if (!file) {
      setResumeFile(null)
      return
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      setResumeError('Please upload a PDF, DOC, or DOCX file')
      setResumeFile(null)
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setResumeError('File size must be less than 10MB')
      setResumeFile(null)
      return
    }

    setResumeFile(file)
  }

  const handleEmployerSignUp = async (e) => {
    e.preventDefault()

    // Validate email availability
    if (empEmailAvailable === false) {
      setError('This email is already registered')
      return
    }

    // Validate password
    if (!empPasswordValidation.isValid) {
      setError('Password does not meet requirements')
      return
    }

    if (empPassword !== empConfirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')
    const result = await signUp(busEmail, empPassword, {
      firstName: empFirstName,
      lastName: empLastName,
      companyName,
      industry: industry === 'other' ? otherIndustry : industry,
      role: 'employer'
    })
    if (result.success) {
      // Clear auth state since user needs to verify email
      localStorage.removeItem('access_token')
      setSignupEmail(busEmail)
      setSignupComplete(true)
    } else {
      setError(result.error || 'Sign up failed')
    }
    setLoading(false)
  }

  const handleCandidateSignUp = async (e) => {
    e.preventDefault()

    // Validate email availability
    if (candEmailAvailable === false) {
      setError('This email is already registered')
      return
    }

    // Validate password
    if (!candPasswordValidation.isValid) {
      setError('Password does not meet requirements')
      return
    }

    if (candPassword !== candConfirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')

    // First create the account
    const result = await signUp(candEmail, candPassword, {
      firstName: candFirstName,
      lastName: candLastName,
      linkedIn,
      role: 'candidate'
    })

    if (result.success) {
      // If resume file selected, upload it
      if (resumeFile) {
        try {
          await profileAPI.uploadResume(resumeFile)
        } catch (uploadErr) {
          console.error('Resume upload failed:', uploadErr)
          // Don't block signup, just warn
        }
      }
      // Clear auth state since user needs to verify email
      localStorage.removeItem('access_token')
      setSignupEmail(candEmail)
      setSignupComplete(true)
    } else {
      setError(result.error || 'Sign up failed')
    }
    setLoading(false)
  }

  // Show verification success screen after signup
  if (signupComplete) {
    return (
      <div className="flex-grow flex items-center justify-center py-16 px-4 bg-background-light dark:bg-background-dark">
        <div className="max-w-md w-full bg-card-light dark:bg-card-dark rounded-2xl shadow-xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-4">
              <span className="material-icons text-primary text-4xl">
                mail
              </span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Check your email
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            We've sent a verification link to:
          </p>
          <p className="text-primary font-medium mb-6">
            {signupEmail}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Click the link in your email to verify your account. The link will expire in 24 hours.
          </p>
          <div className="space-y-3">
            <Link
              to="/login-page"
              className="block w-full py-3 px-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors"
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
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-background-light dark:bg-background-dark">
      {/* Invitation Banner */}
      {isInvite && inviteEmail && (
        <div className="mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 px-4 py-3 rounded-lg flex items-center gap-3">
            <span className="material-icons">celebration</span>
            <span>You've been invited! Create your account with <strong>{inviteEmail}</strong> to accept the invitation.</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Employer Registration Card */}
        <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700">
          <div className="bg-primary text-center py-3 rounded-lg mb-6">
            <h2 className="text-white font-semibold text-lg">For Employers</h2>
          </div>
          <p className="text-center text-text-sub-light dark:text-text-sub-dark mb-8 text-sm px-4">
            Get started with your hiring journey by creating your employer account
          </p>

          <form onSubmit={handleEmployerSignUp} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="emp_firstname">
                First Name
              </label>
              <input
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                id="emp_firstname"
                type="text"
                value={empFirstName}
                onChange={(e) => setEmpFirstName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="emp_lastname">
                Last Name
              </label>
              <input
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                id="emp_lastname"
                type="text"
                value={empLastName}
                onChange={(e) => setEmpLastName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="industry">
                Industry
              </label>
              <select
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                required
              >
                <option value="">Select your industry</option>
                <option value="software_development">Software Development</option>
                <option value="it_consulting">IT Consulting</option>
                <option value="mep_engineering">MEP Engineering</option>
                <option value="energy_consulting">Energy Consulting</option>
                <option value="building_information_modeling">Building Information Modeling</option>
                <option value="architectural_designs">Architectural Designs</option>
                <option value="product_design">Product Design</option>
                <option value="engineering_analysis">Engineering Analysis</option>
                <option value="accounting">Accounting</option>
                <option value="construction_management">Construction Management</option>
                <option value="legal_services">Legal Services</option>
                <option value="healthcare_services">Healthcare Services</option>
                <option value="office_administration">Office Administration</option>
                <option value="other">Other</option>
              </select>
            </div>

            {industry === 'other' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="other_industry">
                  Other Industry (if not listed)
                </label>
                <input
                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                  id="other_industry"
                  type="text"
                  value={otherIndustry}
                  onChange={(e) => setOtherIndustry(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="company_name">
                Company / Organization Name
              </label>
              <input
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                id="company_name"
                type="text"
                placeholder="Enter your company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="bus_email">
                Business Email Address
              </label>
              <input
                className={`block w-full rounded-lg shadow-sm sm:text-sm py-2.5 placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-800 dark:text-white ${
                  empEmailAvailable === false
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : empEmailAvailable === true
                    ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                    : 'border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary'
                }`}
                id="bus_email"
                type="email"
                placeholder="Enter business email address"
                value={busEmail}
                onChange={(e) => setBusEmail(e.target.value)}
                required
              />
              {empEmailAvailable === false && (
                <p className="mt-1 text-sm text-red-600">This email is already registered</p>
              )}
              {empEmailAvailable === true && busEmail && (
                <p className="mt-1 text-sm text-green-600">Email is available</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="emp_password">
                Password
              </label>
              <input
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                id="emp_password"
                type="password"
                value={empPassword}
                onChange={(e) => setEmpPassword(e.target.value)}
                required
              />
              {empPassword && (
                <div className="mt-2 text-xs space-y-1">
                  <p className={empPasswordValidation.requirements.minLength ? 'text-green-600' : 'text-gray-500'}>
                    {empPasswordValidation.requirements.minLength ? '✓' : '○'} At least 8 characters
                  </p>
                  <p className={empPasswordValidation.requirements.hasUppercase ? 'text-green-600' : 'text-gray-500'}>
                    {empPasswordValidation.requirements.hasUppercase ? '✓' : '○'} One uppercase letter
                  </p>
                  <p className={empPasswordValidation.requirements.hasLowercase ? 'text-green-600' : 'text-gray-500'}>
                    {empPasswordValidation.requirements.hasLowercase ? '✓' : '○'} One lowercase letter
                  </p>
                  <p className={empPasswordValidation.requirements.hasNumber ? 'text-green-600' : 'text-gray-500'}>
                    {empPasswordValidation.requirements.hasNumber ? '✓' : '○'} One number
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="emp_confirm_password">
                Confirm Password
              </label>
              <input
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                id="emp_confirm_password"
                type="password"
                value={empConfirmPassword}
                onChange={(e) => setEmpConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>

            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
              Already have an account?{' '}
              <Link className="font-medium text-primary hover:text-primary-hover" to="/login-page">
                Log in
              </Link>
            </p>
          </form>
        </div>

        {/* Candidate Registration Card */}
        <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700">
          <div className="bg-primary text-center py-3 rounded-lg mb-6">
            <h2 className="text-white font-semibold text-lg">For Candidates</h2>
          </div>
          <p className="text-center text-text-sub-light dark:text-text-sub-dark mb-8 text-sm px-4">
            Fill in your information to get started & find best roles that fits your skills & experience
          </p>

          <form onSubmit={handleCandidateSignUp} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="cand_firstname">
                First Name
              </label>
              <input
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                id="cand_firstname"
                type="text"
                value={candFirstName}
                onChange={(e) => setCandFirstName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="cand_lastname">
                Last Name
              </label>
              <input
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                id="cand_lastname"
                type="text"
                value={candLastName}
                onChange={(e) => setCandLastName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="cand_email">
                Email
              </label>
              <input
                className={`block w-full rounded-lg shadow-sm sm:text-sm py-2.5 dark:bg-gray-800 dark:text-white ${
                  candEmailAvailable === false
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : candEmailAvailable === true
                    ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                    : 'border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary'
                }`}
                id="cand_email"
                type="email"
                value={candEmail}
                onChange={(e) => setCandEmail(e.target.value)}
                required
              />
              {candEmailAvailable === false && (
                <p className="mt-1 text-sm text-red-600">This email is already registered</p>
              )}
              {candEmailAvailable === true && candEmail && (
                <p className="mt-1 text-sm text-green-600">Email is available</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Resume/Portfolio (Optional)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleResumeSelect}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${resumeFile ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600'} border-dashed rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer`}
              >
                <div className="space-y-1 text-center">
                  {resumeFile ? (
                    <>
                      <span className="material-icons-outlined text-green-500 text-3xl">check_circle</span>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        {resumeFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Click to change file
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="material-icons-outlined text-gray-400 dark:text-gray-500 text-3xl">upload_file</span>
                      <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                        <span className="relative font-medium text-primary hover:text-primary-hover">
                          Click to upload resume/portfolio
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        PDF, DOC, DOCX files only
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-600">
                        Max file size: 10 MB
                      </p>
                    </>
                  )}
                </div>
              </div>
              {resumeError && (
                <p className="mt-1 text-sm text-red-600">{resumeError}</p>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="cand_password">
                Password
              </label>
              <input
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                id="cand_password"
                type="password"
                value={candPassword}
                onChange={(e) => setCandPassword(e.target.value)}
                required
              />
              {candPassword && (
                <div className="mt-2 text-xs space-y-1">
                  <p className={candPasswordValidation.requirements.minLength ? 'text-green-600' : 'text-gray-500'}>
                    {candPasswordValidation.requirements.minLength ? '✓' : '○'} At least 8 characters
                  </p>
                  <p className={candPasswordValidation.requirements.hasUppercase ? 'text-green-600' : 'text-gray-500'}>
                    {candPasswordValidation.requirements.hasUppercase ? '✓' : '○'} One uppercase letter
                  </p>
                  <p className={candPasswordValidation.requirements.hasLowercase ? 'text-green-600' : 'text-gray-500'}>
                    {candPasswordValidation.requirements.hasLowercase ? '✓' : '○'} One lowercase letter
                  </p>
                  <p className={candPasswordValidation.requirements.hasNumber ? 'text-green-600' : 'text-gray-500'}>
                    {candPasswordValidation.requirements.hasNumber ? '✓' : '○'} One number
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="cand_confirm_password">
                Confirm Password
              </label>
              <input
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-800 dark:text-white sm:text-sm py-2.5"
                id="cand_confirm_password"
                type="password"
                value={candConfirmPassword}
                onChange={(e) => setCandConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Create Candidate Account'}
              </button>
            </div>

            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
              Already have an account?{' '}
              <Link className="font-medium text-primary hover:text-primary-hover" to="/login-page">
                Log in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
