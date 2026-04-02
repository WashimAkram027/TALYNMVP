/**
 * PDF Template Service
 *
 * Renders React financial document components to static HTML for Anvil PDF generation.
 * The same React components are used in the frontend for web preview — single source of truth.
 *
 * Pre-compiled components live in ./compiled/ (built by scripts/buildComponents.js).
 */

import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { InvoiceDocument, ReceiptDocument, PayslipDocument, PlatformFeeInvoice, PlatformFeeReceipt, PerEmployeeInvoice, PerEmployeeReceipt } from './compiled/FinancialDocuments.js'
import { QuoteDocument, TalynLogo } from './compiled/QuoteDocument.js'
import { TALYN_LOGO_BASE64 } from '../config/talyn-logo-base64.js'

/* ═══════════════════════════════════════════════
 * CONSTANTS
 * ═══════════════════════════════════════════════ */

const TALYN_ADDRESS = {
  name: 'Talyn Global LLC (DBA Talyn LLC)',
  address: '2702 E Fifth St, #803',
  cityStateZip: 'Tyler, TX 75701',
  country: 'United States',
  phone: '+1 903-426-5303',
}

/** Minimal CSS for Anvil page sizing — all other styles are inline from React */
const PAGE_CSS = `
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; }
`

/* ═══════════════════════════════════════════════
 * HELPERS
 * ═══════════════════════════════════════════════ */

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

function formatRate(rate) {
  return `${(parseFloat(rate) * 100).toFixed(0)}%`
}

function capitalizeWords(str) {
  if (!str) return '—'
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/** Render a React component to a full HTML document */
function renderToHtml(component, props) {
  const markup = renderToStaticMarkup(createElement(component, props))
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>${markup}</body>
</html>`
  return { html, css: PAGE_CSS }
}

/* ═══════════════════════════════════════════════
 * 1. INVOICE
 * ═══════════════════════════════════════════════ */

/**
 * Build HTML for a billing invoice PDF
 * @param {Object} invoice - Invoice record with line_items JSONB
 * @param {Object} organization - Organization record
 * @param {'summary'|'detail'} [variant='detail']
 * @returns {{ html: string, css: string }}
 */
export function buildInvoiceHtml(invoice, organization, variant = 'detail') {
  const lineItems = invoice.line_items || []
  const config = invoice.config_snapshot || {}
  const exchangeRate = parseFloat(invoice.exchange_rate) || 0
  const platformFeePerEmp = config.platform_fee_amount || 0

  const props = {
    logoSrc: TALYN_LOGO_BASE64,
    variant,
    docNumber: invoice.invoice_number,
    issueDate: formatDate(invoice.issue_date),
    dueDate: formatDate(invoice.due_date),
    billFrom: TALYN_ADDRESS,
    billTo: {
      name: organization?.name || '—',
      address: [organization?.address_line1, organization?.address_line2].filter(Boolean).join(', '),
      cityStateZip: [organization?.city, organization?.state, organization?.postal_code].filter(Boolean).join(', '),
      country: organization?.country || '',
    },
    totalDue: (invoice.total_amount_cents || 0) / 100,
    summaryRows: [
      { label: 'Employee invoices total', amount: lineItems.reduce((s, i) => s + (i.cost_usd_cents || 0), 0) / 100 },
      { label: `Platform fee (${lineItems.length} × $${(platformFeePerEmp / 100).toFixed(0)})`, amount: (invoice.platform_fee_cents || 0) / 100 },
    ],
    paymentDetails: exchangeRate ? {
      exchangeFrom: 'NPR',
      exchangeTo: 'USD',
      exchangeRate: exchangeRate.toFixed(7),
    } : undefined,
    employees: lineItems.map(item => ({
      name: item.member_name,
      role: item.job_title,
      period: `${formatDate(invoice.billing_period_start)} to ${formatDate(invoice.billing_period_end)}`,
      lineItems: [
        {
          description: 'Salary',
          detail: 'Monthly gross salary — regular work',
          amountNPR: (item.monthly_gross_local || 0) / 100,
          amountUSD: Math.round((item.monthly_gross_local || 0) * exchangeRate) / 100,
        },
        {
          description: `Employer SSF (${config.employer_ssf_rate ? formatRate(config.employer_ssf_rate) : '20%'})`,
          detail: 'Social Security Fund',
          amountNPR: (item.employer_ssf_local || 0) / 100,
          amountUSD: Math.round((item.employer_ssf_local || 0) * exchangeRate) / 100,
        },
      ],
      total: (item.cost_usd_cents || 0) / 100,
    })),
    platformFees: lineItems.map(item => ({
      name: item.member_name,
      role: item.job_title,
      lineItems: [{ description: 'EOR platform fee', amountUSD: (item.platform_fee_cents || 0) / 100 }],
      total: (item.platform_fee_cents || 0) / 100,
    })),
    refNumber: invoice.id?.substring(0, 8),
  }

  return renderToHtml(InvoiceDocument, props)
}

/* ═══════════════════════════════════════════════
 * 2. RECEIPT
 * ═══════════════════════════════════════════════ */

/**
 * Build HTML for a payment receipt PDF
 * @param {Object} invoice - Invoice record
 * @param {Object} organization - Organization record
 * @param {string} [paymentDate]
 * @param {'summary'|'detail'} [variant='detail']
 * @returns {{ html: string, css: string }}
 */
export function buildReceiptHtml(invoice, organization, paymentDate, variant = 'detail') {
  const lineItems = invoice.line_items || []
  const config = invoice.config_snapshot || {}
  const exchangeRate = parseFloat(invoice.exchange_rate) || 0
  const platformFeePerEmp = config.platform_fee_amount || 0
  const paidDate = formatDate(paymentDate || invoice.paid_at)

  const props = {
    logoSrc: TALYN_LOGO_BASE64,
    variant,
    docNumber: invoice.invoice_number,
    issueDate: formatDate(invoice.issue_date),
    paidDate,
    billFrom: TALYN_ADDRESS,
    billTo: {
      name: organization?.name || '—',
      address: [organization?.address_line1, organization?.address_line2].filter(Boolean).join(', '),
      cityStateZip: [organization?.city, organization?.state, organization?.postal_code].filter(Boolean).join(', '),
      country: organization?.country || '',
    },
    totalPaid: (invoice.total_amount_cents || 0) / 100,
    summaryRows: [
      { label: 'Employee invoices total', amount: lineItems.reduce((s, i) => s + (i.cost_usd_cents || 0), 0) / 100 },
      { label: `Platform fee (${lineItems.length} × $${(platformFeePerEmp / 100).toFixed(0)})`, amount: (invoice.platform_fee_cents || 0) / 100 },
    ],
    paymentDetails: exchangeRate ? {
      exchangeFrom: 'NPR',
      exchangeTo: 'USD',
      exchangeRate: exchangeRate.toFixed(7),
    } : undefined,
    employees: lineItems.map(item => ({
      name: item.member_name,
      role: item.job_title,
      period: `${formatDate(invoice.billing_period_start)} to ${formatDate(invoice.billing_period_end)}`,
      lineItems: [
        {
          description: 'Salary',
          detail: 'Monthly gross salary — regular work',
          amountNPR: (item.monthly_gross_local || 0) / 100,
          amountUSD: Math.round((item.monthly_gross_local || 0) * exchangeRate) / 100,
        },
        {
          description: `Employer SSF (${config.employer_ssf_rate ? formatRate(config.employer_ssf_rate) : '20%'})`,
          detail: 'Social Security Fund',
          amountNPR: (item.employer_ssf_local || 0) / 100,
          amountUSD: Math.round((item.employer_ssf_local || 0) * exchangeRate) / 100,
        },
      ],
      total: (item.cost_usd_cents || 0) / 100,
    })),
    platformFees: lineItems.map(item => ({
      name: item.member_name,
      role: item.job_title,
      lineItems: [{ description: 'EOR platform fee', amountUSD: (item.platform_fee_cents || 0) / 100 }],
      total: (item.platform_fee_cents || 0) / 100,
    })),
    refNumber: invoice.id?.substring(0, 8),
  }

  return renderToHtml(ReceiptDocument, props)
}

/* ═══════════════════════════════════════════════
 * 3. PAYSLIP
 * ═══════════════════════════════════════════════ */

/**
 * Build HTML for an employee payslip PDF
 * @param {Object} payrollItem - payroll_items record (amounts in NPR major units)
 * @param {Object} member - { full_name, email, job_title, start_date, member_id }
 * @param {Object} organization - Organization record
 * @param {string} period - e.g. "March 2026"
 * @returns {{ html: string, css: string }}
 */
export function buildPayslipHtml(payrollItem, member, organization, period) {
  const baseSalary = parseFloat(payrollItem.base_salary) || 0
  const basic = baseSalary * 0.6
  const dearness = baseSalary * 0.4
  const employeeSsf = parseFloat(payrollItem.employee_ssf) || 0
  const memberId = member.member_id ? String(member.member_id).substring(0, 8).toUpperCase() : '—'

  const props = {
    logoSrc: TALYN_LOGO_BASE64,
    period,
    employee: {
      name: member.full_name || '—',
      oid: `TLN-${memberId}`,
      joinDate: member.start_date ? formatDate(member.start_date) : '—',
      designation: member.job_title || '—',
      pan: '—',
      bankAccount: null,
      bankName: '—',
    },
    incomeItems: [
      { label: 'Basic salary', amount: basic },
      { label: 'Dearness allowance', amount: dearness },
      { label: 'Other allowance', amount: null },
      { label: 'Festival allowance', amount: null },
      { label: 'Bonus', amount: null },
      { label: 'Leave encashments', amount: null },
      { label: 'Other payments', amount: null },
    ],
    deductionItems: [
      { label: 'SSF (employee)', amount: employeeSsf > 0 ? employeeSsf : null },
      { label: 'Income tax', amount: null },
    ],
    totalGross: baseSalary,
    totalDeductions: parseFloat(payrollItem.deductions) || 0,
    netSalary: parseFloat(payrollItem.net_amount) || 0,
  }

  return renderToHtml(PayslipDocument, props)
}

/* ═══════════════════════════════════════════════
 * 4. PLATFORM FEE INVOICE
 * ═══════════════════════════════════════════════ */

/**
 * Build HTML for a per-employee platform fee invoice PDF
 * @param {Object} params
 * @param {string} params.docNumber - Invoice number
 * @param {string} params.issueDate - Issue date string
 * @param {string} params.dueDate - Due date string
 * @param {Object} params.organization - Organization record (bill-to)
 * @param {Object} params.employee - { name, jobTitle }
 * @param {number} params.platformFee - Fee amount in USD (major units)
 * @param {string} [params.refNumber]
 * @returns {{ html: string, css: string }}
 */
export function buildPlatformFeeInvoiceHtml({ docNumber, issueDate, dueDate, organization, employee, platformFee, refNumber }) {
  const props = {
    logoSrc: TALYN_LOGO_BASE64,
    docNumber,
    issueDate: typeof issueDate === 'string' && issueDate.includes('-') ? formatDate(issueDate) : issueDate,
    dueDate: typeof dueDate === 'string' && dueDate.includes('-') ? formatDate(dueDate) : dueDate,
    billFrom: TALYN_ADDRESS,
    billTo: {
      name: organization?.name || '—',
      address: [organization?.address_line1, organization?.address_line2].filter(Boolean).join(', '),
      cityStateZip: [organization?.city, organization?.state, organization?.postal_code].filter(Boolean).join(', '),
      country: organization?.country || '',
    },
    employee: {
      name: employee.name,
      jobTitle: employee.jobTitle,
    },
    platformFee,
    totalDue: platformFee,
    refNumber,
  }

  return renderToHtml(PlatformFeeInvoice, props)
}

/* ═══════════════════════════════════════════════
 * 5. PLATFORM FEE RECEIPT
 * ═══════════════════════════════════════════════ */

/**
 * Build HTML for a per-employee platform fee receipt PDF
 * @param {Object} params
 * @param {string} params.docNumber
 * @param {string} params.issueDate
 * @param {string} params.paidDate
 * @param {Object} params.organization - Organization record (bill-to)
 * @param {Object} params.employee - { name, jobTitle }
 * @param {number} params.platformFee - Fee amount in USD (major units)
 * @param {string} [params.refNumber]
 * @returns {{ html: string, css: string }}
 */
export function buildPlatformFeeReceiptHtml({ docNumber, issueDate, paidDate, organization, employee, platformFee, refNumber }) {
  const props = {
    logoSrc: TALYN_LOGO_BASE64,
    docNumber,
    issueDate: typeof issueDate === 'string' && issueDate.includes('-') ? formatDate(issueDate) : issueDate,
    paidDate: typeof paidDate === 'string' && paidDate.includes('-') ? formatDate(paidDate) : paidDate,
    billFrom: TALYN_ADDRESS,
    billTo: {
      name: organization?.name || '—',
      address: [organization?.address_line1, organization?.address_line2].filter(Boolean).join(', '),
      cityStateZip: [organization?.city, organization?.state, organization?.postal_code].filter(Boolean).join(', '),
      country: organization?.country || '',
    },
    employee: { name: employee.name, jobTitle: employee.jobTitle },
    platformFee,
    totalPaid: platformFee,
    refNumber,
  }

  return renderToHtml(PlatformFeeReceipt, props)
}

/* ═══════════════════════════════════════════════
 * 6. PER-EMPLOYEE INVOICE
 * ═══════════════════════════════════════════════ */

/**
 * Build HTML for a per-employee salary/costs invoice PDF
 * @param {Object} params
 * @param {string} params.docNumber
 * @param {string} params.issueDate
 * @param {string} params.dueDate
 * @param {Object} params.organization - Organization record (bill-to)
 * @param {Object} params.employee - { name, jobTitle }
 * @param {string} [params.period] - e.g. "March 1, 2026 to March 31, 2026"
 * @param {{ description: string, detail?: string, amountNPR?: number, amountUSD: number }[]} params.lineItems
 * @param {number} params.totalDue - Total in USD
 * @param {Object} [params.paymentDetails] - { exchangeFrom, exchangeTo, exchangeRate }
 * @param {string} [params.refNumber]
 * @returns {{ html: string, css: string }}
 */
export function buildPerEmployeeInvoiceHtml({ docNumber, issueDate, dueDate, organization, employee, period, lineItems, totalDue, paymentDetails, refNumber }) {
  const props = {
    logoSrc: TALYN_LOGO_BASE64,
    docNumber,
    issueDate: typeof issueDate === 'string' && issueDate.includes('-') ? formatDate(issueDate) : issueDate,
    dueDate: typeof dueDate === 'string' && dueDate.includes('-') ? formatDate(dueDate) : dueDate,
    billFrom: TALYN_ADDRESS,
    billTo: {
      name: organization?.name || '—',
      address: [organization?.address_line1, organization?.address_line2].filter(Boolean).join(', '),
      cityStateZip: [organization?.city, organization?.state, organization?.postal_code].filter(Boolean).join(', '),
      country: organization?.country || '',
    },
    employee: { name: employee.name, jobTitle: employee.jobTitle },
    period,
    lineItems,
    totalDue,
    paymentDetails,
    refNumber,
  }

  return renderToHtml(PerEmployeeInvoice, props)
}

/* ═══════════════════════════════════════════════
 * 7. PER-EMPLOYEE RECEIPT
 * ═══════════════════════════════════════════════ */

/**
 * Build HTML for a per-employee salary/costs receipt PDF
 * @param {Object} params
 * @param {string} params.docNumber
 * @param {string} params.issueDate
 * @param {string} params.paidDate
 * @param {Object} params.organization - Organization record (bill-to)
 * @param {Object} params.employee - { name, jobTitle }
 * @param {string} [params.period]
 * @param {{ description: string, detail?: string, amountNPR?: number, amountUSD: number }[]} params.lineItems
 * @param {number} params.totalPaid - Total in USD
 * @param {Object} [params.paymentDetails] - { exchangeFrom, exchangeTo, exchangeRate }
 * @param {string} [params.refNumber]
 * @returns {{ html: string, css: string }}
 */
export function buildPerEmployeeReceiptHtml({ docNumber, issueDate, paidDate, organization, employee, period, lineItems, totalPaid, paymentDetails, refNumber }) {
  const props = {
    logoSrc: TALYN_LOGO_BASE64,
    docNumber,
    issueDate: typeof issueDate === 'string' && issueDate.includes('-') ? formatDate(issueDate) : issueDate,
    paidDate: typeof paidDate === 'string' && paidDate.includes('-') ? formatDate(paidDate) : paidDate,
    billFrom: TALYN_ADDRESS,
    billTo: {
      name: organization?.name || '—',
      address: [organization?.address_line1, organization?.address_line2].filter(Boolean).join(', '),
      cityStateZip: [organization?.city, organization?.state, organization?.postal_code].filter(Boolean).join(', '),
      country: organization?.country || '',
    },
    employee: { name: employee.name, jobTitle: employee.jobTitle },
    period,
    lineItems,
    totalPaid,
    paymentDetails,
    refNumber,
  }

  return renderToHtml(PerEmployeeReceipt, props)
}

/* ═══════════════════════════════════════════════
 * 8. EOR COST QUOTE
 * ═══════════════════════════════════════════════ */

/**
 * Build HTML for an EOR cost quote PDF
 * @param {Object} quote - eor_quotes record
 * @param {Object} organization - Organization record
 * @param {Object} generatedByUser - User who generated the quote
 * @returns {{ html: string, css: string }}
 */
export function buildQuoteHtml(quote, organization, generatedByUser) {
  const props = {
    logoSrc: TALYN_LOGO_BASE64,
    quoteNumber: quote.quote_number,
    date: formatDate(quote.created_at),
    validUntil: formatDate(quote.valid_until),
    orgName: organization?.name || '—',
    generatedBy: generatedByUser?.full_name || generatedByUser?.email || '—',
    employee: {
      name: [quote.employee_first_name, quote.employee_last_name].filter(Boolean).join(' ') || quote.employee_email,
      email: quote.employee_email,
      role: quote.job_title,
      department: quote.department,
      employmentType: capitalizeWords(quote.employment_type),
      startDate: formatDate(quote.start_date),
      payFrequency: capitalizeWords(quote.pay_frequency),
      country: `Nepal (${quote.country_code || 'NPL'})`,
    },
    costs: {
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
    },
    status: quote.status || 'draft',
  }

  return renderToHtml(QuoteDocument, props)
}
