import { useState, useRef, useEffect } from 'react'

const BRAND = '#1a73e8'
const BRAND_BG = '#f0f6ff'

const tabs = [
  { id: 'tos', label: 'Terms of Service' },
  { id: 'psu', label: 'Payment Services Terms' },
  { id: 'privacy', label: 'Privacy Policy' },
  { id: 'disclaimer', label: 'Disclaimer' },
]

/* ─── TOS Content ─── */
const tosContent = [
  { id: 'tos-1', title: '1. Introduction', body: (<><p>Welcome to <strong>Talyn LLC ("Talyn", "we", "our", or "us")</strong>.</p><p>Talyn provides a platform and services that help companies hire, manage, and pay global talent, including recruiting, payroll, and compliance support.</p><p>By accessing or using Talyn's platform or services, you agree to these Terms.</p></>) },
  { id: 'tos-2', title: '2. Our Services', body: (<><p>Talyn provides:</p><p><strong>Talent Services</strong></p><ul><li>Candidate sourcing and vetting</li><li>Skill assessments and interviews</li><li>Talent matching</li></ul><p><strong>Workforce & Employment Services</strong></p><ul><li>Employer of Record (EOR) solutions</li><li>Contractor engagement support</li><li>Payroll processing and payments</li><li>HR and compliance assistance</li></ul><p>Talyn acts as an <strong>infrastructure provider</strong>, not the direct manager of day-to-day work.</p><p>Clients remain responsible for managing talent performance.</p></>) },
  { id: 'tos-3', title: '3. Client Responsibilities', body: (<><p>By using Talyn, you agree to:</p><ul><li>Provide accurate role and company information</li><li>Manage daily work, tasks, and expectations</li><li>Comply with applicable employment and labor laws</li><li>Not misuse or misclassify workers</li></ul><p>Clients are responsible for:</p><ul><li>Work output</li><li>Supervision</li><li>Performance management</li></ul></>) },
  { id: 'tos-4', title: '4. Worker Engagement Models', body: (<><p>Talyn may engage workers through:</p><ul><li>Employer of Record (EOR)</li><li>Independent contractor agreements</li></ul><p>Classification is determined based on:</p><ul><li>Jurisdiction</li><li>Role structure</li><li>Legal requirements</li></ul></>) },
  { id: 'tos-5', title: '5. Payments & Fees', body: (<><p>Clients agree to:</p><ul><li>Pay all invoices in full and on time</li><li>Cover salaries, taxes, and service fees</li><li>Maintain valid payment methods</li></ul><p>Late payments may result in:</p><ul><li>Service suspension</li><li>Termination of agreements</li><li>Additional fees</li></ul></>) },
  { id: 'tos-6', title: '6. Intellectual Property', body: (<><ul><li>Work created by talent for clients is assigned to the client</li><li>Talyn retains ownership of:<ul><li>Platform technology</li><li>Systems</li><li>Processes</li></ul></li></ul></>) },
  { id: 'tos-7', title: '7. Confidentiality', body: (<><p>All parties agree to:</p><ul><li>Protect confidential information</li><li>Not disclose proprietary data</li><li>Use information only for intended purposes</li></ul></>) },
  { id: 'tos-8', title: '8. Limitation of Liability', body: (<><p>Talyn is not liable for:</p><ul><li>Performance of workers</li><li>Indirect or consequential damages</li><li>Business losses</li></ul><p>Total liability is limited to fees paid within a defined period.</p></>) },
  { id: 'tos-9', title: '9. Termination', body: (<><p>Either party may terminate services:</p><ul><li>With notice</li><li>Immediately for breach</li></ul><p>Upon termination:</p><ul><li>All outstanding payments are due</li><li>Access to services may be revoked</li></ul></>) },
  { id: 'tos-10', title: '10. Governing Law', body: (<p>These Terms are governed by the State of formation of Talyn LLC.</p>) },
]

/* ─── PSU Content ─── */
const psuContent = [
  { id: 'psu-1', title: '1. Overview', body: (<><p>These Payment Services User Terms (the "PSU Terms") govern your access to and use of regulated financial services provided by Talyn Global LLC (DBA Talyn LLC) ("Talyn," "we," "us," or "our") (the "Payment Services"). Talyn Global LLC (DBA Talyn LLC) is a Texas limited liability company with a principal place of business at 2702 E Fifth St, #830, Tyler, TX 75701, United States.</p><p>For purposes of these PSU Terms, "you" or "your" means the individual accessing the Payment Services, or, if acting on behalf of a business, that legal entity. By using the Payment Services, you agree to be bound by these PSU Terms.</p><p>We may update these PSU Terms at any time. Continued use of the Payment Services after updates are posted constitutes your acceptance of the revised terms.</p></>) },
  { id: 'psu-2', title: '2. Key Definitions', body: (<><p>The following terms have the meanings set forth below:</p><ul><li><strong>"Account Owner"</strong> — The individual or entity that registers a Talyn account and is responsible for its use.</li><li><strong>"Applicable Law"</strong> — All applicable federal, state, and local laws and regulations, including the Bank Secrecy Act, USA PATRIOT Act, Electronic Fund Transfer Act, state money transmission laws, and OFAC sanctions regulations.</li><li><strong>"Authorized User"</strong> — Any person granted credentials by an Account Owner to access Payment Services on their behalf.</li><li><strong>"Bank Account"</strong> — The U.S. bank account designated by you for ACH debits or other funding transactions.</li><li><strong>"Business Day"</strong> — Any weekday when U.S. financial institutions are open.</li><li><strong>"Payment Account"</strong> — An account held by Talyn on your behalf for Payment Services.</li><li><strong>"Payment Instruction"</strong> — A direction submitted through the Talyn Platform to initiate, authorize, or cancel a payment.</li><li><strong>"Payout"</strong> — A payment made to a payee through the Payment Services.</li><li><strong>"Unauthorized Transaction"</strong> — A payment from your account that you did not authorize or that resulted from fraud or compromised credentials.</li></ul></>) },
  { id: 'psu-3', title: '3. Eligibility', body: (<><p>To access the Payment Services, you must:</p><ul><li>Be at least 18 years old and legally capable of entering binding contracts.</li><li>Be a U.S. resident using U.S. financial institutions (unless otherwise permitted by law).</li><li>Use a business-purpose bank account when funding Payment Instructions.</li><li>Not be located in or a resident of any country subject to comprehensive U.S. sanctions.</li></ul></>) },
  { id: 'psu-4', title: '4. Account Setup & Access', body: (<><p>To use the Payment Services, you must have an active account on the Talyn Platform. You are responsible for the accuracy of all information submitted during registration.</p><p>Access may be refused, suspended, or revoked if:</p><ul><li>Your account is suspended or deactivated under the Platform Terms.</li><li>Required information is inaccurate, incomplete, or cannot be verified.</li><li>We identify suspected fraud, unauthorized activity, or potential violations of Applicable Law.</li></ul></>) },
  { id: 'psu-5', title: '5. Payment Instructions', body: (<><p>All Payment Instructions must be submitted through your Talyn account. We reserve the right to reject, delay, or refuse any Instruction if:</p><ul><li>Required funds are not received in full and on time.</li><li>The Instruction contains inaccurate or incomplete information.</li><li>Processing would violate NACHA rules, Applicable Law, sanctions, or our internal risk policies.</li></ul><p>Once submitted, an Instruction is generally irrevocable. You are solely responsible for verifying accuracy before submission.</p></>) },
  { id: 'psu-6', title: '6. Authorized Users', body: (<><p>You may designate individuals to act on your behalf as Authorized Users. Any Instruction submitted by an Authorized User is deemed authorized by you, and you are fully responsible for their actions.</p></>) },
  { id: 'psu-7', title: '7. Identity Verification & Compliance', body: (<><p>To comply with Applicable Law, we are required to conduct Customer Due Diligence before providing Payment Services. You must provide accurate, up-to-date information and supply any additional documentation requested within two (2) Business Days.</p></>) },
  { id: 'psu-8', title: '8. ACH Authorization', body: (<><p>By providing your Bank Account details and initiating an ACH transaction, you:</p><ul><li>Authorize Talyn to initiate ACH debits and credits from your Bank Account.</li><li>Confirm the account information is accurate and you are authorized to use it.</li><li>Agree to maintain sufficient funds to cover authorized debits.</li></ul><p>This authorization remains in effect until revoked in writing in accordance with NACHA Rules.</p></>) },
  { id: 'psu-9', title: '9. Wire Transfer & ACH Push Funding', body: (<><p>For Instructions funded by wire transfer or ACH push, Talyn will provide specific funding instructions through the Platform. Your Instruction remains inactive until funds are received in full in cleared form.</p></>) },
  { id: 'psu-10', title: '10. Payment Services & Payouts', body: (<><p>You may instruct Talyn to initiate a Payout by submitting the required details through the Talyn Platform. Payouts will only be executed once required funds have been received in full.</p><p>All Payouts are provided on an execution-only basis. Talyn does not provide investment, tax, legal, or financial advice.</p></>) },
  { id: 'psu-11', title: '11. Payment Account', body: (<><p>Where required, Talyn will open and maintain a Payment Account on your behalf upon successful identity verification. Funds held in your Payment Account are not bank deposits and are not insured by the FDIC.</p></>) },
  { id: 'psu-12', title: '12. Fees', body: (<><p>Payment Service fees are included in your Talyn service plan. However, third-party processing fees, intermediary bank charges, or FX-related costs may apply and will be passed on to you at cost. All fees are exclusive of applicable taxes.</p></>) },
  { id: 'psu-13', title: '13. Unauthorized & Incorrect Payments', body: (<><p>Notify Talyn immediately if you become aware of any unauthorized or incorrect transactions. You must report Unauthorized Transactions within 60 days of the relevant statement. Businesses must report within 30 days of discovery.</p></>) },
  { id: 'psu-14', title: '14. Reversals, Chargebacks & Negative Balances', body: (<><p>If a payment you receive or initiate is reversed, refunded, or disputed, you remain fully liable to Talyn for the original amount plus any associated fees and costs. Any negative balance represents a debt owed to Talyn.</p></>) },
  { id: 'psu-15', title: '15. Representations & Warranties', body: (<><p><strong>By Talyn:</strong></p><ul><li>We have full authority to enter into these PSU Terms.</li><li>Payment Services will be provided professionally.</li><li>We will use reasonable efforts to comply with Applicable Law.</li></ul><p><strong>By You:</strong></p><ul><li>You have full authority to enter into these PSU Terms.</li><li>You will comply with all Applicable Laws.</li><li>All information you provide will be complete, accurate, and not misleading.</li></ul></>) },
  { id: 'psu-16', title: '16. Limitation of Liability', body: (<><p>Talyn is not liable for any indirect, incidental, special, punitive, or consequential damages. Talyn's total aggregate liability shall not exceed the total fees paid by you in the twelve (12) months preceding the claim.</p></>) },
  { id: 'psu-17', title: '17. Indemnity', body: (<><p>You will indemnify Talyn against all losses, damages, and costs arising from:</p><ul><li>Your breach of these PSU Terms or any Applicable Law.</li><li>Any Payment Instruction later alleged to be erroneous, invalid, or unlawful.</li><li>Cancellation, reversal, or failure to fund a Payment Instruction.</li></ul></>) },
  { id: 'psu-18', title: '18. Confidentiality', body: (<><p>Each party agrees to protect the other's Confidential Information with reasonable care. Confidentiality obligations survive termination for two (2) years.</p></>) },
  { id: 'psu-19', title: '19. Privacy & Personal Data', body: (<p>By using the Payment Services, you acknowledge that your data may be collected and processed in accordance with Talyn's Privacy Policy.</p>) },
  { id: 'psu-20', title: '20. Information Security', body: (<><p>Each party agrees to implement appropriate safeguards to protect User Data from unauthorized access, disclosure, or destruction.</p></>) },
  { id: 'psu-21', title: '21. Intellectual Property', body: (<><p>Talyn retains all right, title, and interest in the Payment Services and related technology. You retain ownership of your User Data.</p></>) },
  { id: 'psu-22', title: '22. Compliance — Anti-Corruption & Sanctions', body: (<><p>Each party shall comply with all applicable anti-bribery, anti-money laundering, and anti-corruption laws, including the FCPA, Bank Secrecy Act, USA PATRIOT Act, and OFAC sanctions regulations.</p></>) },
  { id: 'psu-23', title: '23. Force Majeure', body: (<p>Neither party is liable for failure or delay due to events beyond their reasonable control. Force Majeure does not relieve you of any payment obligations.</p>) },
  { id: 'psu-24', title: '24. Term, Termination & Suspension', body: (<><p>Talyn may suspend or terminate your access at any time for breach, suspected fraud, legal requirements, or account inactivity. Upon termination, you remain responsible for all outstanding obligations.</p></>) },
  { id: 'psu-25', title: '25. Disputes & Error Resolution', body: (<><p>If you believe an error has occurred, contact us promptly. You must notify us within 60 days. We will investigate within 90 days.</p></>) },
  { id: 'psu-26', title: '26. Contact', body: (<><p><strong>Talyn Global LLC (DBA Talyn LLC)</strong><br />2702 E Fifth St, #803, Tyler, TX 75701</p><p>Email: sam@inergyx.us<br />Phone: 903-426-5303</p></>) },
  { id: 'psu-27', title: '27. Miscellaneous', body: (<><ul><li><strong>Governing Language:</strong> English governs.</li><li><strong>Waiver:</strong> Failure to enforce any provision does not constitute a waiver.</li><li><strong>Severability:</strong> If any provision is unenforceable, the remainder continues.</li><li><strong>Assignment:</strong> Talyn may transfer its rights. You may not without consent.</li><li><strong>Entire Agreement:</strong> These PSU Terms constitute the entire agreement.</li></ul></>) },
  { id: 'psu-28', title: '28. State Disclosures', body: (<p>Residents of certain U.S. states may have additional rights. Please refer to Talyn's licensing page or contact us.</p>) },
]

/* ─── Privacy Policy Content ─── */
const privacyContent = [
  { id: 'priv-1', title: '1. Overview', body: (<><p>Talyn LLC is committed to protecting your personal data and privacy.</p><p>This policy explains how we collect, use, and protect your information.</p></>) },
  { id: 'priv-2', title: '2. Information We Collect', body: (<><p><strong>From Clients</strong></p><ul><li>Company details</li><li>Contact information</li><li>Billing and payment data</li></ul><p><strong>From Talent</strong></p><ul><li>Resumes and qualifications</li><li>Identity and employment data</li><li>Payment details</li></ul><p><strong>Platform Data</strong></p><ul><li>Usage activity</li><li>Login and device data</li></ul></>) },
  { id: 'priv-3', title: '3. How We Use Your Data', body: (<><p>We use data to:</p><ul><li>Provide services</li><li>Match talent with clients</li><li>Process payroll and payments</li><li>Ensure compliance</li><li>Improve our platform</li></ul></>) },
  { id: 'priv-4', title: '4. Data Sharing', body: (<><p>We may share data with:</p><ul><li>Clients and talent (for hiring purposes)</li><li>Payroll and payment providers</li><li>Compliance and legal partners</li><li>Service providers (hosting, analytics)</li></ul><p>We do <strong>not sell personal data</strong>.</p></>) },
  { id: 'priv-5', title: '5. Data Security', body: (<><p>We use:</p><ul><li>Encryption</li><li>Access controls</li><li>Secure infrastructure</li></ul><p>However, no system is fully immune to risk.</p></>) },
  { id: 'priv-6', title: '6. International Transfers', body: (<><p>Data may be transferred across countries with appropriate safeguards applied.</p></>) },
  { id: 'priv-7', title: '7. Data Retention', body: (<><p>We retain data as long as needed for services and to meet legal obligations.</p></>) },
  { id: 'priv-8', title: '8. Your Rights', body: (<><p>Depending on jurisdiction, you may:</p><ul><li>Access your data</li><li>Request corrections</li><li>Request deletion</li><li>Object to processing</li></ul></>) },
  { id: 'priv-9', title: '9. Cookies', body: (<><p>Talyn uses cookies to improve experience, analyze usage, and support platform functionality.</p></>) },
  { id: 'priv-10', title: '10. Updates', body: (<p>We may update this policy periodically.</p>) },
  { id: 'priv-11', title: '11. Contact', body: (<p>For privacy inquiries: <strong>contact@talyn.com</strong></p>) },
]

/* ─── Disclaimer Content ─── */
const disclaimerContent = [
  { id: 'disc-1', title: '1. General Disclaimer', body: (<><p>Talyn provides workforce infrastructure services but does not guarantee:</p><ul><li>Job performance</li><li>Hiring outcomes</li><li>Business results</li></ul></>) },
  { id: 'disc-2', title: '2. No Legal or Tax Advice', body: (<><p>Talyn does not provide:</p><ul><li>Legal advice</li><li>Tax advice</li></ul><p>Clients should consult qualified professionals.</p></>) },
  { id: 'disc-3', title: '3. Employment Responsibility', body: (<><p>Clients remain responsible for:</p><ul><li>Supervising workers</li><li>Defining job expectations</li><li>Evaluating performance</li></ul></>) },
  { id: 'disc-4', title: '4. Platform Use', body: (<><p>Use of Talyn's platform is at your own risk.</p><p>Talyn does not guarantee:</p><ul><li>Uninterrupted service</li><li>Error-free operation</li></ul></>) },
]

const contentMap = {
  tos: { title: 'Talyn Terms of Service', sections: tosContent },
  psu: { title: 'Payment Services User Terms', subtitle: 'Talyn Global LLC (DBA Talyn LLC)', lastUpdated: '03/29/2026', sections: psuContent },
  privacy: { title: 'Talyn Privacy Policy', sections: privacyContent },
  disclaimer: { title: 'Talyn Disclaimer', sections: disclaimerContent },
}

export default function TermsModal({ onAccept, onClose }) {
  const [activeTab, setActiveTab] = useState('tos')
  const [scrollProgress, setScrollProgress] = useState(0)
  const [activeSection, setActiveSection] = useState('')
  const [hasScrolledEnough, setHasScrolledEnough] = useState(false)
  const contentRef = useRef(null)

  const currentDoc = contentMap[activeTab]

  useEffect(() => {
    setScrollProgress(0)
    setHasScrolledEnough(false)
    setActiveSection(currentDoc.sections[0]?.id || '')
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [activeTab])

  const handleScroll = () => {
    const el = contentRef.current
    if (!el) return
    const pct = el.scrollTop / (el.scrollHeight - el.clientHeight || 1)
    setScrollProgress(Math.min(pct, 1))
    if (pct >= 0.9) setHasScrolledEnough(true)

    const sectionEls = el.querySelectorAll('[data-section-id]')
    let current = ''
    sectionEls.forEach((s) => {
      if (s.offsetTop - el.scrollTop < 160) current = s.dataset.sectionId
    })
    if (current) setActiveSection(current)
  }

  const scrollToSection = (id) => {
    const el = contentRef.current?.querySelector(`[data-section-id="${id}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md flex items-center justify-center text-white text-sm font-bold" style={{ background: BRAND }}>T</div>
              <span className="text-base font-bold text-gray-900 dark:text-white">Talyn</span>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-2">Legal</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
              <span className="material-icons-outlined">close</span>
            </button>
          </div>
          {/* Progress bar */}
          <div className="h-0.5 bg-gray-100 dark:bg-gray-800">
            <div className="h-0.5 transition-all duration-100" style={{ background: BRAND, width: `${scrollProgress * 100}%` }} />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-x-auto shrink-0">
          <div className="flex px-6">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  activeTab === t.id
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* TOC sidebar */}
          <nav className="w-56 min-w-[14rem] p-4 border-r border-gray-100 dark:border-gray-800 overflow-y-auto hidden md:flex flex-col gap-0.5">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 pl-2.5">Contents</div>
            {currentDoc.sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={`block w-full text-left px-2.5 py-1.5 text-[13px] rounded-md transition ${
                  activeSection === s.id
                    ? 'text-primary font-semibold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                style={activeSection === s.id ? { background: BRAND_BG } : {}}
              >
                {s.title}
              </button>
            ))}
          </nav>

          {/* Content area */}
          <div
            ref={contentRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-8 terms-content"
          >
            <div className="max-w-2xl">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{currentDoc.title}</h1>
              {currentDoc.subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{currentDoc.subtitle}</p>}
              {currentDoc.lastUpdated && <p className="text-xs text-gray-400 italic mt-1">Last Updated: {currentDoc.lastUpdated}</p>}
              <hr className="border-gray-200 dark:border-gray-700 my-6" />

              {currentDoc.sections.map((section) => (
                <div key={section.id} data-section-id={section.id} className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 pt-2">{section.title}</h2>
                  <div className="text-[15px] leading-relaxed text-gray-600 dark:text-gray-300 terms-section-body">
                    {section.body}
                  </div>
                </div>
              ))}

              <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 italic">
                &copy; 2026 Talyn Global LLC (DBA Talyn LLC). All rights reserved.
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Accept */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between shrink-0 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-xs text-gray-400">
            {hasScrolledEnough
              ? 'You have reviewed this document'
              : 'Please scroll through the document to continue'}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={onAccept}
              disabled={!hasScrolledEnough}
              className="px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
            >
              Accept Terms & Conditions
            </button>
          </div>
        </div>
      </div>

      {/* Scoped styles for terms content */}
      <style>{`
        .terms-section-body ul { margin: 8px 0 16px 0; padding-left: 24px; list-style-type: disc; }
        .terms-section-body li { margin-bottom: 6px; line-height: 1.65; }
        .terms-section-body li ul { margin-top: 6px; margin-bottom: 8px; }
        .terms-section-body p { margin: 0 0 12px 0; }
        .terms-section-body strong { font-weight: 600; }
      `}</style>
    </div>
  )
}
