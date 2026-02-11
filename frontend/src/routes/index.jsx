import { Routes, Route, Navigate } from 'react-router-dom'

import PublicLayout from '../components/layout/PublicLayout'
import ProtectedLayout from '../components/layout/ProtectedLayout'
import ProtectedRoute from '../components/features/auth/ProtectedRoute'

import Home from '../pages/Home'
import AboutUs from '../pages/AboutUs'
import SignUp from '../pages/SignUp'
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import People from '../pages/People'
import PersonDetail from '../pages/PersonDetail'
import EmployeeDashboard from '../pages/EmployeeDashboard'
import Invoices from '../pages/Invoices'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="home" element={<Home />} />
        <Route path="about-us" element={<AboutUs />} />
        <Route path="sign-up" element={<SignUp />} />
        <Route path="login-page" element={<Login />} />
      </Route>

      {/* Protected routes - wrapped in ProtectedLayout */}
      <Route
        element={
          <ProtectedRoute>
            <ProtectedLayout />
          </ProtectedRoute>
        }
      >
        {/* Employer-only routes */}
        <Route
          path="dashboard"
          element={
            <ProtectedRoute allowedRoles={['employer']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="people"
          element={
            <ProtectedRoute allowedRoles={['employer']}>
              <People />
            </ProtectedRoute>
          }
        />
        <Route
          path="people-info"
          element={
            <ProtectedRoute allowedRoles={['employer']}>
              <PersonDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="people-copy"
          element={
            <ProtectedRoute allowedRoles={['employer']}>
              <Invoices />
            </ProtectedRoute>
          }
        />

        {/* Candidate-only routes */}
        <Route
          path="dashboard-employee"
          element={
            <ProtectedRoute allowedRoles={['candidate']}>
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}
