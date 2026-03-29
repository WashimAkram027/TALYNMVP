import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { dashboardService } from '../../services/dashboardService'
import { useAuthStore } from '../../store/authStore'
import PendingInvitationsBanner from '../../components/employee/PendingInvitationsBanner'
import OnboardingTodoList from '../../components/employee/OnboardingTodoList'
import EmptyState from '../../components/employee/EmptyState'

export default function EmployeeOverview() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [holidays, setHolidays] = useState([])
  const [nepalHolidays, setNepalHolidays] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [pendingTasks, setPendingTasks] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const today = new Date()
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const firstName = profile?.first_name || profile?.full_name?.split(' ')[0] || 'there'

  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      setError(null)
      const [statsData, holidaysData, nepalData, announcementsData] = await Promise.all([
        dashboardService.getEmployeeStats(),
        dashboardService.getHolidays(6),
        dashboardService.getNepalPublicHolidays(6),
        dashboardService.getAnnouncements(3)
      ])
      setStats(statsData)
      setPendingTasks(statsData?.pendingOnboardingTasks || null)
      setHolidays(holidaysData)
      setNepalHolidays(nepalData || [])
      setAnnouncements(announcementsData)
    } catch (err) {
      console.error('Employee dashboard fetch error:', err)
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  // Refresh data without showing loading spinner (for task completion callbacks)
  const refreshData = useCallback(() => fetchData(false), [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">Here's what's happening today</p>
        </div>
        <p className="text-sm text-subtext-light dark:text-subtext-dark mt-2 md:mt-0 font-medium">{dateString}</p>
      </header>

      {/* Pending Invitations */}
      <PendingInvitationsBanner />

      {/* Onboarding Todo Checklist */}
      <OnboardingTodoList tasks={pendingTasks} onTaskComplete={refreshData} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm text-subtext-light dark:text-subtext-dark font-medium">Time Off Balance</span>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
              <span className="material-icons-outlined text-green-600 dark:text-green-400 text-lg">calendar_today</span>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.timeOff?.available || 0} days</h3>
          <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">available</p>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm text-subtext-light dark:text-subtext-dark font-medium">Next Payday</span>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <span className="material-icons-outlined text-blue-600 dark:text-blue-400 text-lg">attach_money</span>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.nextPayday?.formatted || 'End of Month'}</h3>
        </div>

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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          to="/employee/time-off"
          className="flex items-center gap-4 p-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark hover:shadow-md hover:border-primary/30 transition-all group"
        >
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
            <span className="material-icons-outlined text-blue-600 dark:text-blue-400">event_available</span>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Request Time Off</p>
            <p className="text-xs text-subtext-light dark:text-subtext-dark">View balances & submit requests</p>
          </div>
        </Link>

        <Link
          to="/employee/payroll"
          className="flex items-center gap-4 p-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark hover:shadow-md hover:border-primary/30 transition-all group"
        >
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors">
            <span className="material-icons-outlined text-green-600 dark:text-green-400">payments</span>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">View Payslips</p>
            <p className="text-xs text-subtext-light dark:text-subtext-dark">Compensation & pay history</p>
          </div>
        </Link>

        <Link
          to="/employee/documents"
          className="flex items-center gap-4 p-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark hover:shadow-md hover:border-primary/30 transition-all group"
        >
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
            <span className="material-icons-outlined text-purple-600 dark:text-purple-400">folder_open</span>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">My Documents</p>
            <p className="text-xs text-subtext-light dark:text-subtext-dark">View & download documents</p>
          </div>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Upcoming Time Off */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark min-h-[300px] flex flex-col">
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
            <div className="flex-1 flex flex-col items-center justify-center">
              <EmptyState
                icon="event_busy"
                title="No upcoming time off scheduled"
                actionLabel="Request Time Off"
                onAction={() => navigate('/employee/time-off')}
              />
            </div>
          )}
        </div>

        {/* Upcoming Nepal Holidays */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="material-icons-outlined text-red-500 text-lg">flag</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Holidays</h3>
            </div>
            <Link to="/employee/company" className="text-sm text-primary hover:text-primary-hover font-medium">
              View all
            </Link>
          </div>
          {nepalHolidays.length > 0 ? (
            <div className="space-y-3">
              {nepalHolidays.map((holiday) => {
                const hDate = new Date(holiday.rawDate)
                return (
                  <div key={holiday.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex-shrink-0 w-11 h-11 bg-red-50 dark:bg-red-900/20 rounded-lg flex flex-col items-center justify-center">
                      <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase leading-none">
                        {hDate.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-sm font-bold text-red-700 dark:text-red-300 leading-tight">
                        {hDate.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{holiday.name}</p>
                      {holiday.nameNe && (
                        <p className="text-xs text-subtext-light dark:text-subtext-dark truncate">{holiday.nameNe}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Paid</span>
                  </div>
                )
              })}
            </div>
          ) : holidays.length > 0 ? (
            <div className="space-y-4">
              {holidays.map((holiday, index) => (
                <div key={holiday.id || index} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{holiday.name}</h4>
                    <p className="text-sm text-subtext-light dark:text-subtext-dark mt-0.5">{holiday.date}</p>
                  </div>
                  {holiday.paid && (
                    <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-2.5 py-1 rounded">Paid</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="calendar_today"
              title="No holidays scheduled"
              description="Company holidays will appear here once configured"
            />
          )}
        </div>
      </div>

      {/* Recent Company Announcements */}
      <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Announcements</h3>
          <Link to="/employee/company" className="text-sm text-primary hover:text-primary-hover font-medium">
            View all
          </Link>
        </div>
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
          <EmptyState
            icon="campaign"
            title="No announcements yet"
            description="Company announcements will appear here when published"
          />
        )}
      </div>
    </div>
  )
}
