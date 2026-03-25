import { useState, useEffect, useCallback } from 'react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import StatusBadge from '../components/common/StatusBadge'
import organizationsService from '../services/organizationsService'

const TABS = [
  { key: 'pending_review', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
]

export default function DocumentReview() {
  const [activeTab, setActiveTab] = useState('pending_review')
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [rejectModal, setRejectModal] = useState({ open: false, orgId: null })
  const [rejectReason, setRejectReason] = useState('')
  const [toast, setToast] = useState(null)

  const fetchOrgs = useCallback(async () => {
    setLoading(true)
    try {
      const params = activeTab !== 'all' ? { entityStatus: activeTab } : {}
      const result = await organizationsService.list(params)
      const orgList = Array.isArray(result) ? result : result?.data || []

      // Fetch entity docs for each org
      const orgsWithDocs = await Promise.all(
        orgList.map(async (org) => {
          try {
            const entity = await organizationsService.getEntity(org.id)
            return { ...org, entityDocs: entity?.documents || [], entityData: entity }
          } catch {
            return { ...org, entityDocs: [], entityData: null }
          }
        })
      )
      setOrgs(orgsWithDocs)
    } catch (err) {
      console.error('Error fetching orgs:', err)
      setOrgs([])
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    fetchOrgs()
  }, [fetchOrgs])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleApprove = async (orgId) => {
    setActionLoading(orgId)
    try {
      await organizationsService.approveEntity(orgId)
      showToast('Entity approved successfully')
      fetchOrgs()
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to approve', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) return
    setActionLoading(rejectModal.orgId)
    try {
      await organizationsService.rejectEntity(rejectModal.orgId, rejectReason)
      showToast('Entity rejected')
      setRejectModal({ open: false, orgId: null })
      setRejectReason('')
      fetchOrgs()
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to reject', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const docTypeLabels = {
    w9: 'W-9',
    articles_of_incorporation: 'Articles of Inc.',
    bank_statement: 'Bank Statement',
    certificate_of_registration: 'Certificate of Reg.',
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Document Review</h1>
        <p className="text-text-secondary text-sm mt-1">Review and approve onboarding documents</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-text-secondary border border-border-main hover:bg-gray-50'
            }`}
          >
            {tab.label}
            {tab.key === 'pending_review' && orgs.length > 0 && activeTab === 'pending_review' && (
              <span className="ml-2 bg-white/20 text-white px-2 py-0.5 rounded-full text-xs">
                {orgs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : orgs.length === 0 ? (
        <div className="bg-white rounded-xl border border-border-main p-12 text-center">
          <span className="material-icons text-[48px] text-text-secondary/40 mb-3 block">folder_open</span>
          <p className="text-text-secondary">No organizations match this filter</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orgs.map((org) => (
            <div key={org.id} className="bg-white rounded-xl border border-border-main p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                {/* Org Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-text-primary">{org.name || 'Unnamed Org'}</h3>
                    <StatusBadge status={org.entity_status || 'not_started'} />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-text-secondary mb-3">
                    <span className="flex items-center gap-1">
                      <span className="material-icons text-[16px]">email</span>
                      {org.email}
                    </span>
                    {org.entity_submitted_at && (
                      <span className="flex items-center gap-1">
                        <span className="material-icons text-[16px]">schedule</span>
                        Submitted {new Date(org.entity_submitted_at).toLocaleDateString()}
                      </span>
                    )}
                    {org.legal_name && (
                      <span className="flex items-center gap-1">
                        <span className="material-icons text-[16px]">business</span>
                        {org.legal_name}
                      </span>
                    )}
                  </div>

                  {/* Document Pills */}
                  <div className="flex flex-wrap gap-2">
                    {org.entityDocs.length > 0 ? (
                      org.entityDocs.map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                        >
                          <span className="material-icons text-[16px]">description</span>
                          {docTypeLabels[doc.doc_type] || doc.doc_type}
                          <span className="material-icons text-[14px] opacity-60">open_in_new</span>
                        </a>
                      ))
                    ) : (
                      <span className="text-sm text-text-secondary italic">No documents uploaded</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {org.entity_status === 'pending_review' && (
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(org.id)}
                      disabled={actionLoading === org.id}
                      className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 
                        disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                      {actionLoading === org.id ? (
                        <span className="material-icons animate-spin text-[16px]">refresh</span>
                      ) : (
                        <span className="material-icons text-[16px]">check_circle</span>
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => setRejectModal({ open: true, orgId: org.id })}
                      disabled={actionLoading === org.id}
                      className="px-4 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 
                        disabled:opacity-50 transition-colors flex items-center gap-1.5 border border-red-200"
                    >
                      <span className="material-icons text-[16px]">cancel</span>
                      Reject
                    </button>
                  </div>
                )}
              </div>

              {/* Rejection reason display */}
              {org.entity_status === 'rejected' && org.entity_rejection_reason && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    <span className="font-medium">Rejection reason:</span> {org.entity_rejection_reason}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setRejectModal({ open: false, orgId: null })}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-2">Reject Entity</h3>
            <p className="text-sm text-text-secondary mb-4">Provide a reason for rejecting this organization's verification.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full p-3 border border-border-main rounded-lg text-sm resize-none h-24 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setRejectModal({ open: false, orgId: null }); setRejectReason('') }}
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 
                  disabled:opacity-50 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
