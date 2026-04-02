import { useState } from 'react'
import TermsModal from './TermsModal'
import { QuoteDocument } from '../../QuoteDocument'
import talynLogo from '../../../assets/talyn-logo.png'

export default function QuoteReviewPanel({ quote, onBack, onAccept, onDownloadPdf, onSaveAndExit, loading, acceptLabel, orgName = '', generatedBy = '' }) {
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)

  if (!quote) return null

  return (
    <div className="space-y-5">
      {/* Quote Document Preview */}
      <div style={{ marginBottom: 24, border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <QuoteDocument
          logoSrc={talynLogo}
          quoteNumber={quote.quote_number}
          date={new Date(quote.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          validUntil={quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '\u2014'}
          orgName={orgName || '\u2014'}
          generatedBy={generatedBy || '\u2014'}
          employee={{
            name: [quote.employee_first_name, quote.employee_last_name].filter(Boolean).join(' ') || quote.employee_email,
            email: quote.employee_email,
            role: quote.job_title,
            department: quote.department,
            employmentType: quote.employment_type?.replace(/_/g, ' '),
            startDate: quote.start_date ? new Date(quote.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : undefined,
            payFrequency: quote.pay_frequency?.replace(/_/g, ' '),
            country: 'Nepal (NPL)',
          }}
          costs={{
            currency: quote.salary_currency || 'NPR',
            monthlyGross: (quote.monthly_gross_salary || 0) / 100,
            employerSsf: (quote.employer_ssf_amount || 0) / 100,
            employerSsfRate: quote.employer_ssf_rate,
            subtotalLocal: (quote.total_monthly_cost_local || 0) / 100,
            platformFee: (quote.platform_fee_amount || 0) / 100,
            employeeSsf: (quote.employee_ssf_amount || 0) / 100,
            employeeSsfRate: quote.employee_ssf_rate,
            estimatedNetSalary: (quote.estimated_net_salary || 0) / 100,
            annualCostLocal: (quote.total_annual_cost_local || 0) / 100,
            annualPlatformFee: ((quote.platform_fee_amount || 0) * 12) / 100,
          }}
          status={quote.status || 'draft'}
        />
      </div>

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
