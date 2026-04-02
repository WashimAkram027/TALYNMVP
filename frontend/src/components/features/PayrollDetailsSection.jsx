/**
 * PayrollDetailsSection.jsx
 * 
 * This component renders below the existing invoices table on the BillingInvoices page.
 * It shows linked payroll runs with expandable employee pay breakdowns.
 * 
 * Usage in BillingInvoices.jsx:
 *   import PayrollDetailsSection from './PayrollDetailsSection';
 *   // After the invoices table card:
 *   <PayrollDetailsSection />
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '../../services/api';
import { payrollService } from '../../services/payrollService';

function formatUsd(cents) {
  if (cents == null) return '-';
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export default function PayrollDetailsSection() {
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [expandedRun, setExpandedRun] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayrollRuns();
  }, []);

  const fetchPayrollRuns = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payroll/runs');
      setPayrollRuns(res.data || []);
    } catch {
      // Silently fail — this section is supplementary
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-500',
      processing: 'bg-blue-50 text-blue-700',
      completed: 'bg-green-50 text-green-700',
    };
    return (
      <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-medium ${styles[status] || styles.draft}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  if (loading) return null;
  if (payrollRuns.length === 0) return null;

  return (
    <div className="mt-8">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-medium text-gray-900">Payroll details</h2>
        <span className="text-sm text-gray-400">Employee pay breakdown by period</span>
      </div>

      {/* Payroll runs table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wide font-normal">Pay period</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wide font-normal">Pay date</th>
              <th className="text-right px-4 py-3 text-xs text-gray-400 uppercase tracking-wide font-normal">Total (USD)</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wide font-normal">Invoice</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wide font-normal">Status</th>
              <th className="text-right px-4 py-3 text-xs text-gray-400 uppercase tracking-wide font-normal">Details</th>
            </tr>
          </thead>
          <tbody>
            {payrollRuns.map(run => (
              <tr key={run.id} className="border-b border-gray-50">
                <td className="px-4 py-3 text-sm">
                  {formatPeriod(run.pay_period_start, run.pay_period_end)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">
                  {run.pay_date
                    ? new Date(run.pay_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Pending'}
                </td>
                <td className="px-4 py-3 text-sm text-right font-medium">
                  {run.invoice?.total_amount_cents
                    ? formatUsd(run.invoice.total_amount_cents)
                    : formatNprMajor(run.total_amount)}
                </td>
                <td className="px-4 py-3 text-sm">
                  {run.invoice?.invoice_number && (
                    <span className="text-blue-600 font-medium cursor-pointer hover:underline">
                      {run.invoice.invoice_number}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{getStatusBadge(run.status)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {expandedRun === run.id ? 'Hide' : 'Show employees'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Expanded employee details */}
        {payrollRuns.map(run => expandedRun === run.id && (
          <div key={`expand-${run.id}`} className="bg-gray-50 border-t border-gray-100">
            {/* Section label */}
            <div className="flex justify-between items-center px-4 py-2 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-200">
              <span>Employee pay for {formatPeriod(run.pay_period_start, run.pay_period_end)}</span>
              <button onClick={() => setExpandedRun(null)} className="text-blue-600 normal-case hover:underline">
                Hide
              </button>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[2fr_1.2fr_0.8fr_1.5fr_1fr_1.2fr_1fr] px-4 py-2 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-200">
              <div>Employee</div>
              <div>Gross (USD)</div>
              <div>Days</div>
              <div>Leave</div>
              <div>Deductions</div>
              <div>Net pay</div>
              <div className="text-right">Actions</div>
            </div>

            {/* Employee rows */}
            {(run.items || []).map(item => {
              const rate = run.invoice?.exchange_rate || 0.0075;
              const memberName = item.member
                ? `${item.member.first_name || ''} ${item.member.last_name || ''}`.trim()
                : 'Unknown';
              const jobTitle = item.member?.job_title || '';

              return (
                <div
                  key={item.id || item.member_id}
                  className="grid grid-cols-[2fr_1.2fr_0.8fr_1.5fr_1fr_1.2fr_1fr] items-center px-4 py-2.5 text-sm border-b border-gray-100 last:border-b-0"
                >
                  {/* Name + role */}
                  <div>
                    <div className="font-medium text-gray-900">{memberName}</div>
                    {jobTitle && <div className="text-xs text-gray-400">{jobTitle}</div>}
                  </div>

                  {/* Gross USD + NPR */}
                  <div>
                    <div>{formatUsdFromNpr(item.base_salary, rate)}</div>
                    <div className="text-xs text-gray-400">{formatNprMajor(item.base_salary)}</div>
                  </div>

                  {/* Days */}
                  <div className="text-gray-600">{item.payable_days}/{item.calendar_days}</div>

                  {/* Leave tags */}
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

                  {/* Deductions */}
                  <div>{formatUsdFromNpr(item.deductions, rate)}</div>

                  {/* Net pay */}
                  <div className="font-medium">{formatUsdFromNpr(item.net_amount, rate)}</div>

                  {/* Actions: view + download */}
                  <div className="flex gap-1.5 justify-end">
                    <button
                      title="Download breakdown"
                      className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      onClick={async () => {
                        try {
                          const blob = await payrollService.downloadPayslipPdf(run.id, item.member_id);
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `breakdown-${memberName}.pdf`;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch { toast.error('Failed to download'); }
                      }}
                    >
                      <span className="material-icons-outlined text-base">download</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
