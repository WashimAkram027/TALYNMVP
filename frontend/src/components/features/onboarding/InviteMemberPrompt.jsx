import { useState } from 'react'
import InviteMemberModal from '../InviteMemberModal'

export default function InviteMemberPrompt({ stepData, onComplete, onBrowseCandidates }) {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const memberCount = stepData?.memberCount || 0

  return (
    <div className="space-y-4">
      {memberCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
          <span className="material-icons-outlined text-green-600 text-lg">group</span>
          <span className="text-sm text-green-700 dark:text-green-400">
            You have {memberCount} team member{memberCount !== 1 ? 's' : ''} invited
          </span>
        </div>
      )}

      <p className="text-sm text-subtext-light dark:text-subtext-dark">
        Add team members by sending email invitations, or browse available candidates to hire.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowInviteModal(true)}
          className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium shadow-sm transition flex items-center gap-2"
        >
          <span className="material-icons-outlined text-lg">person_add</span>
          Invite Member
        </button>
        {onBrowseCandidates && (
          <button
            onClick={onBrowseCandidates}
            className="px-5 py-2 border border-border-light dark:border-border-dark text-text-light dark:text-text-dark rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center gap-2"
          >
            <span className="material-icons-outlined text-lg">work</span>
            Browse Candidates
          </button>
        )}
      </div>

      {showInviteModal && (
        <InviteMemberModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false)
            onComplete()
          }}
          departments={[]}
        />
      )}
    </div>
  )
}
