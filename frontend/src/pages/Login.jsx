import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()

  // Employer form state
  const [employerEmail, setEmployerEmail] = useState('')
  const [employerPassword, setEmployerPassword] = useState('')

  // Candidate form state
  const [candidateEmail, setCandidateEmail] = useState('')
  const [candidatePassword, setCandidatePassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmployerLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await login(employerEmail, employerPassword, 'employer')

    if (result.success) {
      navigate('/dashboard', { replace: true })
    } else {
      setError(result.error || 'Login failed')
    }
    setLoading(false)
  }

  const handleCandidateLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await login(candidateEmail, candidatePassword, 'candidate')

    if (result.success) {
      navigate('/dashboard-employee', { replace: true })
    } else {
      setError(result.error || 'Login failed')
    }
    setLoading(false)
  }

  return (
    <div className="flex-grow flex flex-col justify-center py-16 px-4 sm:px-6 lg:px-8 bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl tracking-tight">
          Welcome Back
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400">
          Access your dashboard to manage talent or find your next opportunity.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-6xl mx-auto w-full mb-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {/* Login Cards */}
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Employer Login Card */}
        <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col hover:shadow-2xl transition-all duration-300 relative group">
          <div className="h-1.5 w-full bg-primary absolute top-0 left-0"></div>
          <div className="p-8 sm:p-10 flex-grow">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Employer Login</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Hire top talent & manage payroll</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-full">
                <span className="material-icons text-primary text-3xl">business_center</span>
              </div>
            </div>

            <form onSubmit={handleEmployerLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="employer-email">
                  Work Email
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-icons text-gray-400 text-[20px]">mail</span>
                  </div>
                  <input
                    className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg py-3 transition-colors"
                    id="employer-email"
                    name="employer-email"
                    type="email"
                    placeholder="hr@company.com"
                    value={employerEmail}
                    onChange={(e) => setEmployerEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="employer-password">
                  Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-icons text-gray-400 text-[20px]">lock</span>
                  </div>
                  <input
                    className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg py-3 transition-colors"
                    id="employer-password"
                    name="employer-password"
                    type="password"
                    placeholder="••••••••"
                    value={employerPassword}
                    onChange={(e) => setEmployerPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end">
                <div className="text-sm">
                  <span className="font-medium text-gray-400 dark:text-gray-500 cursor-default" title="Coming soon">
                    Forgot password?
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in...' : 'Login as Employer'}
              </button>
            </form>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 px-8 py-4 border-t border-gray-100 dark:border-gray-700 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link className="font-semibold text-primary hover:text-blue-500 transition-colors" to="/sign-up">
                Register Company
              </Link>
            </p>
          </div>
        </div>

        {/* Candidate Login Card */}
        <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col hover:shadow-2xl transition-all duration-300 relative group">
          <div className="h-1.5 w-full bg-candidate-btn absolute top-0 left-0"></div>
          <div className="p-8 sm:p-10 flex-grow">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Candidate Login</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Find jobs & track applications</p>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-full">
                <span className="material-icons text-candidate-btn text-3xl">person</span>
              </div>
            </div>

            <form onSubmit={handleCandidateLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="candidate-email">
                  Email Address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-icons text-gray-400 text-[20px]">mail</span>
                  </div>
                  <input
                    className="focus:ring-candidate-btn focus:border-candidate-btn block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg py-3 transition-colors"
                    id="candidate-email"
                    name="candidate-email"
                    type="email"
                    placeholder="you@example.com"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="candidate-password">
                  Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-icons text-gray-400 text-[20px]">lock</span>
                  </div>
                  <input
                    className="focus:ring-candidate-btn focus:border-candidate-btn block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg py-3 transition-colors"
                    id="candidate-password"
                    name="candidate-password"
                    type="password"
                    placeholder="••••••••"
                    value={candidatePassword}
                    onChange={(e) => setCandidatePassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end">
                <div className="text-sm">
                  <span className="font-medium text-gray-400 dark:text-gray-500 cursor-default" title="Coming soon">
                    Forgot password?
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-candidate-btn hover:bg-candidate-btn-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-candidate-btn transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in...' : 'Login as Candidate'}
              </button>
            </form>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 px-8 py-4 border-t border-gray-100 dark:border-gray-700 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link className="font-semibold text-candidate-btn hover:text-candidate-btn-hover transition-colors" to="/sign-up">
                Register Candidate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
