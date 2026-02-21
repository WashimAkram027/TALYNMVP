import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
    isActive
      ? 'bg-primary/10 text-primary font-medium'
      : 'text-subtext-light dark:text-subtext-dark hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-text-light dark:hover:text-text-dark'
  }`

export default function Sidebar({ onClose }) {
  const { user, profile, logout } = useAuthStore()

  // Determine user role for conditional rendering
  const isEmployer = profile?.role === 'employer'
  const dashboardRoute = isEmployer ? '/dashboard' : '/dashboard-employee'

  const handleNavClick = () => {
    // Close mobile sidebar on navigation
    if (onClose) onClose()
  }

  return (
    <aside className="w-64 h-full bg-surface-light dark:bg-surface-dark border-r border-border-light dark:border-border-dark flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <span className="material-icons-outlined text-3xl">language</span>
          <span>Talyn</span>
        </div>
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark"
          >
            <span className="material-icons-outlined">close</span>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {/* Dashboard - route based on role */}
        <NavLink
          to={dashboardRoute}
          onClick={handleNavClick}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-subtext-light dark:text-subtext-dark hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-text-light dark:hover:text-text-dark'
            }`
          }
        >
          <span className="material-icons-outlined">dashboard</span>
          Dashboard
        </NavLink>

        {/* Employer-specific menu items */}
        {isEmployer && (
          <>
            <div className="pt-4 pb-2 text-xs font-semibold text-subtext-light dark:text-subtext-dark uppercase tracking-wider pl-3">
              Management
            </div>

            <NavLink to="/people" onClick={handleNavClick} className={navLinkClass}>
              <span className="material-icons-outlined">people</span>
              Team
            </NavLink>

            <NavLink to="/payroll" onClick={handleNavClick} className={navLinkClass}>
              <span className="material-icons-outlined">payments</span>
              Payroll
            </NavLink>

            <NavLink to="/time-off" onClick={handleNavClick} className={navLinkClass}>
              <span className="material-icons-outlined">event_available</span>
              Time Off
            </NavLink>

            <NavLink to="/benefits" onClick={handleNavClick} className={navLinkClass}>
              <span className="material-icons-outlined">health_and_safety</span>
              Benefits
            </NavLink>

            <NavLink to="/compliance" onClick={handleNavClick} className={navLinkClass}>
              <span className="material-icons-outlined">verified_user</span>
              Compliance
            </NavLink>

            <div className="pt-4 pb-2 text-xs font-semibold text-subtext-light dark:text-subtext-dark uppercase tracking-wider pl-3">
              Organization
            </div>

            <NavLink to="/holidays" onClick={handleNavClick} className={navLinkClass}>
              <span className="material-icons-outlined">calendar_today</span>
              Holidays
            </NavLink>

            <NavLink to="/announcements" onClick={handleNavClick} className={navLinkClass}>
              <span className="material-icons-outlined">campaign</span>
              Announcements
            </NavLink>

            <NavLink to="/invoices" onClick={handleNavClick} className={navLinkClass}>
              <span className="material-icons-outlined">receipt_long</span>
              Invoices
            </NavLink>

            <NavLink to="/documents" onClick={handleNavClick} className={navLinkClass}>
              <span className="material-icons-outlined">folder_open</span>
              Documents
            </NavLink>

            <div className="pt-4 pb-2 text-xs font-semibold text-subtext-light dark:text-subtext-dark uppercase tracking-wider pl-3">
              Hiring
            </div>

            <NavLink to="/job-postings" onClick={handleNavClick} className={navLinkClass}>
              <span className="material-icons-outlined">work</span>
              Job Postings
            </NavLink>

            <NavLink to="/applications" onClick={handleNavClick} className={navLinkClass}>
              <span className="material-icons-outlined">assignment</span>
              Applications
            </NavLink>
          </>
        )}

        {/* Employee-specific menu items */}
        {!isEmployer && (
          <>
            <div className="pt-4 pb-2 text-xs font-semibold text-subtext-light dark:text-subtext-dark uppercase tracking-wider pl-3">
              My Workspace
            </div>

            <NavLink to="/documents" onClick={handleNavClick} className={navLinkClass}>
              <span className="material-icons-outlined">folder_open</span>
              Documents
            </NavLink>
          </>
        )}

        {/* Common menu items */}
        <div className="pt-4 pb-2 text-xs font-semibold text-subtext-light dark:text-subtext-dark uppercase tracking-wider pl-3">
          Support
        </div>

        <NavLink
          to="/settings"
          onClick={handleNavClick}
          className={navLinkClass}
        >
          <span className="material-icons-outlined">settings</span>
          Settings
        </NavLink>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border-light dark:border-border-dark">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
            <span className="material-icons-outlined text-primary text-lg">person</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">
              {profile?.full_name || profile?.first_name || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-subtext-light dark:text-subtext-dark truncate">
              {user?.email || profile?.email || 'user@company.com'}
            </p>
          </div>
          <button
            onClick={logout}
            className="text-subtext-light dark:text-subtext-dark hover:text-primary"
          >
            <span className="material-icons-outlined text-xl">logout</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
