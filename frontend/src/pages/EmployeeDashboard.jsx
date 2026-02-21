import { useState, useEffect, useRef } from 'react'
import { dashboardService } from '../services/dashboardService'
import { payrollService } from '../services/payrollService'
import { benefitsService } from '../services/benefitsService'
import { documentsService } from '../services/documentsService'
import { useAuthStore } from '../store/authStore'

export default function EmployeeDashboard() {
  const { profile, membership, pendingInvitations, acceptInvitation, declineInvitation } = useAuthStore()
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [holidays, setHolidays] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [payslips, setPayslips] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [invitationLoading, setInvitationLoading] = useState(null) // Track which invitation is being processed
  const processingRef = useRef(false) // Prevent duplicate calls

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'payroll', label: 'Payroll & Benefits' },
    { id: 'timeoff', label: 'Time Off' },
    { id: 'documents', label: 'Documents' },
    { id: 'company', label: 'Company Info' },
  ]

  // Get current date
  const today = new Date()
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch all data in parallel
        const [statsData, holidaysData, announcementsData] = await Promise.all([
          dashboardService.getEmployeeStats(),
          dashboardService.getHolidays(6),
          dashboardService.getAnnouncements(3)
        ])

        setStats(statsData)
        setHolidays(holidaysData)
        setAnnouncements(announcementsData)
      } catch (err) {
        console.error('Employee dashboard fetch error:', err)
        setError(err.message || 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Fetch tab-specific data when tab changes
  useEffect(() => {
    const memberId = membership?.id
    if (!memberId) return

    if (activeTab === 'payroll' && payslips.length === 0) {
      payrollService.getEmployeePayrollHistory(memberId, 10)
        .then(data => setPayslips(data || []))
        .catch(err => console.error('Failed to fetch payslips:', err))

      benefitsService.getActiveCoverage(memberId)
        .then(data => setEnrollments(data || []))
        .catch(err => console.error('Failed to fetch enrollments:', err))
    }

    if (activeTab === 'documents' && documents.length === 0) {
      documentsService.getMemberDocuments(memberId)
        .then(data => setDocuments(data || []))
        .catch(err => console.error('Failed to fetch documents:', err))
    }
  }, [activeTab, membership?.id])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-subtext-light dark:text-subtext-dark">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <span className="material-icons-outlined text-red-500 text-4xl mb-4">error_outline</span>
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

  // Handle accepting an invitation
  const handleAcceptInvitation = async (memberId) => {
    // Prevent duplicate calls
    if (processingRef.current) return
    processingRef.current = true

    setInvitationLoading(memberId)
    try {
      const result = await acceptInvitation(memberId)
      if (result.success) {
        // Refresh the page to load the employee dashboard with organization data
        window.location.reload()
      } else {
        // If already accepted, treat as success and reload
        if (result.error?.includes('already accepted')) {
          window.location.reload()
        } else {
          setError(result.error || 'Failed to accept invitation')
        }
      }
    } catch (err) {
      // If already accepted, treat as success and reload
      if (err.message?.includes('already accepted')) {
        window.location.reload()
      } else {
        setError(err.message || 'Failed to accept invitation')
      }
    } finally {
      setInvitationLoading(null)
      processingRef.current = false
    }
  }

  // Handle declining an invitation
  const handleDeclineInvitation = async (memberId) => {
    setInvitationLoading(memberId)
    try {
      await declineInvitation(memberId)
    } catch (err) {
      setError(err.message || 'Failed to decline invitation')
    } finally {
      setInvitationLoading(null)
    }
  }

  // Pending Invitations Banner Component
  const PendingInvitationsBanner = () => {
    if (!pendingInvitations || pendingInvitations.length === 0) return null

    return (
      <div className="mb-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-full">
              <span className="material-icons-outlined text-blue-600 dark:text-blue-400 text-2xl">mail</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                You have {pendingInvitations.length} pending invitation{pendingInvitations.length > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Accept an invitation to join an organization and access your employee dashboard.
              </p>

              <div className="space-y-4">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.memberId}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {invitation.organizationLogo ? (
                          <img
                            src={invitation.organizationLogo}
                            alt={invitation.organizationName}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <span className="material-icons-outlined text-gray-400 text-xl">business</span>
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {invitation.organizationName || 'Organization'}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {invitation.jobTitle || 'Team Member'}
                            {invitation.department && ` - ${invitation.department}`}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Invited {invitation.invitedAt ? new Date(invitation.invitedAt).toLocaleDateString() : 'recently'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeclineInvitation(invitation.memberId)}
                          disabled={invitationLoading === invitation.memberId}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleAcceptInvitation(invitation.memberId)}
                          disabled={invitationLoading === invitation.memberId}
                          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition disabled:opacity-50 flex items-center gap-2"
                        >
                          {invitationLoading === invitation.memberId ? (
                            <>
                              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                              Processing...
                            </>
                          ) : (
                            <>Accept</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Employee Dashboard</h2>
        <p className="text-sm text-subtext-light dark:text-subtext-dark mt-2 md:mt-0 font-medium">{dateString}</p>
      </header>

      {/* Pending Invitations Banner */}
      <PendingInvitationsBanner />

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-surface-dark rounded-lg shadow-sm mb-8 overflow-hidden border border-border-light dark:border-border-dark">
        <nav className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary bg-blue-50/50 dark:bg-primary/10'
                  : 'text-subtext-light dark:text-subtext-dark hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Time Off Balance */}
            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm text-subtext-light dark:text-subtext-dark font-medium">Time Off Balance</span>
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <span className="material-icons-outlined text-green-600 dark:text-green-400 text-lg">calendar_today</span>
                </div>
              </div>
              <div className="flex items-baseline">
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.timeOff?.available || 0} days</h3>
              </div>
              <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">available</p>
            </div>

            {/* Next Payday */}
            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm text-subtext-light dark:text-subtext-dark font-medium">Next Payday</span>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <span className="material-icons-outlined text-blue-600 dark:text-blue-400 text-lg">attach_money</span>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.nextPayday?.formatted || 'End of Month'}</h3>
            </div>

            {/* Benefits Coverage */}
            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm text-subtext-light dark:text-subtext-dark font-medium">Benefits Coverage</span>
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                  <span className="material-icons-outlined text-yellow-600 dark:text-yellow-400 text-lg">verified_user</span>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.benefits?.status || 'Active'}</h3>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Upcoming Time Off */}
            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark min-h-[400px] flex flex-col">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Upcoming Time Off</h3>
              {stats?.upcomingTimeOff?.length > 0 ? (
                <div className="space-y-4">
                  {stats.upcomingTimeOff.map((request, index) => (
                    <div key={request.id || index} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{request.type || 'Time Off'}</h4>
                        <p className="text-sm text-subtext-light dark:text-subtext-dark mt-0.5">
                          {new Date(request.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {request.end_date !== request.start_date && ` - ${new Date(request.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                        </p>
                      </div>
                      <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-2.5 py-1 rounded">
                        Approved
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <span className="material-icons-outlined text-gray-400 text-3xl">event_busy</span>
                  </div>
                  <p className="text-subtext-light dark:text-subtext-dark">No upcoming time off scheduled.</p>
                  <button
                    onClick={() => setActiveTab('timeoff')}
                    className="mt-4 text-sm font-medium text-primary hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                  >
                    Request Time Off
                  </button>
                </div>
              )}
            </div>

            {/* Upcoming Holidays */}
            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Upcoming Holidays</h3>
              {holidays.length > 0 ? (
                <div className="space-y-4">
                  {holidays.map((holiday, index) => (
                    <div key={holiday.id || index} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{holiday.name}</h4>
                        <p className="text-sm text-subtext-light dark:text-subtext-dark mt-0.5">{holiday.date}</p>
                      </div>
                      {holiday.paid && (
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-2.5 py-1 rounded">
                          Paid
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <span className="material-icons-outlined text-gray-400 text-3xl">event</span>
                  </div>
                  <p className="text-subtext-light dark:text-subtext-dark">No upcoming holidays scheduled.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Company Announcements */}
          <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recent Company Announcements</h3>
            {announcements.length > 0 ? (
              <div className="space-y-4">
                {announcements.map((announcement, index) => (
                  <div key={announcement.id || index} className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-lg">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white text-base">{announcement.title}</h4>
                        {announcement.isPinned && (
                          <span className="material-icons-outlined text-yellow-500 text-sm">push_pin</span>
                        )}
                      </div>
                      <span className="text-sm text-subtext-light dark:text-subtext-dark shrink-0">{announcement.date}</span>
                    </div>
                    <p className="text-subtext-light dark:text-subtext-dark text-sm leading-relaxed">
                      {announcement.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <span className="material-icons-outlined text-gray-400 text-3xl">campaign</span>
                </div>
                <p className="text-subtext-light dark:text-subtext-dark">No announcements yet.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Payroll & Benefits Tab */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          {/* Your Compensation */}
          <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Your Compensation</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-subtext-light dark:text-subtext-dark mb-1">Annual Salary</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.membership?.salary_amount
                    ? `${stats.membership.salary_currency || 'USD'} ${stats.membership.salary_amount.toLocaleString()}`
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

          {/* Recent Payslips */}
          <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Payslips</h3>
            </div>
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
              <div className="flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <span className="material-icons-outlined text-gray-400 text-3xl">receipt_long</span>
                </div>
                <p className="text-subtext-light dark:text-subtext-dark">No payslips available yet.</p>
                <p className="text-sm text-gray-400 mt-2">Payslips will appear here after your first pay period.</p>
              </div>
            )}
          </div>

          {/* Benefits Enrollment */}
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
              <div className="flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <span className="material-icons-outlined text-gray-400 text-3xl">health_and_safety</span>
                </div>
                <p className="text-subtext-light dark:text-subtext-dark">No benefits enrolled.</p>
                <p className="text-sm text-gray-400 mt-2">Contact your HR administrator to enroll in benefits.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Time Off Tab */}
      {activeTab === 'timeoff' && (
        <div className="space-y-6">
          {/* Balance Card */}
          <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Balance</h3>
              <button className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition flex items-center gap-2">
                <span className="material-icons-outlined text-lg">add</span>
                Request Time Off
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-sm text-subtext-light dark:text-subtext-dark mb-1">Annual Leave</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.timeOff?.available || 15} days
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.timeOff?.used || 0} used of {(stats?.timeOff?.available || 15) + (stats?.timeOff?.used || 0)}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-sm text-subtext-light dark:text-subtext-dark mb-1">Sick Leave</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">10 days</p>
                <p className="text-xs text-gray-500 mt-1">0 used of 10</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-sm text-subtext-light dark:text-subtext-dark mb-1">Personal Days</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">3 days</p>
                <p className="text-xs text-gray-500 mt-1">0 used of 3</p>
              </div>
            </div>
          </div>

          {/* Request History */}
          <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Request History</h3>
            {stats?.upcomingTimeOff?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-subtext-light dark:text-subtext-dark">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-subtext-light dark:text-subtext-dark">Dates</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-subtext-light dark:text-subtext-dark">Days</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-subtext-light dark:text-subtext-dark">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.upcomingTimeOff.map((request, index) => (
                      <tr key={request.id || index} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{request.type || 'Annual'}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(request.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {request.end_date !== request.start_date && ` - ${new Date(request.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {Math.ceil((new Date(request.end_date) - new Date(request.start_date)) / (1000 * 60 * 60 * 24)) + 1}
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-2.5 py-1 rounded">
                            Approved
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <span className="material-icons-outlined text-gray-400 text-3xl">event_available</span>
                </div>
                <p className="text-subtext-light dark:text-subtext-dark">No time off requests yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">My Documents</h3>
          {documents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-subtext-light dark:text-subtext-dark">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-subtext-light dark:text-subtext-dark">Category</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-subtext-light dark:text-subtext-dark">Uploaded</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-subtext-light dark:text-subtext-dark">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc, index) => (
                    <tr key={doc.id || index} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className="material-icons-outlined text-gray-400">
                            {doc.file_type?.includes('pdf') ? 'picture_as_pdf' : 'insert_drive_file'}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize">
                          {doc.category || 'other'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {doc.file_url && (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary-hover text-sm font-medium flex items-center gap-1"
                          >
                            <span className="material-icons-outlined text-base">download</span>
                            Download
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <span className="material-icons-outlined text-gray-400 text-3xl">folder_open</span>
              </div>
              <p className="text-subtext-light dark:text-subtext-dark">No documents available.</p>
              <p className="text-sm text-gray-400 mt-2">Your employment documents will appear here once uploaded by HR.</p>
            </div>
          )}
        </div>
      )}

      {/* Company Info Tab */}
      {activeTab === 'company' && (
        <div className="space-y-6">
          {/* Organization */}
          <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Organization</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-subtext-light dark:text-subtext-dark">Company Name</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {stats?.membership?.organization?.name || 'Not specified'}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-subtext-light dark:text-subtext-dark">Industry</span>
                <span className="font-medium text-gray-900 dark:text-white capitalize">
                  {stats?.membership?.organization?.industry?.replace(/_/g, ' ') || 'Not specified'}
                </span>
              </div>
            </div>
          </div>

          {/* Your Role */}
          <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Your Role</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-subtext-light dark:text-subtext-dark">Job Title</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {stats?.membership?.job_title || 'Not specified'}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-subtext-light dark:text-subtext-dark">Department</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {stats?.membership?.department || 'Not specified'}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-subtext-light dark:text-subtext-dark">Employment Type</span>
                <span className="font-medium text-gray-900 dark:text-white capitalize">
                  {stats?.membership?.employment_type?.replace(/_/g, ' ') || 'Full Time'}
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-subtext-light dark:text-subtext-dark">Start Date</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {stats?.membership?.start_date
                    ? new Date(stats.membership.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    : 'Not specified'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-border-light dark:border-border-dark pt-8 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-1">
            <p className="text-sm text-subtext-light dark:text-subtext-dark mb-4">
              Simplify your HR processes with our all-in-one platform for compliance, payroll, and benefits.
            </p>
            <div className="flex space-x-4">
              <a className="text-gray-400 hover:text-primary transition-colors" href="#">
                <span className="material-icons-outlined text-xl">camera_alt</span>
              </a>
              <a className="text-gray-400 hover:text-primary transition-colors" href="#">
                <span className="material-icons-outlined text-xl">alternate_email</span>
              </a>
            </div>
          </div>
          <div>
            <h5 className="font-semibold text-gray-900 dark:text-white mb-3">Product</h5>
            <ul className="space-y-2 text-sm text-subtext-light dark:text-subtext-dark">
              <li><a className="hover:text-primary" href="#">Global Hiring</a></li>
              <li><a className="hover:text-primary" href="#">Payroll</a></li>
              <li><a className="hover:text-primary" href="#">Compliance</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-gray-900 dark:text-white mb-3">Resources</h5>
            <ul className="space-y-2 text-sm text-subtext-light dark:text-subtext-dark">
              <li><a className="hover:text-primary" href="#">Blog</a></li>
              <li><a className="hover:text-primary" href="#">Help Center</a></li>
              <li><a className="hover:text-primary" href="#">Guides</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-gray-900 dark:text-white mb-3">Subscribe to our newsletter</h5>
            <div className="flex gap-2">
              <input
                className="bg-gray-100 dark:bg-gray-800 border-none text-sm rounded px-3 py-2 w-full text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
                placeholder="Your email address"
                type="email"
              />
              <button className="bg-primary hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center text-xs text-subtext-light dark:text-subtext-dark border-t border-gray-100 dark:border-gray-800 pt-4">
          <p>&copy; {new Date().getFullYear()} Talyn Inc. All rights reserved.</p>
          <div className="flex gap-4 mt-2 md:mt-0">
            <a className="hover:text-primary" href="#">Privacy Policy</a>
            <a className="hover:text-primary" href="#">Terms of Service</a>
            <a className="hover:text-primary" href="#">Cookie Policy</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
