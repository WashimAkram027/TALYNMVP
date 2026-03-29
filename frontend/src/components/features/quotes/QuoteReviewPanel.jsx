import { useState } from 'react'
import TermsModal from './TermsModal'

/**
 * Format minor units (paisa/cents) to major units with commas
 */
function formatAmount(minorUnits, currency = 'NPR') {
  const major = minorUnits / 100
  return `${currency} ${major.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatRate(rate) {
  return `${(parseFloat(rate) * 100).toFixed(0)}%`
}

export default function QuoteReviewPanel({ quote, onBack, onAccept, onDownloadPdf, onSaveAndExit, loading, acceptLabel }) {
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)

  if (!quote) return null

  const validUntil = new Date(quote.valid_until).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  const employeeName = [quote.employee_first_name, quote.employee_last_name]
    .filter(Boolean).join(' ') || quote.employee_email

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">EOR Cost Quote</p>
            <p className="text-lg font-semibold text-text-light dark:text-text-dark mt-1">{quote.quote_number}</p>
          </div>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
            Draft
          </span>
        </div>
        <div className="mt-2 text-sm text-subtext-light dark:text-subtext-dark">
          <span className="font-medium text-text-light dark:text-text-dark">{employeeName}</span>
          {quote.job_title && <span> &middot; {quote.job_title}</span>}
          {quote.department && <span> &middot; {quote.department}</span>}
        </div>
      </div>

      {/* Monthly Cost Breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-text-light dark:text-text-dark mb-3 flex items-center gap-1.5">
          <span className="material-icons-outlined text-base">receipt_long</span>
          Monthly Employer Cost
        </h3>
        <div className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              <tr className="bg-surface-light dark:bg-surface-dark">
                <td className="px-4 py-2.5 text-subtext-light dark:text-subtext-dark">Employee Gross Salary</td>
                <td className="px-4 py-2.5 text-right font-medium text-text-light dark:text-text-dark">
                  {formatAmount(quote.monthly_gross_salary, quote.salary_currency)}
                </td>
              </tr>
              <tr className="bg-surface-light dark:bg-surface-dark">
                <td className="px-4 py-2.5 text-subtext-light dark:text-subtext-dark">
                  Employer SSF Contribution ({formatRate(quote.employer_ssf_rate)})
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-text-light dark:text-text-dark">
                  {formatAmount(quote.employer_ssf_amount, quote.salary_currency)}
                </td>
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold">
                <td className="px-4 py-2.5 text-text-light dark:text-text-dark">
                  Subtotal (Local)
                </td>
                <td className="px-4 py-2.5 text-right text-text-light dark:text-text-dark">
                  {formatAmount(quote.total_monthly_cost_local, quote.salary_currency)}
                </td>
              </tr>
              <tr className="bg-surface-light dark:bg-surface-dark">
                <td className="px-4 py-2.5 text-subtext-light dark:text-subtext-dark">
                  Talyn Platform Fee
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-text-light dark:text-text-dark">
                  {formatAmount(quote.platform_fee_amount, quote.platform_fee_currency)}/mo
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Reference: Employee Deductions */}
      <div>
        <h3 className="text-sm font-semibold text-text-light dark:text-text-dark mb-3 flex items-center gap-1.5">
          <span className="material-icons-outlined text-base">info</span>
          Reference (Employee Side)
        </h3>
        <div className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              <tr className="bg-surface-light dark:bg-surface-dark">
                <td className="px-4 py-2.5 text-subtext-light dark:text-subtext-dark">
                  Employee SSF Deduction ({formatRate(quote.employee_ssf_rate)})
                </td>
                <td className="px-4 py-2.5 text-right text-text-light dark:text-text-dark">
                  {formatAmount(quote.employee_ssf_amount, quote.salary_currency)}
                </td>
              </tr>
              <tr className="bg-surface-light dark:bg-surface-dark">
                <td className="px-4 py-2.5 text-subtext-light dark:text-subtext-dark">
                  Est. Net Salary (before income tax)
                </td>
                <td className="px-4 py-2.5 text-right text-text-light dark:text-text-dark">
                  {formatAmount(quote.estimated_net_salary, quote.salary_currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Annual Estimate */}
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-border-light dark:border-border-dark rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-subtext-light dark:text-subtext-dark uppercase tracking-wide">Annual Estimate (Local)</p>
            <p className="text-xl font-bold text-text-light dark:text-text-dark mt-0.5">
              {formatAmount(quote.total_annual_cost_local, quote.salary_currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-subtext-light dark:text-subtext-dark uppercase tracking-wide">Platform Fee (Annual)</p>
            <p className="text-xl font-bold text-text-light dark:text-text-dark mt-0.5">
              {formatAmount(quote.platform_fee_amount * 12, quote.platform_fee_currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Valid Until */}
      <p className="text-xs text-subtext-light dark:text-subtext-dark text-center">
        Quote valid until {validUntil}
      </p>

      {/* Terms & Conditions — hidden in read-only mode */}
      {(onAccept || onBack || onSaveAndExit || onDownloadPdf) && (
        <div className="border border-border-light dark:border-border-dark rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {termsAccepted ? (
                <span className="material-icons-outlined text-green-500 text-lg">check_circle</span>
              ) : (
                <span className="material-icons-outlined text-subtext-light dark:text-subtext-dark text-lg">gavel</span>
              )}
              <span className="text-sm text-text-light dark:text-text-dark">
                {termsAccepted ? 'Terms & Conditions accepted' : 'Review and accept Terms & Conditions'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="px-3 py-1.5 text-sm text-primary border border-primary rounded-lg hover:bg-primary/5 transition"
            >
              {termsAccepted ? 'Review Again' : 'View Terms'}
            </button>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      {showTermsModal && (
        <TermsModal
          onAccept={() => { setTermsAccepted(true); setShowTermsModal(false) }}
          onClose={() => setShowTermsModal(false)}
        />
      )}

      {/* Actions — hidden in read-only mode */}
      {(onAccept || onBack || onSaveAndExit || onDownloadPdf) && (
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center gap-1"
              >
                <span className="material-icons-outlined text-base">arrow_back</span>
                Edit
              </button>
            )}
            {onSaveAndExit && (
              <button
                type="button"
                onClick={onSaveAndExit}
                className="px-4 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center gap-1"
              >
                <span className="material-icons-outlined text-base">save</span>
                Save & Exit
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* PDF Download */}
            {onDownloadPdf && (
              <button
                type="button"
                disabled={pdfLoading}
                onClick={async () => {
                  setPdfLoading(true)
                  setPdfError(null)
                  try {
                    await onDownloadPdf()
                  } catch (err) {
                    setPdfError('Failed to generate PDF')
                    console.error('PDF download error:', err)
                  } finally {
                    setPdfLoading(false)
                  }
                }}
                className="px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition flex items-center gap-1"
              >
                {pdfLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="material-icons-outlined text-base">picture_as_pdf</span>
                    PDF
                  </>
                )}
              </button>
            )}
            {pdfError && (
              <span className="text-xs text-red-500">{pdfError}</span>
            )}

            {onAccept && (
              <button
                type="button"
                onClick={() => onAccept({ termsAcceptedAt: new Date().toISOString() })}
                disabled={loading || !termsAccepted}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    {acceptLabel || 'Accept & Send Invite'}
                    <span className="material-icons-outlined text-base">arrow_forward</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
