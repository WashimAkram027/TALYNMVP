import { useState, useEffect } from 'react'
import { quoteService } from '../../../services/quoteService'
import QuoteReviewPanel from './QuoteReviewPanel'

function formatAmount(minorUnits, currency = 'NPR') {
  const major = minorUnits / 100
  return `${currency} ${major.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default function DraftQuotesList({ onAccepted }) {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [resumeQuote, setResumeQuote] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchDraftQuotes = async () => {
    try {
      setLoading(true)
      const data = await quoteService.listQuotes({ status: 'draft' })
      setQuotes(data || [])
    } catch {
      // Silently fail — not critical
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDraftQuotes()
  }, [])

  const isExpired = (quote) => new Date(quote.valid_until) < new Date()

  const handleResume = async (quoteId) => {
    try {
      setError(null)
      const quote = await quoteService.getQuote(quoteId)
      setResumeQuote(quote)
    } catch (err) {
      setError(err.message || 'Failed to load quote')
    }
  }

  const handleAccept = async ({ termsAcceptedAt } = {}) => {
    if (!resumeQuote) return
    try {
      setActionLoading(true)
      setError(null)
      await quoteService.acceptAndInvite(resumeQuote.id, { termsAcceptedAt })
      setResumeQuote(null)
      fetchDraftQuotes()
      if (onAccepted) onAccepted()
    } catch (err) {
      setError(err.message || 'Failed to accept quote')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!resumeQuote) return
    const blob = await quoteService.downloadQuotePdf(resumeQuote.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${resumeQuote.quote_number}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async (quoteId) => {
    if (!window.confirm('Delete this draft quote? This cannot be undone.')) return
    try {
      await quoteService.deleteQuote(quoteId)
      fetchDraftQuotes()
    } catch (err) {
      setError(err.message || 'Failed to delete quote')
    }
  }

  if (loading || quotes.length === 0) return null

  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-icons-outlined text-amber-600 text-lg">description</span>
          <h3 className="text-sm font-semibold text-amber-800">
            Draft Quotes ({quotes.length})
          </h3>
          <span className="text-xs text-amber-600">Saved quotes pending approval</span>
        </div>

        <div className="space-y-2">
          {quotes.map(q => {
            const expired = isExpired(q)
            const name = [q.employee_first_name, q.employee_last_name].filter(Boolean).join(' ') || q.employee_email
            return (
              <div
                key={q.id}
                className={`flex items-center justify-between bg-white rounded-lg px-4 py-3 border ${expired ? 'border-gray-200 opacity-60' : 'border-amber-100'}`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{name}</span>
                      <span className="text-xs text-gray-500">{q.quote_number}</span>
                      {expired && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">Expired</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {q.job_title && <span>{q.job_title}</span>}
                      {q.job_title && q.department && <span> &middot; </span>}
                      {q.department && <span>{q.department}</span>}
                      <span> &middot; {formatAmount(q.annual_salary, q.salary_currency)}/yr</span>
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-1.5">
                  <button
                    onClick={() => handleResume(q.id)}
                    disabled={expired}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                  >
                    <span className="material-icons-outlined text-sm">open_in_new</span>
                    {expired ? 'Expired' : 'Resume'}
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="px-2 py-1.5 text-xs rounded-lg text-red-600 hover:bg-red-50 transition"
                    title="Delete quote"
                  >
                    <span className="material-icons-outlined text-sm">delete_outline</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Resume Quote Modal */}
      {resumeQuote && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col border border-border-light dark:border-border-dark">
            <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Review Saved Quote</h2>
                <p className="text-sm text-subtext-light dark:text-subtext-dark">
                  Review and accept the quote to send the invitation
                </p>
              </div>
              <button onClick={() => { setResumeQuote(null); setError(null) }} className="text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg text-sm mb-4">
                  {error}
                </div>
              )}
              <QuoteReviewPanel
                quote={resumeQuote}
                onAccept={handleAccept}
                onDownloadPdf={handleDownloadPdf}
                loading={actionLoading}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
