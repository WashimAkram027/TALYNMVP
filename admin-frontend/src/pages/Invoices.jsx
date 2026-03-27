import { useState, useEffect } from 'react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import StatusBadge from '../components/common/StatusBadge'
import invoicesService from '../services/invoicesService'

function formatUsd(cents) {
  if (!cents && cents !== 0) return '$0.00'
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [actionNotes, setActionNotes] = useState('')

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const params = {}
      if (statusFilter) params.status = statusFilter
      const result = await invoicesService.list(params)
      setInvoices(result.data || [])
    } catch (err) {
      console.error('Error fetching invoices:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInvoices() }, [statusFilter])

  const handleViewDetail = async (id) => {
    try {
      setDetailLoading(true)
      const detail = await invoicesService.getDetail(id)
      setSelectedInvoice(detail)
    } catch (err) {
      alert('Failed to load invoice detail')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleAction = async (action) => {
    if (!selectedInvoice) return
    try {
      setActionLoading(true)
      if (action === 'mark-paid') {
        await invoicesService.markAsPaid(selectedInvoice.id, actionNotes)
      } else if (action === 'resolve') {
        await invoicesService.resolve(selectedInvoice.id, actionNotes)
      } else if (action === 'cancel') {
        if (!confirm('Cancel this invoice? This cannot be undone.')) return
        await invoicesService.cancel(selectedInvoice.id, actionNotes)
      }
      setActionNotes('')
      setSelectedInvoice(null)
      fetchInvoices()
    } catch (err) {
      alert(err.response?.data?.error || err.message || `Failed to ${action}`)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Billing Invoices</h1>
        <p className="text-text-secondary text-sm mt-1">Cross-org billing invoice management</p>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-border-main rounded-lg text-sm"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="processing">Processing</option>
          <option value="paid">Paid</option>
          <option value="payment_failed">Failed</option>
          <option value="rejected">Rejected</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Invoice List */}
      {invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-border-main p-12 text-center">
          <span className="material-icons text-[48px] text-text-secondary/40 mb-3 block">receipt_long</span>
          <p className="text-text-secondary">No billing invoices found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border-main overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-border-main">
                <th className="text-left p-4 text-xs font-semibold text-text-secondary uppercase">Organization</th>
                <th className="text-left p-4 text-xs font-semibold text-text-secondary uppercase">Invoice #</th>
                <th className="text-left p-4 text-xs font-semibold text-text-secondary uppercase">Period</th>
                <th className="text-center p-4 text-xs font-semibold text-text-secondary uppercase">Employees</th>
                <th className="text-right p-4 text-xs font-semibold text-text-secondary uppercase">Amount</th>
                <th className="text-center p-4 text-xs font-semibold text-text-secondary uppercase">Payment</th>
                <th className="text-center p-4 text-xs font-semibold text-text-secondary uppercase">Status</th>
                <th className="text-center p-4 text-xs font-semibold text-text-secondary uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-border-main hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-text-primary">{inv.organization?.name || '—'}</td>
                  <td className="p-4 text-sm text-text-secondary">{inv.invoice_number}</td>
                  <td className="p-4 text-sm text-text-secondary">{formatDate(inv.billing_period_start)}</td>
                  <td className="p-4 text-sm text-center">{inv.employee_count || '—'}</td>
                  <td className="p-4 text-sm text-right font-semibold">{formatUsd(inv.total_amount_cents)}</td>
                  <td className="p-4 text-sm text-center">
                    <span className={`text-xs px-2 py-0.5 rounded ${inv.payment_type === 'automatic' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'}`}>
                      {inv.payment_type || '—'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleViewDetail(inv.id)}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4">
            {detailLoading ? (
              <LoadingSpinner />
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Invoice {selectedInvoice.invoice_number}</h2>
                  <button onClick={() => setSelectedInvoice(null)} className="text-gray-400 hover:text-gray-600">
                    <span className="material-icons">close</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div><span className="text-gray-500">Organization:</span> <strong>{selectedInvoice.organization?.name}</strong></div>
                  <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedInvoice.status} /></div>
                  <div><span className="text-gray-500">Period:</span> {formatDate(selectedInvoice.billing_period_start)} — {formatDate(selectedInvoice.billing_period_end)}</div>
                  <div><span className="text-gray-500">Due:</span> {formatDate(selectedInvoice.due_date)}</div>
                  <div><span className="text-gray-500">Payment Type:</span> {selectedInvoice.payment_type}</div>
                  <div><span className="text-gray-500">Employees:</span> {selectedInvoice.employee_count}</div>
                  <div><span className="text-gray-500">Total:</span> <strong className="text-lg">{formatUsd(selectedInvoice.total_amount_cents)}</strong></div>
                  {selectedInvoice.paid_at && <div><span className="text-gray-500">Paid:</span> {formatDate(selectedInvoice.paid_at)}</div>}
                </div>

                {selectedInvoice.rejection_reason && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    <strong>Rejection reason:</strong> {selectedInvoice.rejection_reason}
                  </div>
                )}

                {/* Line Items */}
                {selectedInvoice.line_items?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold mb-2">Line Items</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="p-2 text-left">Employee</th>
                            <th className="p-2 text-right">Cost (USD)</th>
                            <th className="p-2 text-right">Platform Fee</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedInvoice.line_items.map((item, i) => (
                            <tr key={i} className="border-t border-gray-100">
                              <td className="p-2">{item.member_name} — {item.job_title || 'N/A'}</td>
                              <td className="p-2 text-right">{formatUsd(item.cost_usd_cents)}</td>
                              <td className="p-2 text-right">{formatUsd(item.platform_fee_cents)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Admin Actions */}
                {['approved', 'overdue', 'rejected', 'pending'].includes(selectedInvoice.status) && (
                  <div className="border-t pt-4 mt-4">
                    <textarea
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      placeholder="Admin notes (optional)"
                      className="w-full px-3 py-2 border rounded-lg text-sm mb-3"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      {(selectedInvoice.status === 'approved' || selectedInvoice.status === 'overdue') && (
                        <button
                          onClick={() => handleAction('mark-paid')}
                          disabled={actionLoading}
                          className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          Mark as Paid
                        </button>
                      )}
                      {selectedInvoice.status === 'rejected' && (
                        <button
                          onClick={() => handleAction('resolve')}
                          disabled={actionLoading}
                          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          Resolve (Return to Pending)
                        </button>
                      )}
                      {!['paid', 'processing'].includes(selectedInvoice.status) && (
                        <button
                          onClick={() => handleAction('cancel')}
                          disabled={actionLoading}
                          className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          Cancel Invoice
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
