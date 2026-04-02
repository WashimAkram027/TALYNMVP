import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useNotificationStore } from '../../store/notificationStore'
import NotificationPanel from '../features/NotificationPanel'

export default function ProtectedLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showMobileNotifications, setShowMobileNotifications] = useState(false)
  const unreadCount = useNotificationStore(state => state.unreadCount)

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - always visible on desktop, slide-in on mobile */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 flex md:hidden items-center justify-between px-4 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <span className="material-icons-outlined">language</span>
            <span>Talyn</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowMobileNotifications(prev => !prev)}
                className="text-text-light dark:text-text-dark p-2 relative"
              >
                <span className="material-icons-outlined">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {showMobileNotifications && (
                <div className="absolute right-0 top-full mt-1 z-50">
                  <NotificationPanel onClose={() => setShowMobileNotifications(false)} />
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-text-light dark:text-text-dark p-2"
            >
              <span className="material-icons-outlined">menu</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
