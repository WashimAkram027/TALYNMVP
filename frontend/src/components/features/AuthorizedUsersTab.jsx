import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { authorizedUsersService } from '../../services/authorizedUsersService'
import InviteAuthorizedUserModal from './InviteAuthorizedUserModal'

export default function AuthorizedUsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmModal, setConfirmModal] = useState(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await authorizedUsersService.list()
      setUsers(response.data || response || [])
    } catch (err) {
      console.error('Failed to fetch authorized users:', err)
      setError(err.message || 'Failed to load authorized users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleRevoke = (user) => {
    const name = user.profile?.full_name || `${user.first_name} ${user.last_name}`.trim() || user.invitation_email
    setConfirmModal({
      title: 'Revoke Access',
      message: `Are you sure you want to revoke access for ${name}? This will permanently delete their account and cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          setActionLoading(true)
          await authorizedUsersService.revoke(user.id)
          toast.success('User access revoked')
          await fetchUsers()
        } catch (err) {
          toast.error(err.response?.data?.message || err.message || 'Failed to revoke access')
        } finally {
          setActionLoading(false)
        }
      }
    })
  }

  const handleResend = async (userId) => {
    try {
      setActionLoading(true)
      await authorizedUsersService.resendInvitation(userId)
      toast.success('Invitation resent successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to resend invitation')
    } finally {
      setActionLoading(false)
    }
  }

  const handleInviteSuccess = () => {
    setShowInviteModal(false)
    toast.success('Invitation sent successfully')
    fetchUsers()
  }

  const getStatusBadge = (status) => {
    const styles = {
      invited: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status === 'invited' ? 'Pending' : 'Active'}
      </span>
    )
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Authorized users have full access to manage your organization on Talyn.
        </p>
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
        >
          + Invite User
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-gray-500">Loading authorized users...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && users.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <span className="material-icons-outlined text-gray-400 text-5xl mb-3">admin_panel_settings</span>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No authorized users yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Invite team members like HR managers or team leads to help manage your organization.
          </p>
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Invite Your First User
          </button>
        </div>
      )}

      {/* Users table */}
      {!loading && !error && users.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => {
                const name = user.profile?.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()
                const email = user.profile?.email || user.invitation_email
                const date = user.status === 'active' ? user.joined_at : user.invited_at

                return (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <span className="material-icons-outlined text-blue-600 text-sm">person</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.status === 'invited' && (
                          <button
                            onClick={() => handleResend(user.id)}
                            disabled={actionLoading}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                          >
                            Resend
                          </button>
                        )}
                        <button
                          onClick={() => handleRevoke(user)}
                          disabled={actionLoading}
                          className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteAuthorizedUserModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={handleInviteSuccess}
        />
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <span className="material-icons text-red-600">warning</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{confirmModal.title}</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Revoke Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
