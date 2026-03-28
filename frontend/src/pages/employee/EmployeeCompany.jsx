import { useState, useEffect } from 'react'
import { dashboardService } from '../../services/dashboardService'
import { useAuthStore } from '../../store/authStore'
import EmptyState from '../../components/employee/EmptyState'

export default function EmployeeCompany() {
  const { membership } = useAuthStore()
  const [stats, setStats] = useState(null)
  const [holidays, setHolidays] = useState([])
  const [nepalHolidays, setNepalHolidays] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [statsData, holidaysData, nepalHolidaysData, announcementsData] = await Promise.all([
          dashboardService.getEmployeeStats(),
          dashboardService.getHolidays(),
          dashboardService.getNepalPublicHolidays(50),
          dashboardService.getAnnouncements()
        ])
        setStats(statsData)
        setHolidays(holidaysData)
        setNepalHolidays(nepalHolidaysData || [])
        setAnnouncements(announcementsData)
      } catch (err) {
        console.error('Company info fetch error:', err)
        setError(err.message || 'Failed to load company information')
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
          <p className="text-subtext-light dark:text-subtext-dark">Loading company info...</p>
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company</h1>
        <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">Organization information and updates</p>
      </header>

      {/* Organization & Role - side by side on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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

      {/* Holidays */}
      <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Company Holidays</h3>
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
          <EmptyState
            icon="calendar_today"
            title="No holidays scheduled"
            description="Company holidays will appear here once configured"
          />
        )}
      </div>

      {/* Nepal Public Holidays */}
      <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark mb-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="material-icons-outlined text-red-500">flag</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Holidays in Nepal</h3>
          <span className="text-xs text-subtext-light dark:text-subtext-dark ml-auto">MOHA Gazette</span>
        </div>
        {nepalHolidays.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {nepalHolidays.map((holiday) => {
              const hDate = new Date(holiday.rawDate)
              const isPast = hDate < new Date()
              return (
                <div key={holiday.id} className={`flex items-center gap-3 p-3 rounded-lg border ${isPast ? 'opacity-50 border-gray-100 dark:border-gray-800' : 'border-border-light dark:border-border-dark'}`}>
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
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Paid</span>
                    {holiday.category === 'women_only' && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400">Women</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon="event"
            title="No Nepal holidays seeded"
            description="Public holidays will appear here once the admin seeds the gazette data"
          />
        )}
      </div>

      {/* Announcements */}
      <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Announcements</h3>
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
