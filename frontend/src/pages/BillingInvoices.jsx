import { useState, useEffect } from 'react'
import { invoicesService } from '../services/invoicesService'
import { useAuthStore } from '../store/authStore'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'processing', label: 'Processing' },
  { value: 'paid', label: 'Paid' },
  { value: 'payment_failed', label: 'Payment Failed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'overdue', label: 'Overdue' }
]

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  processing: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  payment_failed: 'bg-red-100 text-red-800',
  rejected: 'bg-red-100 text-red-800',
  overdue: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-gray-100 text-gray-800'
}

function formatUsd(cents) {
  if (!cents && cents !== 0) return '$0.00'
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatNpr(paisa) {
  if (!paisa && paisa !== 0) return 'NPR 0'
  return `NPR ${(paisa / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatPeriod(start, end) {
  if (!start) return '—'
  const s = new Date(start)
  return s.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

export default function BillingInvoices() {
  const { organization } = useAuthStore()

  const [invoices, setInvoices] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      setError(null)
      const filters = {}
      if (statusFilter) filters.status = statusFilter
      const res = await invoicesService.getBillingInvoices(filters)
      setInvoices(res.data || [])
    } catch (err) {
      setError(err.message || 'Failed to load billing invoices')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await invoicesService.getBillingStats()
      setStats(res.data)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  useEffect(() => { fetchInvoices() }, [statusFilter])
  useEffect(() => { fetchStats() }, [])

  const handleApprove = async (invoiceId) => {
    if (!confirm('Approve this invoice? For automatic payment accounts, payment will be initiated immediately.')) return
    try {
      setActionLoading(true)
      await invoicesService.approveBillingInvoice(invoiceId)
      fetchInvoices()
      fetchStats()
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to approve')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) return
    try {
      setActionLoading(true)
      await invoicesService.rejectBillingInvoice(showRejectModal, rejectReason)
      setShowRejectModal(null)
      setRejectReason('')
      fetchInvoices()
      fetchStats()
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to reject')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownloadPdf = async (invoiceId, invoiceNumber) => {
    try {
      const blob = await invoicesService.downloadInvoicePdf(invoiceId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoiceNumber}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to download PDF: ' + (err.message || 'Unknown error'))
    }
  }

  const handleDownloadReceipt = async (invoiceId, invoiceNumber) => {
    try {
      const blob = await invoicesService.downloadReceiptPdf(invoiceId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoiceNumber}-receipt.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to download receipt: ' + (err.message || 'Unknown error'))
    }
  }

  const handleRetry = async (invoiceId) => {
    if (!confirm('Retry payment for this invoice?')) return
    try {
      setActionLoading(true)
      await invoicesService.retryBillingPayment(invoiceId)
      fetchInvoices()
      fetchStats()
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Retry failed')
    } finally {
      setActionLoading(false)
    }
  }

  const pendingCount = stats?.byStatus?.pending?.count || 0
  const paidCount = stats?.byStatus?.paid?.count || 0
  const totalDueCents = (stats?.byStatus?.pending?.amountCents || 0) + (stats?.byStatus?.approved?.amountCents || 0) + (stats?.byStatus?.overdue?.amountCents || 0)
  const paidThisYearCents = stats?.byStatus?.paid?.amountCents || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-500 mt-1">Monthly EOR invoices from Talyn</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Due</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{formatUsd(totalDueCents)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Pending Review</div>
          <div className="text-2xl font-bold text-yellow-600 mt-1">{pendingCount}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Paid This Year</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{formatUsd(paidThisYearCents)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Invoices</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats?.total || 0}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Invoice Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No billing invoices found</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billing Period</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Employees</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount (USD)</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map(inv => (
                <InvoiceRow
                  key={inv.id}
                  invoice={inv}
                  expanded={expandedId === inv.id}
                  onToggle={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                  onApprove={() => handleApprove(inv.id)}
                  onReject={() => { setShowRejectModal(inv.id); setRejectReason('') }}
                  onDownloadPdf={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                  onDownloadReceipt={() => handleDownloadReceipt(inv.id, inv.invoice_number)}
                  onRetry={() => handleRetry(inv.id)}
                  actionLoading={actionLoading}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Reject Invoice</h3>
            <p className="text-sm text-gray-600 mb-3">
              Please provide a reason. This will be escalated to Talyn support for resolution.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              rows={4}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InvoiceRow({ invoice, expanded, onToggle, onApprove, onReject, onDownloadPdf, onDownloadReceipt, onRetry, actionLoading }) {
  const inv = invoice
  const lineItems = inv.line_items || []

  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.invoice_number}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{formatPeriod(inv.billing_period_start)}</td>
        <td className="px-4 py-3 text-sm text-center text-gray-600">{inv.employee_count || lineItems.length}</td>
        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">{formatUsd(inv.total_amount_cents)}</td>
        <td className="px-4 py-3 text-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status] || 'bg-gray-100 text-gray-800'}`}>
            {inv.status === 'payment_failed' ? 'Failed' : inv.status?.charAt(0).toUpperCase() + inv.status?.slice(1)}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(inv.due_date)}</td>
        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-2">
            <button onClick={onDownloadPdf} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium" title="Download PDF">
              <span className="material-icons text-base">download</span>
            </button>
            {inv.status === 'paid' && (
              <button onClick={onDownloadReceipt} className="text-green-600 hover:text-green-800 text-xs font-medium" title="Download Receipt">
                <span className="material-icons text-base">receipt</span>
              </button>
            )}
            {inv.status === 'pending' && (
              <>
                <button onClick={onApprove} disabled={actionLoading} className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50">
                  Approve
                </button>
                <button onClick={onReject} disabled={actionLoading} className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50">
                  Reject
                </button>
              </>
            )}
            {inv.status === 'payment_failed' && (
              <button onClick={onRetry} disabled={actionLoading} className="px-3 py-1 text-xs font-medium text-white bg-orange-600 rounded hover:bg-orange-700 disabled:opacity-50">
                Retry
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded Line Items */}
      {expanded && lineItems.length > 0 && (
        <tr>
          <td colSpan={7} className="px-4 py-4 bg-gray-50">
            <div className="text-xs font-medium text-gray-500 uppercase mb-2">Employee Cost Breakdown</div>
            {inv.exchange_rate && (
              <div className="text-xs text-gray-400 mb-2">Exchange Rate: 1 NPR = ${parseFloat(inv.exchange_rate).toFixed(4)} USD</div>
            )}
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left text-gray-500">Employee</th>
                  <th className="px-3 py-2 text-left text-gray-500">Role</th>
                  <th className="px-3 py-2 text-right text-gray-500">Gross (NPR)</th>
                  <th className="px-3 py-2 text-right text-gray-500">Employer SSF</th>
                  <th className="px-3 py-2 text-right text-gray-500">Cost (NPR)</th>
                  <th className="px-3 py-2 text-right text-gray-500">Cost (USD)</th>
                  <th className="px-3 py-2 text-right text-gray-500">Platform Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lineItems.map((item, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-gray-900">{item.member_name}</td>
                    <td className="px-3 py-2 text-gray-600">{item.job_title || '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-900">{formatNpr(item.monthly_gross_local)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{formatNpr(item.employer_ssf_local)}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">{formatNpr(item.total_cost_local)}</td>
                    <td className="px-3 py-2 text-right text-gray-900">{formatUsd(item.cost_usd_cents)}</td>
                    <td className="px-3 py-2 text-right text-gray-900">{formatUsd(item.platform_fee_cents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-indigo-50">
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right font-semibold text-gray-700">Totals:</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatNpr(inv.subtotal_local_cents)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatUsd(lineItems.reduce((s, i) => s + (i.cost_usd_cents || 0), 0))}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatUsd(inv.platform_fee_cents)}</td>
                </tr>
                <tr className="bg-indigo-100">
                  <td colSpan={6} className="px-3 py-2 text-right font-bold text-indigo-900">TOTAL DUE (USD):</td>
                  <td className="px-3 py-2 text-right font-bold text-indigo-900 text-sm">{formatUsd(inv.total_amount_cents)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Status-specific messages */}
            {inv.status === 'approved' && inv.payment_type === 'manual' && (
              <div className="mt-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                Awaiting wire transfer. Please remit payment to Talyn's bank account.
              </div>
            )}
            {inv.status === 'rejected' && (
              <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                Under review by Talyn support. Reason: {inv.rejection_reason || 'No reason provided'}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
