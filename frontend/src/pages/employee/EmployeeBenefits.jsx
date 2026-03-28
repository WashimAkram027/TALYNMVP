import { useState, useEffect } from 'react'
import { benefitsService } from '../../services/benefitsService'
import { useAuthStore } from '../../store/authStore'
import EmptyState from '../../components/employee/EmptyState'

export default function EmployeeBenefits() {
  const { membership } = useAuthStore()
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const memberId = membership?.id
        if (memberId) {
          const data = await benefitsService.getActiveCoverage(memberId)
          setEnrollments(data || [])
        }
      } catch (err) {
        console.error('Benefits fetch error:', err)
        setError(err.message || 'Failed to load benefits data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [membership?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-subtext-light dark:text-subtext-dark">Loading benefits...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <span className="material-icons-outlined text-red-500 text-4xl mb-4 block">error_outline</span>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Benefits</h1>
        <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">Your active benefit enrollments</p>
      </header>

      {/* Enrollments */}
      <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Benefits Enrollment</h3>
        {enrollments.length > 0 ? (
          <div className="space-y-4">
            {enrollments.map((enrollment, index) => (
              <div key={enrollment.id || index} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{enrollment.plan_name || enrollment.name || 'Benefit Plan'}</h4>
                  <p className="text-sm text-subtext-light dark:text-subtext-dark mt-0.5">
                    {enrollment.type || enrollment.plan_type || 'Coverage'}
                    {enrollment.provider && ` - ${enrollment.provider}`}
                  </p>
                </div>
                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-2.5 py-1 rounded">
                  Active
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="health_and_safety"
            title="No benefits enrolled"
            description="Contact your HR administrator to learn about available benefit plans"
          />
        )}
      </div>
    </div>
  )
}
