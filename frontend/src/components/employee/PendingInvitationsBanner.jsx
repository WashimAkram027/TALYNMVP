import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { onboardingAPI } from '../../services/api'

const EMPLOYMENT_TYPE_LABELS = {
  full_time: 'Full-Time',
  part_time: 'Part-Time',
  contract: 'Contract',
  freelance: 'Freelance'
}

/**
 * Format salary amount for display
 */
function formatSalary(amount, currency) {
  if (!amount) return 'Not specified'
  const num = Number(amount)
  return `${currency || 'NPR'} ${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default function PendingInvitationsBanner() {
  const { pendingInvitations, acceptInvitation, declineInvitation } = useAuthStore()
  const [invitationLoading, setInvitationLoading] = useState(null)
  const [error, setError] = useState(null)
  const processingRef = useRef(false)

  // Offer details state
  const [quoteAndJob, setQuoteAndJob] = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState(false)

  // Expanded invitation state (which invitation card is expanded)
  const [expandedInvitation, setExpandedInvitation] = useState(null)

  // Request changes state
  const [showRequestChanges, setShowRequestChanges] = useState(false)
  const [changeNote, setChangeNote] = useState('')
  const [changeSubmitting, setChangeSubmitting] = useState(false)
  const [changeSubmitted, setChangeSubmitted] = useState(false)

  // Load offer details when an invitation is expanded
  useEffect(() => {
    if (!expandedInvitation) return

    const loadOfferDetails = async () => {
      setQuoteLoading(true)
      setQuoteError(false)
      try {
        const response = await onboardingAPI.getEmployeeQuoteAndJob()
        if (response.success && response.data) {
          setQuoteAndJob(response.data)
          // If already flagged, show the flagged state
          if (response.data.quoteDisputeNote) {
            setChangeNote(response.data.quoteDisputeNote)
            setChangeSubmitted(true)
          }
        }
      } catch {
        // Employee may not have an org yet, or no quote exists -- that's OK
        setQuoteError(true)
      }
      setQuoteLoading(false)
    }

    loadOfferDetails()
  }, [expandedInvitation])

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

  const handleRequestChanges = async () => {
    if (!changeNote.trim()) {
      setError('Please describe what needs to be changed')
      return
    }
    setChangeSubmitting(true)
    setError(null)
    try {
      const response = await onboardingAPI.verifyEmployeeQuote({
        verified: false,
        discrepancyNote: changeNote.trim()
      })
      if (response.success) {
        setChangeSubmitted(true)
        setShowRequestChanges(false)
      } else {
        setError(response.error || 'Failed to submit change request')
      }
    } catch (err) {
      setError(err.message || 'Failed to submit change request')
    }
    setChangeSubmitting(false)
  }

  const toggleExpand = (memberId) => {
    if (expandedInvitation === memberId) {
      setExpandedInvitation(null)
      setQuoteAndJob(null)
      setQuoteError(false)
      setShowRequestChanges(false)
      setChangeNote('')
      setChangeSubmitted(false)
    } else {
      setExpandedInvitation(memberId)
      setShowRequestChanges(false)
      setChangeNote('')
      setChangeSubmitted(false)
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
              Review the offer details and accept an invitation to join an organization.
            </p>
            <div className="space-y-4">
              {pendingInvitations.map((invitation) => {
                const isExpanded = expandedInvitation === invitation.memberId
                const isLoading = invitationLoading === invitation.memberId

                return (
                  <div
                    key={invitation.memberId}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    {/* Compact invitation header */}
                    <div className="p-4">
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleExpand(invitation.memberId)}
                            className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition flex items-center gap-1.5"
                          >
                            <span className="material-icons-outlined text-base">
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                            {isExpanded ? 'Hide Details' : 'View Offer'}
                          </button>
                          {!isExpanded && (
                            <button
                              onClick={() => handleDecline(invitation.memberId)}
                              disabled={isLoading}
                              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50"
                            >
                              Decline
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded offer details */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 dark:border-gray-700 p-6 space-y-6">
                        {quoteLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          </div>
                        ) : (
                          <>
                            {/* Job Details (from invitation or quote data) */}
                            {(quoteAndJob || invitation.jobTitle) && (
                              <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
                                  <span className="material-icons-outlined text-base">work</span>
                                  Job Details
                                </h3>
                                <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium w-1/3">Job Title</td>
                                        <td className="px-4 py-2.5 text-gray-900 dark:text-white">
                                          {quoteAndJob?.jobTitle || invitation.jobTitle || 'Not specified'}
                                        </td>
                                      </tr>
                                      {quoteAndJob?.jobDescription && (
                                        <tr className="bg-white dark:bg-gray-800">
                                          <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium align-top">Description</td>
                                          <td className="px-4 py-2.5 text-gray-900 dark:text-white whitespace-pre-wrap">
                                            {quoteAndJob.jobDescription}
                                          </td>
                                        </tr>
                                      )}
                                      {quoteAndJob?.salaryAmount && (
                                        <tr className="bg-gray-50 dark:bg-gray-800/50">
                                          <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Salary</td>
                                          <td className="px-4 py-2.5 text-gray-900 dark:text-white font-semibold">
                                            {formatSalary(quoteAndJob.salaryAmount, quoteAndJob.salaryCurrency)}
                                          </td>
                                        </tr>
                                      )}
                                      {quoteAndJob?.employmentType && (
                                        <tr className="bg-white dark:bg-gray-800">
                                          <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Employment Type</td>
                                          <td className="px-4 py-2.5 text-gray-900 dark:text-white">
                                            {EMPLOYMENT_TYPE_LABELS[quoteAndJob.employmentType] || quoteAndJob.employmentType}
                                          </td>
                                        </tr>
                                      )}
                                      {quoteAndJob?.startDate && (
                                        <tr className="bg-gray-50 dark:bg-gray-800/50">
                                          <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Start Date</td>
                                          <td className="px-4 py-2.5 text-gray-900 dark:text-white">
                                            {new Date(quoteAndJob.startDate).toLocaleDateString('en-US', {
                                              year: 'numeric', month: 'long', day: 'numeric'
                                            })}
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Employee Salary Breakdown */}
                            {quoteAndJob?.salaryAmount && (
                              <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
                                  <span className="material-icons-outlined text-base">payments</span>
                                  Salary Breakdown
                                </h3>
                                {(() => {
                                  const currency = quoteAndJob.salaryCurrency || 'NPR'
                                  const annualSalary = Number(quoteAndJob.salaryAmount)
                                  const quote = quoteAndJob.quote
                                  const monthlyGross = quote?.monthly_gross_local
                                    ? quote.monthly_gross_local / 100
                                    : annualSalary / 12
                                  const ssfRate = quote?.employee_ssf_rate
                                    ? parseFloat(quote.employee_ssf_rate)
                                    : 0.11
                                  const employeeSSF = quote?.employee_ssf_amount
                                    ? quote.employee_ssf_amount / 100
                                    : monthlyGross * ssfRate
                                  const estimatedNet = quote?.estimated_net_salary
                                    ? quote.estimated_net_salary / 100
                                    : monthlyGross - employeeSSF
                                  const fmt = (amount) =>
                                    `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                                  return (
                                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                                      <table className="w-full text-sm">
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                          <tr className="bg-gray-50 dark:bg-gray-800/50">
                                            <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium w-1/3">Annual Salary</td>
                                            <td className="px-4 py-2.5 text-gray-900 dark:text-white text-right font-medium">
                                              {fmt(annualSalary)}
                                            </td>
                                          </tr>
                                          <tr className="bg-white dark:bg-gray-800">
                                            <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Monthly Gross Salary</td>
                                            <td className="px-4 py-2.5 text-gray-900 dark:text-white text-right font-medium">
                                              {fmt(monthlyGross)}
                                            </td>
                                          </tr>
                                          <tr className="bg-gray-50 dark:bg-gray-800/50">
                                            <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">
                                              Employee SSF Deduction ({(ssfRate * 100).toFixed(0)}%)
                                            </td>
                                            <td className="px-4 py-2.5 text-red-600 dark:text-red-400 text-right font-medium">
                                              -{fmt(employeeSSF)}
                                            </td>
                                          </tr>
                                          <tr className="bg-green-50 dark:bg-green-900/20">
                                            <td className="px-4 py-2.5 text-gray-900 dark:text-white font-semibold">Est. Net Monthly Salary</td>
                                            <td className="px-4 py-2.5 text-gray-900 dark:text-white text-right font-bold text-base">
                                              {fmt(estimatedNet)}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  )
                                })()}
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                  Estimate before income tax. Final amounts may vary based on applicable tax rules.
                                </p>
                              </div>
                            )}

                            {/* No offer details available message */}
                            {quoteError && !quoteAndJob && (
                              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                <span className="material-icons-outlined text-3xl mb-2 block">info</span>
                                <p className="text-sm">Detailed offer information is not available yet.</p>
                                <p className="text-xs mt-1">You can still accept or decline the invitation below.</p>
                              </div>
                            )}

                            {/* Change request submitted state */}
                            {changeSubmitted && (
                              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                  <span className="material-icons-outlined text-amber-500 mt-0.5">flag</span>
                                  <div>
                                    <p className="font-medium text-amber-800 dark:text-amber-300">Changes Requested</p>
                                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                                      Your employer has been notified about the requested changes. You can accept the offer once the details are updated.
                                    </p>
                                    {changeNote && (
                                      <div className="mt-2 p-2 bg-amber-100 dark:bg-amber-900/30 rounded text-sm text-amber-800 dark:text-amber-300">
                                        <span className="font-medium">Your note:</span> {changeNote}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Request changes form */}
                            {showRequestChanges && !changeSubmitted && (
                              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                                  <span className="material-icons-outlined text-base">edit_note</span>
                                  Describe the Changes Needed
                                </h4>
                                <textarea
                                  className="block w-full rounded-lg border-amber-300 dark:border-amber-600 shadow-sm focus:border-amber-500 focus:ring-amber-500 dark:bg-gray-800 dark:text-white sm:text-sm py-2.5 mb-3"
                                  rows={3}
                                  placeholder="Describe what needs to be changed (e.g., salary amount, job title, start date...)"
                                  value={changeNote}
                                  onChange={(e) => setChangeNote(e.target.value)}
                                  maxLength={1000}
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={handleRequestChanges}
                                    disabled={changeSubmitting || !changeNote.trim()}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {changeSubmitting ? 'Submitting...' : 'Submit Request'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setShowRequestChanges(false); setChangeNote('') }}
                                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Action buttons */}
                            {!changeSubmitted && (
                              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <button
                                  onClick={() => handleAccept(invitation.memberId)}
                                  disabled={isLoading}
                                  className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed gap-2"
                                >
                                  {isLoading ? (
                                    <>
                                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <span className="material-icons-outlined text-base">check_circle</span>
                                      Accept Offer
                                    </>
                                  )}
                                </button>

                                {!showRequestChanges && (
                                  <button
                                    onClick={() => setShowRequestChanges(true)}
                                    className="flex-1 flex justify-center items-center py-3 px-4 border border-amber-300 dark:border-amber-600 rounded-lg shadow-sm text-sm font-semibold text-amber-700 dark:text-amber-400 bg-white dark:bg-gray-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors gap-1.5"
                                  >
                                    <span className="material-icons-outlined text-base">edit_note</span>
                                    Request Changes
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDecline(invitation.memberId)}
                                  disabled={isLoading}
                                  className="flex-1 flex justify-center items-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Decline
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
