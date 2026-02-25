import { Routes, Route, Navigate } from 'react-router-dom'

import PublicLayout from '../components/layout/PublicLayout'
import ProtectedLayout from '../components/layout/ProtectedLayout'
import ProtectedRoute from '../components/features/auth/ProtectedRoute'

import Home from '../pages/Home'
import AboutUs from '../pages/AboutUs'
import ForgotPassword from '../pages/ForgotPassword'
import ResetPassword from '../pages/ResetPassword'
import VerifyEmail from '../pages/VerifyEmail'
import Dashboard from '../pages/Dashboard'
import People from '../pages/People'
import PersonDetail from '../pages/PersonDetail'
import EmployeeDashboard from '../pages/EmployeeDashboard'
import Invoices from '../pages/Invoices'
import Payroll from '../pages/Payroll'
import TimeOff from '../pages/TimeOff'
import Benefits from '../pages/Benefits'
import Holidays from '../pages/Holidays'
import Announcements from '../pages/Announcements'
import Documents from '../pages/Documents'
import JobPostings from '../pages/JobPostings'
import Applications from '../pages/Applications'
import Compliance from '../pages/Compliance'
import Settings from '../pages/Settings'

// New split auth pages
import EmployerSignup from '../pages/auth/EmployerSignup'
import EmployeeSignup from '../pages/auth/EmployeeSignup'
import EmployerLogin from '../pages/auth/EmployerLogin'
import EmployeeLogin from '../pages/auth/EmployeeLogin'

// Onboarding
import EmployerOnboarding from '../pages/onboarding/EmployerOnboarding'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="home" element={<Home />} />
        <Route path="about-us" element={<AboutUs />} />

        {/* New split auth routes */}
        <Route path="signup/employer" element={<EmployerSignup />} />
        <Route path="signup/employee" element={<EmployeeSignup />} />
        <Route path="login/employer" element={<EmployerLogin />} />
        <Route path="login/employee" element={<EmployeeLogin />} />

        {/* Legacy redirects */}
        <Route path="sign-up" element={<Navigate to="/signup/employer" replace />} />
        <Route path="login-page" element={<Navigate to="/login/employer" replace />} />

        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="verify-email" element={<VerifyEmail />} />
      </Route>

      {/* Onboarding route - protected but no sidebar, no onboarding requirement */}
      <Route
        path="onboarding/employer"
        element={
          <ProtectedRoute requireOnboarding={false}>
            <EmployerOnboarding />
          </ProtectedRoute>
        }
      />

      {/* Protected routes - wrapped in ProtectedLayout */}
      <Route
        element={
          <ProtectedRoute requireOnboarding={true}>
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
          path="payroll"
          element={
            <ProtectedRoute allowedRoles={['employer']}>
              <Payroll />
            </ProtectedRoute>
          }
        />
        <Route
          path="time-off"
          element={
            <ProtectedRoute allowedRoles={['employer']}>
              <TimeOff />
            </ProtectedRoute>
          }
        />
        <Route
          path="benefits"
          element={
            <ProtectedRoute allowedRoles={['employer']}>
              <Benefits />
            </ProtectedRoute>
          }
        />
        <Route
          path="holidays"
          element={
            <ProtectedRoute allowedRoles={['employer']}>
              <Holidays />
            </ProtectedRoute>
          }
        />
        <Route
          path="announcements"
          element={
            <ProtectedRoute allowedRoles={['employer']}>
              <Announcements />
            </ProtectedRoute>
          }
        />
        <Route
          path="invoices"
          element={
            <ProtectedRoute allowedRoles={['employer']}>
              <Invoices />
            </ProtectedRoute>
          }
        />
        <Route
          path="documents"
          element={
            <ProtectedRoute allowedRoles={['employer']}>
              <Documents />
            </ProtectedRoute>
          }
        />
        <Route
          path="job-postings"
          element={
            <ProtectedRoute allowedRoles={['employer']}>
              <JobPostings />
            </ProtectedRoute>
          }
        />
        <Route
          path="applications"
          element={
            <ProtectedRoute allowedRoles={['employer']}>
              <Applications />
            </ProtectedRoute>
          }
        />
        <Route
          path="compliance"
          element={
            <ProtectedRoute allowedRoles={['employer']}>
              <Compliance />
            </ProtectedRoute>
          }
        />

        {/* Legacy route redirect */}
        <Route
          path="people-copy"
          element={<Navigate to="/invoices" replace />}
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

        {/* Common routes (both roles) */}
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}
