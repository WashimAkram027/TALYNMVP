import { useState, useEffect, useCallback } from 'react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import StatusBadge from '../components/common/StatusBadge'
import usersService from '../services/usersService'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [editUser, setEditUser] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [toast, setToast] = useState(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page }
      if (search) params.search = search
      if (roleFilter) params.role = roleFilter
      if (statusFilter) params.status = statusFilter
      const result = await usersService.list(params)
      if (Array.isArray(result)) {
        setUsers(result)
        setTotalPages(1)
      } else {
        setUsers(result?.data || [])
        setTotalPages(result?.totalPages || 1)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, roleFilter, statusFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleAction = async (userId, action) => {
    setActionLoading(userId)
    try {
      switch (action) {
        case 'suspend':
          await usersService.suspend(userId, 'Suspended by admin')
          showToast('User suspended')
          break
        case 'reactivate':
          await usersService.reactivate(userId)
          showToast('User reactivated')
          break
        case 'resetPassword':
          await usersService.resetPassword(userId)
          showToast('Password reset email sent')
          break
        case 'verifyEmail':
          await usersService.verifyEmail(userId)
          showToast('Email verified')
          break
      }
      fetchUsers()
    } catch (err) {
      showToast(err.response?.data?.error || `Failed to ${action}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSaveUser = async (userId, updates) => {
    try {
      await usersService.update(userId, updates)
      showToast('User updated successfully')
      setEditUser(null)
      fetchUsers()
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update user', 'error')
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await usersService.deleteUser(deleteTarget.id)
      showToast('User deleted successfully')
      setDeleteTarget(null)
      fetchUsers()
    } catch (err) {
      showToast(err.response?.data?.error || err.response?.data?.message || 'Failed to delete user', 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const roleBadgeColors = {
    employer: 'bg-purple-100 text-purple-700',
    candidate: 'bg-blue-100 text-blue-700',
    admin: 'bg-red-100 text-red-700',
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">User Management</h1>
        <p className="text-text-secondary text-sm mt-1">Manage all employer and employee accounts</p>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/60 text-[20px]">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 border border-border-main rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
          className="px-4 py-2.5 border border-border-main rounded-lg text-sm bg-white text-text-primary focus:ring-2 focus:ring-primary/20 outline-none"
        >
          <option value="">All Roles</option>
          <option value="employer">Employer</option>
          <option value="candidate">Candidate</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-4 py-2.5 border border-border-main rounded-lg text-sm bg-white text-text-primary focus:ring-2 focus:ring-primary/20 outline-none"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner />
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl border border-border-main p-12 text-center">
          <span className="material-icons text-[48px] text-text-secondary/40 mb-3 block">people</span>
          <p className="text-text-secondary">No users found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border-main overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-border-main">
                <th className="text-left p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">User</th>
                <th className="text-left p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Email</th>
                <th className="text-center p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Role</th>
                <th className="text-center p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                <th className="text-left p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Last Login</th>
                <th className="text-center p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border-main hover:bg-gray-50 transition-colors">
                  {/* Avatar + Name */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {(user.first_name?.[0] || user.email?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-text-primary text-sm">
                          {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || '—'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-text-secondary">{user.email}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleBadgeColors[user.role] || 'bg-gray-100 text-gray-700'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-center"><StatusBadge status={user.status} /></td>
                  <td className="p-4 text-sm text-text-secondary">
                    {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1">
                      {/* Edit */}
                      <button
                        onClick={() => setEditUser(user)}
                        className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit user"
                      >
                        <span className="material-icons text-[18px] text-blue-600">edit</span>
                      </button>
                      {/* Reset Password */}
                      <button
                        onClick={() => handleAction(user.id, 'resetPassword')}
                        disabled={actionLoading === user.id}
                        className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Reset password"
                      >
                        <span className="material-icons text-[18px] text-amber-600">key</span>
                      </button>
                      {/* Suspend / Reactivate */}
                      {user.status === 'active' ? (
                        <button
                          onClick={() => handleAction(user.id, 'suspend')}
                          disabled={actionLoading === user.id}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          title="Suspend user"
                        >
                          <span className="material-icons text-[18px] text-red-600">block</span>
                        </button>
                      ) : user.status === 'suspended' ? (
                        <button
                          onClick={() => handleAction(user.id, 'reactivate')}
                          disabled={actionLoading === user.id}
                          className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Reactivate user"
                        >
                          <span className="material-icons text-[18px] text-emerald-600">check_circle</span>
                        </button>
                      ) : null}
                      {/* Verify Email */}
                      {!user.email_verified && (
                        <button
                          onClick={() => handleAction(user.id, 'verifyEmail')}
                          disabled={actionLoading === user.id}
                          className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Verify email"
                        >
                          <span className="material-icons text-[18px] text-blue-600">mark_email_read</span>
                        </button>
                      )}
                      {/* Delete */}
                      <button
                        onClick={() => setDeleteTarget(user)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete user"
                      >
                        <span className="material-icons text-[18px] text-red-600">delete_forever</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border-main">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-border-main rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-text-secondary">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-border-main rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============== EDIT USER MODAL ============== */}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} onSave={handleSaveUser} />}

      {/* ============== DELETE CONFIRMATION MODAL ============== */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !deleteLoading && setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-border-main">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="material-icons text-red-600">warning</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">Delete User</h3>
                  <p className="text-sm text-text-secondary">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-sm text-text-primary mb-4">
                You are about to permanently delete the following user:
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="font-medium text-text-primary">
                  {deleteTarget.full_name || `${deleteTarget.first_name || ''} ${deleteTarget.last_name || ''}`.trim() || 'Unnamed User'}
                </p>
                <p className="text-sm text-text-secondary">{deleteTarget.email}</p>
                <p className="text-xs text-text-secondary mt-1 capitalize">Role: {deleteTarget.role}</p>
              </div>
              <p className="text-sm text-text-secondary mb-2 font-medium">The following will be deleted:</p>
              <ul className="text-sm text-text-secondary space-y-1 list-disc list-inside">
                <li>User profile and authentication account</li>
                <li>All organization memberships (by profile link)</li>
                <li>Pending invitations sent to this email</li>
                <li>Associated documents, applications, and tokens</li>
              </ul>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border-main flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

// ============================================================
// EDIT USER MODAL
// ============================================================
function EditUserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    email: user.email || '',
    phone: user.phone || '',
    status: user.status || 'pending',
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave(user.id, form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-border-main">
          <h3 className="text-lg font-bold text-text-primary">Edit User</h3>
          <p className="text-sm text-text-secondary mt-0.5">
            {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
          </p>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">First Name</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                className="w-full p-2.5 border border-border-main rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Last Name</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                className="w-full p-2.5 border border-border-main rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full p-2.5 border border-border-main rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full p-2.5 border border-border-main rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Role</label>
              <input
                type="text"
                value={user.role}
                disabled
                className="w-full p-2.5 border border-border-main rounded-lg text-sm bg-gray-50 text-text-secondary cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full p-2.5 border border-border-main rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="deactivated">Deactivated</option>
              </select>
            </div>
          </div>

          {/* Read-only info */}
          <div className="pt-3 border-t border-border-main">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Account Info</h4>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-text-secondary">Email Verified</p>
                <p className="font-medium">{user.email_verified ? 'Yes' : 'No'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-text-secondary">Onboarding</p>
                <p className="font-medium">{user.onboarding_completed ? 'Complete' : 'In Progress'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-text-secondary">Last Login</p>
                <p className="font-medium">{user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border-main flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-gray-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
