import { useState, useEffect } from 'react'
import { dashboardService } from '../../services/dashboardService'
import { payrollService } from '../../services/payrollService'
import { useAuthStore } from '../../store/authStore'
import EmptyState from '../../components/employee/EmptyState'

export default function EmployeePayroll() {
  const { membership } = useAuthStore()
  const [stats, setStats] = useState(null)
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const memberId = membership?.id

        const [statsData, payslipsData] = await Promise.all([
          dashboardService.getEmployeeStats(),
          memberId ? payrollService.getEmployeePayrollHistory(memberId, 10) : Promise.resolve([])
        ])

        setStats(statsData)
        setPayslips(payslipsData || [])
      } catch (err) {
        console.error('Payroll fetch error:', err)
        setError(err.message || 'Failed to load payroll data')
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
          <p className="text-subtext-light dark:text-subtext-dark">Loading payroll...</p>
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Payroll</h1>
        <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">View your compensation and payslip history</p>
      </header>

      {/* Compensation Summary */}
      <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Your Compensation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-subtext-light dark:text-subtext-dark mb-1">Annual Salary</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats?.membership?.salary_amount
                ? `${stats.membership.salary_currency || 'NPR'} ${stats.membership.salary_amount.toLocaleString()}`
                : 'Not specified'}
            </p>
          </div>
          <div>
            <p className="text-sm text-subtext-light dark:text-subtext-dark mb-1">Pay Frequency</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
              {stats?.membership?.pay_frequency || 'Monthly'}
            </p>
          </div>
          <div>
            <p className="text-sm text-subtext-light dark:text-subtext-dark mb-1">Next Payday</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats?.nextPayday?.formatted || 'End of Month'}
            </p>
          </div>
        </div>
      </div>

      {/* Payslips Table */}
      <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recent Payslips</h3>
        {payslips.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-subtext-light dark:text-subtext-dark">Period</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-subtext-light dark:text-subtext-dark">Pay Date</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-subtext-light dark:text-subtext-dark">Net Pay</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-subtext-light dark:text-subtext-dark">Status</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map((slip, index) => (
                  <tr key={slip.id || index} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {slip.payroll_run?.pay_period_start ? new Date(slip.payroll_run.pay_period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                      {slip.payroll_run?.pay_period_end ? ` - ${new Date(slip.payroll_run.pay_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {slip.payroll_run?.pay_date ? new Date(slip.payroll_run.pay_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                      {slip.currency || 'NPR'} {(slip.net_pay || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded ${
                        slip.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {slip.status ? slip.status.charAt(0).toUpperCase() + slip.status.slice(1) : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="receipt_long"
            title="No payslips available yet"
            description="Payslips will appear here after your first pay period is processed"
          />
        )}
      </div>
    </div>
  )
}
