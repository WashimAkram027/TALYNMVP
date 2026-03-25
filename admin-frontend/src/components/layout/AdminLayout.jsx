import { Outlet } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-bg-main">
      <AdminSidebar />
      <div className="ml-64">
        {/* Header */}
        <header className="h-16 bg-white border-b border-border-main flex items-center px-8 sticky top-0 z-20">
          <h1 className="text-lg font-semibold text-text-primary">Admin Panel</h1>
        </header>

        {/* Content */}
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
