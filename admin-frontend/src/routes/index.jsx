import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from '../components/layout/AdminLayout'
import AdminProtectedRoute from '../components/features/auth/AdminProtectedRoute'
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import DocumentReview from '../pages/DocumentReview'
import Payroll from '../pages/Payroll'
import Users from '../pages/Users'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected Admin Routes */}
      <Route element={<AdminProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/documents" element={<DocumentReview />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/payroll/:id" element={<Payroll />} />
          <Route path="/users" element={<Users />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
