/**
 * BillingPage — Complete billing/invoices page for employers.
 * Shows: stats, invoices table with approve/reject/PDF, expandable cost breakdown,
 * and payroll details section at the bottom.
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '../services/api';
import { invoicesService } from '../services/invoicesService';
import InvoiceCostBreakdown from '../components/features/InvoiceCostBreakdown';
import PayrollDetailsSection from '../components/features/PayrollDetailsSection';

// --- Utility Functions ---

function formatUsd(cents) {
  if (cents == null) return '$0.00';
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPeriod(start, end) {
  if (!start || !end) return '';
  const s = new Date(start);
  const e = new Date(end);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if (s.getUTCMonth() === e.getUTCMonth()) {
    return `${months[s.getUTCMonth()]} ${s.getUTCDate()} - ${e.getUTCDate()}, ${e.getUTCFullYear()}`;
  }
  return `${months[s.getUTCMonth()]} ${s.getUTCDate()} - ${months[e.getUTCMonth()]} ${e.getUTCDate()}, ${e.getUTCFullYear()}`;
}

// --- Main Component ---

export default function BillingInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [approving, setApproving] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const invoiceData = await invoicesService.getBillingInvoices({});
      setInvoices(invoiceData || []);
    } catch (err) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (invoiceId) => {
    setApproving(invoiceId);
    try {
      const result = await invoicesService.approveBillingInvoice(invoiceId);
      if (result?.paymentError) {
        toast.error(`Approved but payment failed: ${result.paymentError}`);
      } else if (result?.payment) {
        toast.success('Invoice approved — payment initiated');
      } else {
        toast.success('Invoice approved');
      }
      fetchInvoices();
    } catch (err) {
      toast.error(err.message || 'Failed to approve invoice');
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (invoiceId) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await invoicesService.rejectBillingInvoice(invoiceId, reason);
      toast.success('Invoice rejected');
      fetchInvoices();
    } catch (err) {
      toast.error(err.message || 'Failed to reject invoice');
    }
  };

  const handleDownloadPdf = async (invoiceId) => {
    try {
      const blob = await invoicesService.downloadInvoicePdf(invoiceId, 'detail');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'invoice.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download PDF');
    }
  };

  const handleDownloadReceipt = async (invoiceId) => {
    try {
      const blob = await invoicesService.downloadReceiptPdf(invoiceId, 'detail');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'receipt.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download receipt');
    }
  };

  const handleRetry = async (invoiceId) => {
    try {
      await invoicesService.retryBillingPayment(invoiceId);
      toast.success('Payment retry initiated');
      fetchInvoices();
    } catch (err) {
      toast.error(err.message || 'Retry failed');
    }
  };

  // --- Stats ---
  const totalBilled = invoices.reduce((sum, inv) => sum + (inv.total_amount_cents || 0), 0);
  const totalPaid = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.total_amount_cents || 0), 0);
  const outstanding = invoices
    .filter(inv => ['pending', 'approved', 'processing'].includes(inv.status))
    .reduce((sum, inv) => sum + (inv.total_amount_cents || 0), 0);

  const getStatusBadge = (status) => {
    const config = {
      pending:        { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'Pending' },
      approved:       { bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Approved' },
      processing:     { bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Processing' },
      paid:           { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Paid' },
      payment_failed: { bg: 'bg-red-50',    text: 'text-red-700',    label: 'Failed' },
      overdue:        { bg: 'bg-red-50',    text: 'text-red-700',    label: 'Overdue' },
      rejected:       { bg: 'bg-gray-100',  text: 'text-gray-500',   label: 'Rejected' },
    };
    const c = config[status] || config.pending;
    return (
      <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-medium ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-6">Billing</h1>
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl">
      <h1 className="text-xl font-semibold mb-6">Billing</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total billed</div>
          <div className="text-2xl font-medium">{formatUsd(totalBilled)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total paid</div>
          <div className="text-2xl font-medium text-green-600">{formatUsd(totalPaid)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Outstanding</div>
          <div className="text-2xl font-medium text-amber-600">{formatUsd(outstanding)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Invoices</div>
          <div className="text-2xl font-medium">{invoices.length}</div>
        </div>
      </div>

      {/* Invoices section */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-medium text-gray-900">Invoices</h2>
        <span className="text-sm text-gray-400">Your monthly EOR billing</span>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wide font-normal">Invoice #</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wide font-normal">Period</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wide font-normal">Due date</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wide font-normal">Employees</th>
              <th className="text-right px-4 py-3 text-xs text-gray-400 uppercase tracking-wide font-normal">Amount</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wide font-normal">Status</th>
              <th className="text-right px-4 py-3 text-xs text-gray-400 uppercase tracking-wide font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(invoice => (
              <tr key={invoice.id} className="border-b border-gray-50">
                <td className="px-4 py-3 text-sm">
                  <span
                    className="text-blue-600 font-medium cursor-pointer hover:underline"
                    onClick={() => setExpandedInvoice(expandedInvoice === invoice.id ? null : invoice.id)}
                  >
                    {invoice.invoice_number}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {formatPeriod(invoice.billing_period_start, invoice.billing_period_end)}
                </td>
                <td className="px-4 py-3 text-sm">{formatDate(invoice.due_date)}</td>
                <td className="px-4 py-3 text-sm">{invoice.employee_count || '-'}</td>
                <td className="px-4 py-3 text-sm text-right font-medium">
                  {formatUsd(invoice.total_amount_cents)}
                </td>
                <td className="px-4 py-3">{getStatusBadge(invoice.status)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-1.5 justify-end">
                    {invoice.status === 'pending' && (
                      <button
                        onClick={() => handleApprove(invoice.id)}
                        disabled={approving === invoice.id}
                        className="px-3 py-1.5 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {approving === invoice.id ? 'Approving...' : 'Approve'}
                      </button>
                    )}
                    {invoice.status === 'pending' && (
                      <button
                        onClick={() => handleReject(invoice.id)}
                        className="px-3 py-1.5 text-xs rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        Reject
                      </button>
                    )}
                    {invoice.status === 'payment_failed' && (
                      <button
                        onClick={() => handleRetry(invoice.id)}
                        className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedInvoice(expandedInvoice === invoice.id ? null : invoice.id)}
                      className="px-3 py-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-50"
                    >
                      {expandedInvoice === invoice.id ? 'Collapse' : 'Preview'}
                    </button>
                    <button
                      onClick={() => handleDownloadPdf(invoice.id)}
                      className="px-3 py-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-50"
                    >
                      PDF
                    </button>
                    {invoice.status === 'paid' && (
                      <button
                        onClick={() => handleDownloadReceipt(invoice.id)}
                        className="px-3 py-1.5 text-xs rounded-md border border-green-200 text-green-600 hover:bg-green-50"
                      >
                        Receipt
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                  No invoices yet. Invoices are generated automatically on the 26th of each month.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Expandable cost breakdown per invoice */}
        {invoices.map(invoice => (
          <InvoiceCostBreakdown
            key={`breakdown-${invoice.id}`}
            invoice={invoice}
            isExpanded={expandedInvoice === invoice.id}
          />
        ))}
      </div>

      {/* Payroll details — self-contained, fetches its own data */}
      <PayrollDetailsSection />
    </div>
  );
}
