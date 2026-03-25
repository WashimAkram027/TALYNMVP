import { NavLink } from 'react-router-dom'
import useAdminAuthStore from '../../store/adminAuthStore'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/documents', label: 'Documents', icon: 'description' },
  { path: '/payroll', label: 'Payroll', icon: 'payments' },
  { path: '/users', label: 'Users', icon: 'people' },
]

export default function AdminSidebar() {
  const { admin, logout } = useAdminAuthStore()

  return (
    <aside className="w-64 bg-sidebar min-h-screen flex flex-col fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <span className="text-white font-bold text-xl tracking-tight">Talyn</span>
        <span className="text-indigo-300 text-xs font-medium ml-2 bg-white/10 px-2 py-0.5 rounded">Admin</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-active text-white'
                  : 'text-indigo-200 hover:bg-sidebar-hover hover:text-white'
              }`
            }
          >
            <span className="material-icons text-[20px]">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Admin info + logout */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-semibold">
            {admin?.firstName?.[0] || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {admin?.firstName} {admin?.lastName}
            </p>
            <p className="text-indigo-300 text-xs truncate">{admin?.adminRole?.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-indigo-200 hover:text-white hover:bg-sidebar-hover rounded-lg transition-colors"
        >
          <span className="material-icons text-[18px]">logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  )
}
