import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { dashboardService } from '../services/dashboardService'
import { membersService } from '../services/membersService'
import { onboardingService } from '../services/onboardingService'
import { useAuthStore } from '../store/authStore'
import InviteMemberModal from '../components/features/InviteMemberModal'
import OnboardingChecklist from '../components/features/onboarding/OnboardingChecklist'
import { StatusBadge } from '../utils/statusUtils'

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

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [stats, setStats] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [checklist, setChecklist] = useState(null)
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

  const refreshChecklist = async () => {
    try {
      const checklistData = await onboardingService.getChecklist()
      setChecklist(checklistData)
    } catch (err) {
      console.error('Checklist refresh error:', err)
    }
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch stats, team data, and checklist in parallel
        const [statsData, teamData, checklistData] = await Promise.allSettled([
          dashboardService.getEmployerStats(),
          dashboardService.getTeamOverview(5),
          onboardingService.getChecklist()
        ])

        if (statsData.status === 'fulfilled') setStats(statsData.value)
        if (teamData.status === 'fulfilled') setTeamMembers(teamData.value)
        if (checklistData.status === 'fulfilled') setChecklist(checklistData.value)
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
      {/* Header Section - only show when checklist is complete */}
      {(!checklist || checklist.allComplete) && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Overview</h1>
            <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">
              Welcome back, here's what's happening with your team.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm font-medium text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition shadow-sm flex items-center gap-2">
              <span className="material-icons-outlined text-lg">download</span>
              Export Report
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm font-medium text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition shadow-sm flex items-center gap-2"
            >
              <span className="material-icons-outlined text-lg">person_add</span>
              Invite Member
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
      )}

      {/* Onboarding Checklist (replaces welcome banner) */}
      {checklist && !checklist.allComplete && (
        <OnboardingChecklist
          checklist={checklist}
          onRefresh={refreshChecklist}
          firstName={profile?.first_name}
          onBrowseCandidates={() => {
            fetchAvailableCandidates()
            setShowCandidatesModal(true)
          }}
        />
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
                      <td className="px-6 py-4"><StatusBadge status={member.status} /></td>
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

                            {(member.status?.toLowerCase() === 'invited' || member.status?.toLowerCase() === 'in_review') && (
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

      {/* Invite Member Modal */}
      {showInviteModal && (
        <InviteMemberModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false)
            refreshDashboard()
          }}
          departments={[]}
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


// Available Candidates Modal Component
function CandidatesModal({ candidates, loading, onClose, onHire }) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
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
