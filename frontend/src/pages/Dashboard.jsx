import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { dashboardService } from '../services/dashboardService'
import { membersService } from '../services/membersService'
import { documentsService } from '../services/documentsService'
import { useAuthStore } from '../store/authStore'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' },
  { value: 'contractor', label: 'Contractor' }
]

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' }
]

const getStatusBadge = (status) => {
  const statusLower = status?.toLowerCase()
  if (statusLower === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Active
      </span>
    )
  }
  if (statusLower === 'invited' || statusLower === 'onboarding') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> {status}
      </span>
    )
  }
  if (statusLower === 'offboarded') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span> Offboarded
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400">
      {status || 'Unknown'}
    </span>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [stats, setStats] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showCandidatesModal, setShowCandidatesModal] = useState(false)
  const [availableCandidates, setAvailableCandidates] = useState([])
  const [candidatesLoading, setCandidatesLoading] = useState(false)

  // Team member actions
  const [activeActionMenu, setActiveActionMenu] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const actionMenuRef = useRef(null)

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActiveActionMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch available candidates
  const fetchAvailableCandidates = async () => {
    try {
      setCandidatesLoading(true)
      const candidates = await membersService.getAvailableCandidates()
      setAvailableCandidates(candidates)
    } catch (err) {
      console.error('Failed to fetch candidates:', err)
    } finally {
      setCandidatesLoading(false)
    }
  }

  // Refresh dashboard data
  const refreshDashboard = async () => {
    try {
      const [statsData, teamData] = await Promise.all([
        dashboardService.getEmployerStats(),
        dashboardService.getTeamOverview(5)
      ])
      setStats(statsData)
      setTeamMembers(teamData)
    } catch (err) {
      console.error('Refresh error:', err)
    }
  }

  // Team member action handlers
  const handleViewMember = (member) => {
    setActiveActionMenu(null)
    navigate(`/people-info?id=${member.id}`)
  }

  const handleEditMember = (member) => {
    setActiveActionMenu(null)
    setSelectedMember(member)
    setShowEditModal(true)
  }

  const handleActivateMember = async (member) => {
    if (!window.confirm(`Activate ${member.name}? They will become an active team member.`)) return

    try {
      setActionLoading(true)
      await membersService.activateMember(member.id)
      setActiveActionMenu(null)
      await refreshDashboard()
    } catch (err) {
      console.error('Failed to activate member:', err)
      alert(err.message || 'Failed to activate member')
    } finally {
      setActionLoading(false)
    }
  }

  const handleOffboardMember = async (member) => {
    if (!window.confirm(`Offboard ${member.name}? This will remove their access to the organization.`)) return

    try {
      setActionLoading(true)
      await membersService.offboardMember(member.id)
      setActiveActionMenu(null)
      await refreshDashboard()
    } catch (err) {
      console.error('Failed to offboard member:', err)
      alert(err.message || 'Failed to offboard member')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteMember = async (member) => {
    if (!window.confirm(`Delete invitation for ${member.name}? This action cannot be undone.`)) return

    try {
      setActionLoading(true)
      await membersService.deleteMember(member.id)
      setActiveActionMenu(null)
      await refreshDashboard()
    } catch (err) {
      console.error('Failed to delete member:', err)
      alert(err.message || 'Failed to delete member')
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch stats and team data in parallel
        const [statsData, teamData] = await Promise.all([
          dashboardService.getEmployerStats(),
          dashboardService.getTeamOverview(5)
        ])

        setStats(statsData)
        setTeamMembers(teamData)
      } catch (err) {
        console.error('Dashboard fetch error:', err)
        setError(err.message || 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

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

  return (
    <div>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Overview</h1>
          <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">
            Welcome back, here's what's happening with your team in Nepal.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm font-medium text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition shadow-sm flex items-center gap-2">
            <span className="material-icons-outlined text-lg">download</span>
            Export Report
          </button>
          <button
            onClick={() => {
              fetchAvailableCandidates()
              setShowCandidatesModal(true)
            }}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium shadow-md shadow-blue-500/20 transition flex items-center gap-2"
          >
            <span className="material-icons-outlined text-lg">add</span>
            Hire Talent
          </button>
        </div>
      </div>

      {/* Welcome Banner for New Employers */}
      {stats?.isNewOrganization && (
        <div className="mb-8 bg-gradient-to-r from-primary/10 to-blue-500/10 dark:from-primary/20 dark:to-blue-500/20 rounded-2xl p-6 md:p-8 border border-primary/20">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
            {/* Welcome Message */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-icons-outlined text-primary text-2xl">celebration</span>
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">Welcome to Talyn</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-text-light dark:text-text-dark mb-3">
                Welcome, {profile?.first_name || 'there'}!
              </h2>
              <p className="text-subtext-light dark:text-subtext-dark mb-6 max-w-xl">
                Your organization is all set up. Let's get your team onboarded and start managing your workforce efficiently.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium shadow-md shadow-blue-500/20 transition"
                >
                  <span className="material-icons-outlined text-lg">person_add</span>
                  Add Team Member
                </button>
                <button
                  onClick={() => {
                    fetchAvailableCandidates()
                    setShowCandidatesModal(true)
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <span className="material-icons-outlined text-lg">work</span>
                  Browse Candidates
                </button>
              </div>
            </div>

            {/* Getting Started Checklist */}
            <div className="lg:w-80 bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-border-light dark:border-border-dark">
              <h3 className="font-semibold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
                <span className="material-icons-outlined text-lg text-primary">checklist</span>
                Getting Started
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <span className="material-icons-outlined text-green-500 text-lg">check_circle</span>
                  <span className="text-sm text-subtext-light dark:text-subtext-dark line-through">Create your account</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-icons-outlined text-green-500 text-lg">check_circle</span>
                  <span className="text-sm text-subtext-light dark:text-subtext-dark line-through">Set up your organization</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-icons-outlined text-gray-300 dark:text-gray-600 text-lg">radio_button_unchecked</span>
                  <button onClick={() => setShowInviteModal(true)} className="text-sm text-text-light dark:text-text-dark hover:text-primary transition text-left">
                    Add your first team member
                  </button>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-icons-outlined text-gray-300 dark:text-gray-600 text-lg">radio_button_unchecked</span>
                  <Link to="/people-copy" className="text-sm text-text-light dark:text-text-dark hover:text-primary transition">
                    Set up payroll schedule
                  </Link>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-icons-outlined text-gray-300 dark:text-gray-600 text-lg">radio_button_unchecked</span>
                  <span className="text-sm text-subtext-light dark:text-subtext-dark">
                    Review compliance requirements (coming soon)
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Active Employees */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
              <span className="material-icons-outlined">groups</span>
            </div>
            {stats?.members?.invited > 0 && (
              <span className="text-xs font-medium text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-1 rounded-full">
                {stats.members.invited} pending
              </span>
            )}
          </div>
          <h3 className="text-3xl font-bold text-text-light dark:text-text-dark">{stats?.members?.active || 0}</h3>
          <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">Active Remote Employees</p>
        </div>

        {/* Upcoming Payroll */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400">
              <span className="material-icons-outlined">attach_money</span>
            </div>
            <span className="text-xs font-medium text-subtext-light dark:text-subtext-dark bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
              Due in {stats?.payroll?.dueInDays || 0} days
            </span>
          </div>
          <h3 className="text-3xl font-bold text-text-light dark:text-text-dark">
            ${stats?.payroll?.upcomingAmount?.toLocaleString() || '0'}
          </h3>
          <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">Upcoming Payroll ({stats?.payroll?.currency || 'USD'})</p>
        </div>

        {/* Candidates in Pipeline */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center text-orange-600 dark:text-orange-400">
              <span className="material-icons-outlined">person_search</span>
            </div>
            {stats?.pipeline?.offerSent > 0 && (
              <span className="text-xs font-medium text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-1 rounded-full">
                {stats.pipeline.offerSent} Offers Sent
              </span>
            )}
          </div>
          <h3 className="text-3xl font-bold text-text-light dark:text-text-dark">{stats?.pipeline?.total || 0}</h3>
          <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">Candidates in Pipeline</p>
        </div>

        {/* Compliance Score */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-green-400 to-transparent opacity-10 rounded-bl-full"></div>
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400">
              <span className="material-icons-outlined">verified_user</span>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-text-light dark:text-text-dark">{stats?.compliance?.score || 100}%</h3>
          <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">Compliance Score</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Team Overview Table */}
        <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm flex flex-col">
          <div className="p-6 border-b border-border-light dark:border-border-dark flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Team Overview</h2>
            <Link className="text-sm font-medium text-primary hover:text-primary-hover" to="/people">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">
                <tr>
                  <th className="px-6 py-4 rounded-tl-lg">Employee</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Payroll</th>
                  <th className="px-6 py-4 rounded-tr-lg"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark text-sm">
                {teamMembers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <span className="material-icons-outlined text-gray-400 text-4xl mb-2">group_add</span>
                        <p className="text-subtext-light dark:text-subtext-dark">No team members yet</p>
                        <button onClick={() => setShowInviteModal(true)} className="text-primary text-sm mt-2 hover:underline">
                          Add your first team member
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {member.avatar ? (
                            <img
                              alt={member.name}
                              className="h-8 w-8 rounded-full object-cover"
                              src={member.avatar}
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                              {member.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-text-light dark:text-text-dark">{member.name}</div>
                            <div className="text-xs text-subtext-light dark:text-subtext-dark">{member.department || member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-text-light dark:text-text-dark">{member.role}</td>
                      <td className="px-6 py-4">{getStatusBadge(member.status)}</td>
                      <td className="px-6 py-4 text-text-light dark:text-text-dark">{member.payroll}</td>
                      <td className="px-6 py-4 text-right relative">
                        <button
                          onClick={() => setActiveActionMenu(activeActionMenu === member.id ? null : member.id)}
                          className="text-subtext-light dark:text-subtext-dark hover:text-primary transition p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          disabled={actionLoading}
                        >
                          <span className="material-icons-outlined text-base">more_vert</span>
                        </button>

                        {/* Action Dropdown Menu */}
                        {activeActionMenu === member.id && (
                          <div
                            ref={actionMenuRef}
                            className="absolute right-0 top-full mt-1 w-48 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg z-20 py-1"
                          >
                            <button
                              onClick={() => handleViewMember(member)}
                              className="w-full px-4 py-2 text-left text-sm text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                            >
                              <span className="material-icons-outlined text-base">visibility</span>
                              View Profile
                            </button>
                            <button
                              onClick={() => handleEditMember(member)}
                              className="w-full px-4 py-2 text-left text-sm text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                            >
                              <span className="material-icons-outlined text-base">edit</span>
                              Edit Member
                            </button>

                            <div className="border-t border-border-light dark:border-border-dark my-1"></div>

                            {member.status?.toLowerCase() === 'invited' && (
                              <>
                                <button
                                  onClick={() => handleActivateMember(member)}
                                  className="w-full px-4 py-2 text-left text-sm text-green-600 dark:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                                >
                                  <span className="material-icons-outlined text-base">check_circle</span>
                                  Activate
                                </button>
                                <button
                                  onClick={() => handleDeleteMember(member)}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                                >
                                  <span className="material-icons-outlined text-base">delete</span>
                                  Delete Invitation
                                </button>
                              </>
                            )}

                            {member.status?.toLowerCase() === 'active' && (
                              <button
                                onClick={() => handleOffboardMember(member)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                              >
                                <span className="material-icons-outlined text-base">person_remove</span>
                                Offboard
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Compliance Alerts */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Compliance Alerts</h2>
              <span className="material-icons-outlined text-subtext-light dark:text-subtext-dark">notifications_active</span>
            </div>
            <div className="space-y-4">
              {stats?.compliance?.alerts?.length > 0 ? (
                stats.compliance.alerts.map((alert, index) => (
                  <div
                    key={alert.id || index}
                    className={`p-3 rounded-lg border flex gap-3 items-start ${
                      alert.severity === 'warning'
                        ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/30'
                        : alert.severity === 'error'
                        ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
                        : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30'
                    }`}
                  >
                    <span className={`material-icons-outlined text-sm mt-0.5 ${
                      alert.severity === 'warning' ? 'text-yellow-600' :
                      alert.severity === 'error' ? 'text-red-500' : 'text-blue-500'
                    }`}>
                      {alert.severity === 'warning' ? 'warning' : alert.severity === 'error' ? 'error' : 'info'}
                    </span>
                    <div>
                      <h4 className="text-sm font-medium text-text-light dark:text-text-dark">{alert.title}</h4>
                      <p className="text-xs text-subtext-light dark:text-subtext-dark mt-1">{alert.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  {/* Default info alert when no alerts */}
                  <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30 flex gap-3 items-start">
                    <span className="material-icons-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                    <div>
                      <h4 className="text-sm font-medium text-text-light dark:text-text-dark">All Clear</h4>
                      <p className="text-xs text-subtext-light dark:text-subtext-dark mt-1">
                        No compliance alerts at this time. Your organization is fully compliant.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
            <button className="w-full mt-4 py-2 border border-border-light dark:border-border-dark text-subtext-light dark:text-subtext-dark rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              View All Alerts
            </button>
          </div>

          {/* Hiring Pipeline */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Hiring Pipeline</h2>
              <a className="text-primary text-sm font-medium" href="#">Manage</a>
            </div>
            <div className="space-y-4">
              {/* Interview */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-subtext-light dark:text-subtext-dark">Interview</span>
                  <span className="font-medium text-text-light dark:text-text-dark">{stats?.pipeline?.interview || 0} Candidates</span>
                </div>
                <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${stats?.pipeline?.total ? (stats.pipeline.interview / stats.pipeline.total * 100) : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Assessment */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-subtext-light dark:text-subtext-dark">Assessment</span>
                  <span className="font-medium text-text-light dark:text-text-dark">{stats?.pipeline?.assessment || 0} Candidates</span>
                </div>
                <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${stats?.pipeline?.total ? (stats.pipeline.assessment / stats.pipeline.total * 100) : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Offer Sent */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-subtext-light dark:text-subtext-dark">Offer Sent</span>
                  <span className="font-medium text-text-light dark:text-text-dark">{stats?.pipeline?.offerSent || 0} Candidates</span>
                </div>
                <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${stats?.pipeline?.total ? (stats.pipeline.offerSent / stats.pipeline.total * 100) : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-border-light dark:border-border-dark pt-6 pb-2">
        <div className="flex flex-col md:flex-row justify-between items-center text-xs text-subtext-light dark:text-subtext-dark gap-4">
          <p>&copy; {new Date().getFullYear()} Talyn. All rights reserved. Compliant with Nepal Labor Act 2017.</p>
          <div className="flex gap-4">
            <a className="hover:text-primary" href="#">Privacy Policy</a>
            <a className="hover:text-primary" href="#">Terms of Service</a>
            <a className="hover:text-primary" href="#">Support</a>
          </div>
        </div>
      </footer>

      {/* Onboard Member Modal */}
      {showInviteModal && (
        <OnboardMemberModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false)
            refreshDashboard()
          }}
        />
      )}

      {/* Available Candidates Modal */}
      {showCandidatesModal && (
        <CandidatesModal
          candidates={availableCandidates}
          loading={candidatesLoading}
          onClose={() => setShowCandidatesModal(false)}
          onHire={(candidate) => {
            setShowCandidatesModal(false)
            setShowInviteModal(true)
          }}
        />
      )}

      {/* Edit Member Modal */}
      {showEditModal && selectedMember && (
        <EditMemberModal
          member={selectedMember}
          onClose={() => {
            setShowEditModal(false)
            setSelectedMember(null)
          }}
          onSuccess={() => {
            setShowEditModal(false)
            setSelectedMember(null)
            refreshDashboard()
          }}
        />
      )}
    </div>
  )
}

// 3-Step Onboard Member Modal Component
function OnboardMemberModal({ onClose, onSuccess }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    firstName: '',
    lastName: '',
    email: '',
    jobTitle: '',
    department: '',
    employmentType: 'full_time',
    location: '',
    memberRole: 'employee',
    // Step 2: Contract Details
    startDate: '',
    salaryAmount: '',
    salaryCurrency: 'NPR',
    payFrequency: 'monthly',
    // Step 3: Documents
    signedContract: null,
    idDocument: null,
    vatDocument: null,
    resume: null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [uploadProgress, setUploadProgress] = useState('')

  const steps = [
    { number: 1, title: 'Basic Info', icon: 'person' },
    { number: 2, title: 'Contract', icon: 'description' },
    { number: 3, title: 'Documents', icon: 'folder' }
  ]

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.email) {
          setError('Email is required')
          return false
        }
        if (!formData.email.includes('@')) {
          setError('Please enter a valid email address')
          return false
        }
        return true
      case 2:
        return true // All fields optional
      case 3:
        return true // All files optional
      default:
        return true
    }
  }

  const handleNext = () => {
    setError(null)
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    setError(null)
    setCurrentStep(currentStep - 1)
  }

  const handleFileChange = (field, file) => {
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError(`File "${file.name}" is too large. Maximum size is 10MB.`)
        return
      }
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
      if (!allowedTypes.includes(file.type)) {
        setError('Only PDF, PNG, and JPG files are allowed.')
        return
      }
    }
    setError(null)
    setFormData({ ...formData, [field]: file })
  }

  const handleSubmit = async () => {
    if (!validateStep(3)) return

    try {
      setLoading(true)
      setError(null)
      setUploadProgress('Creating team member...')

      // 1. Create the member
      const memberData = {
        email: formData.email,
        memberRole: formData.memberRole,
        jobTitle: formData.jobTitle,
        department: formData.department,
        employmentType: formData.employmentType,
        location: formData.location,
        startDate: formData.startDate || null,
        salaryAmount: formData.salaryAmount ? parseFloat(formData.salaryAmount) : null,
        salaryCurrency: formData.salaryCurrency,
        payFrequency: formData.payFrequency
      }

      const member = await membersService.inviteMember(memberData)
      const memberId = member.id

      // 2. Upload documents if provided
      const hasDocuments = formData.signedContract || formData.idDocument || formData.vatDocument || formData.resume

      console.log('[Onboard] Document upload check:', {
        hasDocuments,
        signedContract: !!formData.signedContract,
        idDocument: !!formData.idDocument,
        vatDocument: !!formData.vatDocument,
        resume: !!formData.resume
      })

      if (hasDocuments) {
        const documentUploads = []

        if (formData.signedContract) {
          setUploadProgress('Uploading signed contract...')
          documentUploads.push(
            documentsService.uploadDocument(formData.signedContract, {
              name: `Contract - ${formData.firstName || formData.email} ${formData.lastName || ''}`.trim(),
              category: 'contract',
              memberId: memberId
            }).catch(err => {
              console.error('[Onboard] Contract upload failed:', err)
              throw new Error(`Contract upload failed: ${err.message}`)
            })
          )
        }

        if (formData.idDocument) {
          setUploadProgress('Uploading ID document...')
          documentUploads.push(
            documentsService.uploadDocument(formData.idDocument, {
              name: `ID Document - ${formData.firstName || formData.email} ${formData.lastName || ''}`.trim(),
              category: 'identity',
              memberId: memberId,
              isSensitive: true
            }).catch(err => {
              console.error('[Onboard] ID document upload failed:', err)
              throw new Error(`ID document upload failed: ${err.message}`)
            })
          )
        }

        if (formData.vatDocument) {
          setUploadProgress('Uploading VAT document...')
          documentUploads.push(
            documentsService.uploadDocument(formData.vatDocument, {
              name: `VAT Document - ${formData.firstName || formData.email} ${formData.lastName || ''}`.trim(),
              category: 'tax',
              memberId: memberId,
              isSensitive: true
            }).catch(err => {
              console.error('[Onboard] VAT document upload failed:', err)
              throw new Error(`VAT document upload failed: ${err.message}`)
            })
          )
        }

        if (formData.resume) {
          setUploadProgress('Uploading resume...')
          documentUploads.push(
            documentsService.uploadDocument(formData.resume, {
              name: `Resume - ${formData.firstName || formData.email} ${formData.lastName || ''}`.trim(),
              category: 'other',
              memberId: memberId
            }).catch(err => {
              console.error('[Onboard] Resume upload failed:', err)
              throw new Error(`Resume upload failed: ${err.message}`)
            })
          )
        }

        if (documentUploads.length > 0) {
          setUploadProgress(`Uploading ${documentUploads.length} document(s)...`)
          await Promise.all(documentUploads)
          console.log('[Onboard] All documents uploaded successfully')
        }
      }

      setUploadProgress('')
      onSuccess()
    } catch (err) {
      console.error('Onboard member error:', err)
      setError(err.message || 'Failed to onboard member')
      setUploadProgress('')
    } finally {
      setLoading(false)
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
            currentStep === step.number
              ? 'border-primary bg-primary text-white'
              : currentStep > step.number
                ? 'border-green-500 bg-green-500 text-white'
                : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
          }`}>
            {currentStep > step.number ? (
              <span className="material-icons-outlined text-sm">check</span>
            ) : (
              <span className="material-icons-outlined text-sm">{step.icon}</span>
            )}
          </div>
          <span className={`ml-2 text-sm font-medium hidden sm:inline ${
            currentStep >= step.number
              ? 'text-text-light dark:text-text-dark'
              : 'text-gray-400 dark:text-gray-500'
          }`}>
            {step.title}
          </span>
          {index < steps.length - 1 && (
            <div className={`w-12 h-0.5 mx-3 ${
              currentStep > step.number ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
            }`} />
          )}
        </div>
      ))}
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">First Name</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="John"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Last Name</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Doe"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Email *</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="john.doe@company.com"
          required
        />
        <p className="text-xs text-subtext-light dark:text-subtext-dark mt-1">
          The employee must have an existing account with this email
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Job Title / Position</label>
        <input
          type="text"
          value={formData.jobTitle}
          onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
          className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Software Engineer"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Department</label>
          <input
            type="text"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Engineering"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Role</label>
          <select
            value={formData.memberRole}
            onChange={(e) => setFormData({ ...formData, memberRole: e.target.value })}
            className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {ROLE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Employment Type</label>
          <select
            value={formData.employmentType}
            onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
            className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {EMPLOYMENT_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Kathmandu, Nepal"
          />
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Start Date</label>
        <input
          type="date"
          value={formData.startDate}
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Annual Salary</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={formData.salaryAmount}
            onChange={(e) => setFormData({ ...formData, salaryAmount: e.target.value })}
            className="flex-1 border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="600000"
          />
          <select
            value={formData.salaryCurrency}
            onChange={(e) => setFormData({ ...formData, salaryCurrency: e.target.value })}
            className="w-24 border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="NPR">NPR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
        <p className="text-xs text-subtext-light dark:text-subtext-dark mt-1">
          Enter the total annual compensation
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Pay Frequency</label>
        <select
          value={formData.payFrequency}
          onChange={(e) => setFormData({ ...formData, payFrequency: e.target.value })}
          className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="monthly">Monthly</option>
          <option value="bi-weekly">Bi-Weekly</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <span className="material-icons-outlined text-blue-500">info</span>
          <div>
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">Contract Summary</h4>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              {formData.startDate ? `Starting ${new Date(formData.startDate).toLocaleDateString()}` : 'Start date not set'}
              {formData.salaryAmount && ` with ${formData.salaryCurrency} ${parseInt(formData.salaryAmount).toLocaleString()} annual salary`}
              {formData.payFrequency && `, paid ${formData.payFrequency}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderFileUpload = (field, label, description) => {
    const file = formData[field]
    return (
      <div className="border-2 border-dashed border-border-light dark:border-border-dark rounded-lg p-4 hover:border-primary transition">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
              file ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              <span className={`material-icons-outlined ${file ? 'text-green-600' : 'text-gray-400'}`}>
                {file ? 'check_circle' : 'upload_file'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-text-light dark:text-text-dark">{label}</p>
              {file ? (
                <p className="text-xs text-green-600 dark:text-green-400 truncate max-w-[200px]">
                  {file.name}
                </p>
              ) : (
                <p className="text-xs text-subtext-light dark:text-subtext-dark">{description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {file && (
              <button
                type="button"
                onClick={() => handleFileChange(field, null)}
                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              >
                <span className="material-icons-outlined text-sm">close</span>
              </button>
            )}
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => handleFileChange(field, e.target.files[0])}
                className="hidden"
              />
              <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-text-light dark:text-text-dark text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                {file ? 'Change' : 'Browse'}
              </span>
            </label>
          </div>
        </div>
      </div>
    )
  }

  const renderStep3 = () => (
    <div className="space-y-4">
      <p className="text-sm text-subtext-light dark:text-subtext-dark mb-4">
        Upload relevant documents for the new team member. Accepted formats: PDF, PNG, JPG (max 10MB each)
      </p>

      {renderFileUpload('signedContract', 'Signed Contract', 'Employment contract or offer letter')}
      {renderFileUpload('idDocument', 'ID Document', 'Government-issued ID or passport')}
      {renderFileUpload('vatDocument', 'VAT/Tax Document', 'PAN card or tax registration')}
      {renderFileUpload('resume', 'Resume/CV', 'Latest resume or CV')}

      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-start gap-2">
          <span className="material-icons-outlined text-yellow-600 text-sm mt-0.5">lock</span>
          <p className="text-xs text-yellow-700 dark:text-yellow-400">
            Documents are stored securely. ID and tax documents are marked as sensitive.
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-xl mx-4 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Onboard Team Member</h2>
            <p className="text-sm text-subtext-light dark:text-subtext-dark">Step {currentStep} of 3</p>
          </div>
          <button onClick={onClose} className="text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {renderStepIndicator()}

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {uploadProgress && (
            <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 px-3 py-2 rounded text-sm flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              {uploadProgress}
            </div>
          )}

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex justify-between">
          <button
            type="button"
            onClick={currentStep === 1 ? onClose : handleBack}
            disabled={loading}
            className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>
          <button
            type="button"
            onClick={currentStep === 3 ? handleSubmit : handleNext}
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : currentStep === 3 ? (
              <>
                <span className="material-icons-outlined text-lg">check</span>
                Complete Onboarding
              </>
            ) : (
              <>
                Next
                <span className="material-icons-outlined text-lg">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}


// Available Candidates Modal Component
function CandidatesModal({ candidates, loading, onClose, onHire }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Available Candidates</h2>
            <p className="text-sm text-subtext-light dark:text-subtext-dark">Browse candidates ready to be hired</p>
          </div>
          <button onClick={onClose} className="text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-icons-outlined text-gray-400 text-4xl mb-2">person_search</span>
              <p className="text-subtext-light dark:text-subtext-dark">No available candidates at the moment</p>
              <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">Check back later for new candidates</p>
            </div>
          ) : (
            <div className="space-y-4">
              {candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center justify-between p-4 border border-border-light dark:border-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <div className="flex items-center gap-4">
                    {candidate.avatar_url ? (
                      <img
                        src={candidate.avatar_url}
                        alt={candidate.full_name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-lg">
                        {candidate.first_name?.charAt(0) || candidate.email?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-text-light dark:text-text-dark">
                        {candidate.full_name || `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || 'Unnamed'}
                      </h3>
                      <p className="text-sm text-subtext-light dark:text-subtext-dark">{candidate.email}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {candidate.linkedin_url && (
                          <a
                            href={candidate.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <span className="material-icons-outlined text-sm">link</span>
                            LinkedIn
                          </a>
                        )}
                        {candidate.resume_url && (
                          <a
                            href={candidate.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-600 hover:underline flex items-center gap-1"
                          >
                            <span className="material-icons-outlined text-sm">description</span>
                            Resume
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onHire(candidate)}
                    className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition flex items-center gap-2"
                  >
                    <span className="material-icons-outlined text-lg">person_add</span>
                    Hire
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Edit Member Modal Component
function EditMemberModal({ member, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    memberRole: member.memberRole || member.role?.toLowerCase() || 'employee',
    jobTitle: member.jobTitle || member.job_title || '',
    department: member.department || '',
    employmentType: member.employmentType || member.employment_type || 'full_time',
    salaryAmount: member.salaryAmount || member.salary_amount || '',
    salaryCurrency: member.salaryCurrency || member.salary_currency || 'NPR',
    payFrequency: member.payFrequency || member.pay_frequency || 'monthly'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      setLoading(true)
      setError(null)
      await membersService.updateMember(member.id, formData)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to update member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Edit Team Member</h2>
            <p className="text-sm text-subtext-light dark:text-subtext-dark">{member.name || member.email}</p>
          </div>
          <button onClick={onClose} className="text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Role</label>
              <select
                value={formData.memberRole}
                onChange={(e) => setFormData({ ...formData, memberRole: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Employment Type</label>
              <select
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {EMPLOYMENT_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Job Title</label>
            <input
              type="text"
              value={formData.jobTitle}
              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Software Engineer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Department</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Engineering"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Salary Amount</label>
              <input
                type="number"
                value={formData.salaryAmount}
                onChange={(e) => setFormData({ ...formData, salaryAmount: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="50000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Pay Frequency</label>
              <select
                value={formData.payFrequency}
                onChange={(e) => setFormData({ ...formData, payFrequency: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="monthly">Monthly</option>
                <option value="bi-weekly">Bi-Weekly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
