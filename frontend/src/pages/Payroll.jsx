import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { invoicesService } from '../services/invoicesService';
import { payrollService } from '../services/payrollService';

const ReviewRequestModal = ({ isOpen, onClose, employee, period, onSubmit }) => {
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !employee) return null;

  const handleSubmit = async () => {
    if (!issueType) {
      toast.error('Please select an issue type');
      return;
    }
    if (!description.trim()) {
      toast.error('Please describe the issue');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ issueType, description });
      toast.success('Review request submitted');
      setIssueType('');
      setDescription('');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to submit review request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md shadow-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-medium text-gray-900">Request payroll review</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400">
            <span className="material-icons-outlined text-lg">close</span>
          </button>
        </div>
        <div className="px-5 py-4">
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">Employee</span>
              <span className="font-medium">{employee.name}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">Period</span>
              <span className="font-medium">{period}</span>
            </div>
            <div className="border-t border-gray-200 mt-2 pt-2">
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-500">Gross salary</span>
                <span className="font-medium">{formatUsd(employee.grossUsd)}</span>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-500">SSF deduction (11%)</span>
                <span className="font-medium">{formatUsd(employee.deductionsUsd)}</span>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-500">Net pay</span>
                <span className="font-medium text-blue-600">{formatUsd(employee.netPayUsd)}</span>
              </div>
            </div>
          </div>
          <label className="block text-sm text-gray-500 mb-1.5">Issue type</label>
          <select
            value={issueType}
            onChange={e => setIssueType(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select issue type...</option>
            <option value="incorrect_salary">Incorrect salary amount</option>
            <option value="wrong_leave">Wrong leave deduction</option>
            <option value="missing_allowance">Missing allowance</option>
            <option value="ssf_error">SSF calculation error</option>
            <option value="other">Other</option>
          </select>
          <label className="block text-sm text-gray-500 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe the issue with this employee's calculated pay..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit review request'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Utility Functions ---

function formatUsd(cents) {
  if (cents == null) return '-';
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNpr(paisa) {
  if (paisa == null) return '';
  const npr = paisa / 100;
  return `NPR ${npr.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatUsdFromNpr(nprMajor, exchangeRate) {
  if (nprMajor == null || exchangeRate == null) return '-';
  const usd = nprMajor * exchangeRate;
  return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNprMajor(nprMajor) {
  if (nprMajor == null) return '';
  return `NPR ${Number(nprMajor).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatPeriod(start, end) {
  if (!start || !end) return '';
  const s = new Date(start);
  const e = new Date(end);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[s.getUTCMonth()]} ${s.getUTCDate()} - ${months[e.getUTCMonth()]} ${e.getUTCDate()}, ${e.getUTCFullYear()}`;
}

// --- Main Component ---

export default function Payroll() {
  const navigate = useNavigate();
  const { organization } = useAuthStore();
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [expandedRun, setExpandedRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState({ open: false, employee: null, runId: null });

  useEffect(() => {
    fetchPayrollRuns();
  }, []);

  const fetchPayrollRuns = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payroll/runs');
      setPayrollRuns(res.data || []);
    } catch (err) {
      toast.error('Failed to load payroll runs');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewRequest = async ({ issueType, description }) => {
    const { runId, employee } = reviewModal;
    await api.post(`/payroll/runs/${runId}/items/${employee.memberId}/review-request`, {
      issueType, description
    });
  };

  const handleDownloadSummary = async (invoiceId) => {
    try {
      const blob = await invoicesService.downloadInvoicePdf(invoiceId, 'summary');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'payroll-summary.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download summary');
    }
  };

  const handleDownloadBreakdown = async (runId, memberId, memberName) => {
    try {
      const blob = await payrollService.downloadPayslipPdf(runId, memberId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `breakdown-${memberName || 'employee'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download breakdown');
    }
  };

  // Stats
  const totalEmployees = payrollRuns.reduce((sum, r) => sum + (r.items?.length || 0), 0);
  const totalCostUsd = payrollRuns.reduce((sum, r) => {
    if (r.invoice?.total_amount_cents) return sum + r.invoice.total_amount_cents;
    return sum;
  }, 0);

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-amber-50 text-amber-700',
      processing: 'bg-blue-50 text-blue-700',
      completed: 'bg-green-50 text-green-700',
      cancelled: 'bg-gray-100 text-gray-500',
    };
    return (
      <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-medium ${styles[status] || styles.draft}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  const getPaymentBadge = (status) => {
    const styles = {
      none: 'bg-gray-100 text-gray-500',
      pending: 'bg-amber-50 text-amber-700',
      ach_processing: 'bg-blue-50 text-blue-700',
      succeeded: 'bg-green-50 text-green-700',
      failed: 'bg-red-50 text-red-700',
    };
    return (
      <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-medium ${styles[status] || styles.none}`}>
        {status || 'none'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-6">Payroll runs</h1>
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl">
      <h1 className="text-xl font-semibold mb-6">Payroll runs</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Payroll periods</div>
          <div className="text-2xl font-medium">{payrollRuns.length}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total employer cost</div>
          <div className="text-2xl font-medium">{formatUsd(totalCostUsd)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Employees</div>
          <div className="text-2xl font-medium">{totalEmployees}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Status</div>
          <div className="mt-1">{payrollRuns.length > 0 && getStatusBadge(payrollRuns[0].status)}</div>
        </div>
      </div>

      {/* Payroll runs table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wide font-normal">Period</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wide font-normal">Pay date</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wide font-normal">Status</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wide font-normal">Payment</th>
              <th className="text-right px-4 py-3 text-xs text-gray-400 uppercase tracking-wide font-normal">Total (USD)</th>
              <th className="text-right px-4 py-3 text-xs text-gray-400 uppercase tracking-wide font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payrollRuns.map(run => (
              <tr key={run.id} className="border-b border-gray-50">
                <td className="px-4 py-3 text-sm">
                  {formatPeriod(run.pay_period_start, run.pay_period_end)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">
                  {run.pay_date ? new Date(run.pay_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending'}
                </td>
                <td className="px-4 py-3">{getStatusBadge(run.status)}</td>
                <td className="px-4 py-3">{getPaymentBadge(run.payment_status)}</td>
                <td className="px-4 py-3 text-sm text-right font-medium">
                  {run.invoice?.total_amount_cents ? formatUsd(run.invoice.total_amount_cents) : formatNprMajor(run.total_amount)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-1.5 justify-end">
                    {run.invoice_id && (
                      <button
                        onClick={() => navigate('/billing')}
                        className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        View invoice
                      </button>
                    )}
                    {run.invoice_id && (
                      <button
                        onClick={() => handleDownloadSummary(run.invoice_id)}
                        className="px-3 py-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-50"
                      >
                        Download summary
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                      className="px-3 py-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-50"
                    >
                      {expandedRun === run.id ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Expanded employee rows */}
        {payrollRuns.map(run => expandedRun === run.id && (
          <div key={`expand-${run.id}`} className="bg-gray-50 border-t border-gray-100">
            <div className="grid grid-cols-[2fr_1.2fr_0.8fr_1.5fr_1fr_1.2fr_1.5fr] px-4 py-2 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-200">
              <div>Employee</div>
              <div>Gross (USD)</div>
              <div>Days</div>
              <div>Leave</div>
              <div>Deductions</div>
              <div>Net pay</div>
              <div className="text-right">Actions</div>
            </div>

            {(run.items || []).map(item => {
              const memberName = item.member
                ? `${item.member.first_name || ''} ${item.member.last_name || ''}`.trim()
                : 'Unknown';
              const jobTitle = item.member?.job_title || '';

              return (
                <div
                  key={item.id || item.member_id}
                  className="grid grid-cols-[2fr_1.2fr_0.8fr_1.5fr_1fr_1.2fr_1.5fr] items-center px-4 py-2.5 text-sm border-b border-gray-100 last:border-b-0"
                >
                  <div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      {memberName}
                      {item.review_status === 'pending' && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Under Review
                        </span>
                      )}
                    </div>
                    {jobTitle && <div className="text-xs text-gray-400">{jobTitle}</div>}
                  </div>
                  <div>
                    <div>{formatUsdFromNpr(item.base_salary, run.invoice?.exchange_rate || 0.0075)}</div>
                    <div className="text-xs text-gray-400">{formatNprMajor(item.base_salary)}</div>
                  </div>
                  <div className="text-gray-600">
                    {item.payable_days}/{item.calendar_days}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(!item.paid_leave_days && !item.unpaid_leave_days) && (
                      <span className="text-gray-300">--</span>
                    )}
                    {item.paid_leave_days > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700">
                        {item.paid_leave_days}d paid
                      </span>
                    )}
                    {item.unpaid_leave_days > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-700">
                        {item.unpaid_leave_days}d unpaid
                      </span>
                    )}
                  </div>
                  <div>{formatUsdFromNpr(item.deductions, run.invoice?.exchange_rate || 0.0075)}</div>
                  <div className="font-medium">
                    {formatUsdFromNpr(item.net_amount, run.invoice?.exchange_rate || 0.0075)}
                  </div>
                  <div className="flex gap-1.5 justify-end">
                    <button
                      title="Download breakdown"
                      className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      onClick={() => handleDownloadBreakdown(run.id, item.member_id, memberName)}
                    >
                      <span className="material-icons-outlined text-base">download</span>
                    </button>
                    <button
                      title={item.review_status ? 'Review ' + item.review_status : 'Request review'}
                      disabled={!!item.review_status}
                      className={`w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 bg-white ${item.review_status ? 'text-amber-400 cursor-not-allowed' : 'hover:bg-amber-50 text-gray-400 hover:text-amber-600'}`}
                      onClick={() => !item.review_status && setReviewModal({
                        open: true,
                        runId: run.id,
                        employee: {
                          memberId: item.member_id,
                          name: memberName,
                          grossUsd: Math.round(item.base_salary * (run.invoice?.exchange_rate || 0.0075) * 100),
                          deductionsUsd: Math.round(item.deductions * (run.invoice?.exchange_rate || 0.0075) * 100),
                          netPayUsd: Math.round(item.net_amount * (run.invoice?.exchange_rate || 0.0075) * 100),
                        }
                      })}
                    >
                      <span className="material-icons-outlined text-base">error_outline</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {payrollRuns.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            No payroll runs yet. Runs are created automatically when invoices are generated.
          </div>
        )}
      </div>

      <ReviewRequestModal
        isOpen={reviewModal.open}
        onClose={() => setReviewModal({ open: false, employee: null, runId: null })}
        employee={reviewModal.employee}
        period={payrollRuns.find(r => r.id === reviewModal.runId)
          ? formatPeriod(
              payrollRuns.find(r => r.id === reviewModal.runId).pay_period_start,
              payrollRuns.find(r => r.id === reviewModal.runId).pay_period_end
            )
          : ''}
        onSubmit={handleReviewRequest}
      />
    </div>
  );
}
