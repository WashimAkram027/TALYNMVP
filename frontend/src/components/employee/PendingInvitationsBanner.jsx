import { useState, useRef } from 'react'
import { useAuthStore } from '../../store/authStore'

export default function PendingInvitationsBanner() {
  const { pendingInvitations, acceptInvitation, declineInvitation } = useAuthStore()
  const [invitationLoading, setInvitationLoading] = useState(null)
  const [error, setError] = useState(null)
  const processingRef = useRef(false)

  if (!pendingInvitations || pendingInvitations.length === 0) return null

  const handleAccept = async (memberId) => {
    if (processingRef.current) return
    processingRef.current = true
    setInvitationLoading(memberId)
    try {
      const result = await acceptInvitation(memberId)
      if (result.success) {
        window.location.reload()
      } else if (result.error?.includes('already accepted')) {
        window.location.reload()
      } else {
        setError(result.error || 'Failed to accept invitation')
      }
    } catch (err) {
      if (err.message?.includes('already accepted')) {
        window.location.reload()
      } else {
        setError(err.message || 'Failed to accept invitation')
      }
    } finally {
      setInvitationLoading(null)
      processingRef.current = false
    }
  }

  const handleDecline = async (memberId) => {
    setInvitationLoading(memberId)
    try {
      await declineInvitation(memberId)
    } catch (err) {
      setError(err.message || 'Failed to decline invitation')
    } finally {
      setInvitationLoading(null)
    }
  }

  return (
    <div className="mb-8">
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-full">
            <span className="material-icons-outlined text-blue-600 dark:text-blue-400 text-2xl">mail</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              You have {pendingInvitations.length} pending invitation{pendingInvitations.length > 1 ? 's' : ''}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Accept an invitation to join an organization and access your employee dashboard.
            </p>
            <div className="space-y-4">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.memberId}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {invitation.organizationLogo ? (
                        <img
                          src={invitation.organizationLogo}
                          alt={invitation.organizationName}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                          <span className="material-icons-outlined text-gray-400 text-xl">business</span>
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {invitation.organizationName || 'Organization'}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {invitation.jobTitle || 'Team Member'}
                          {invitation.department && ` - ${invitation.department}`}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Invited {invitation.invitedAt ? new Date(invitation.invitedAt).toLocaleDateString() : 'recently'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDecline(invitation.memberId)}
                        disabled={invitationLoading === invitation.memberId}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleAccept(invitation.memberId)}
                        disabled={invitationLoading === invitation.memberId}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition disabled:opacity-50 flex items-center gap-2"
                      >
                        {invitationLoading === invitation.memberId ? (
                          <>
                            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                            Processing...
                          </>
                        ) : (
                          'Accept'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
