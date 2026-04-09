/**
 * InvoiceCostBreakdown.jsx
 * 
 * Expandable section showing per-employee cost breakdown for a billing invoice.
 * Shows employer-facing costs: gross salary, employer SSF, total cost, platform fee — all in USD.
 * NPR shown as secondary.
 * 
 * Usage in BillingInvoices.jsx:
 *   <InvoiceCostBreakdown invoice={invoice} isExpanded={expanded} />
 */

function formatUsd(cents) {
  if (cents == null) return '-';
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNprFromPaisa(paisa) {
  if (paisa == null) return '';
  const npr = paisa / 100;
  return `NPR ${npr.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function InvoiceCostBreakdown({ invoice, isExpanded }) {
  if (!isExpanded || !invoice?.line_items) return null;

  const lineItems = invoice.line_items;
  const exchangeRate = invoice.exchange_rate || 0.0075;

  // Totals
  const totalCostCents = lineItems.reduce((sum, li) => sum + (li.cost_usd_cents || 0), 0);
  const totalPlatformCents = lineItems.reduce((sum, li) => sum + (li.platform_fee_cents || 0), 0);

  return (
    <div className="bg-gray-50 border-t border-gray-100">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-200">
        <span>Employee cost breakdown for {invoice.invoice_number}</span>
        <span className="normal-case text-gray-500">
          Exchange rate: 1 NPR = ${exchangeRate} USD
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[2fr_1fr_1fr_0.8fr_0.8fr_1fr_1fr] px-4 py-2 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-200">
        <div>Employee</div>
        <div>Gross salary</div>
        <div>Employer SSF</div>
        <div>Severance</div>
        <div>Days</div>
        <div>Total cost</div>
        <div className="text-right">Platform fee</div>
      </div>

      {/* Employee rows */}
      {lineItems.map((li, idx) => (
        <div
          key={li.member_id || idx}
          className="grid grid-cols-[2fr_1fr_1fr_0.8fr_0.8fr_1fr_1fr] items-center px-4 py-2.5 text-sm border-b border-gray-100 last:border-b-0"
        >
          {/* Name + role */}
          <div>
            <div className="font-medium text-gray-900">{li.member_name || 'Unknown'}</div>
            {li.job_title && <div className="text-xs text-gray-400">{li.job_title}</div>}
          </div>

          {/* Gross salary USD + NPR */}
          <div>
            <div>{formatUsd(Math.round((li.monthly_gross_local / 100) * exchangeRate * 100))}</div>
            <div className="text-xs text-gray-400">{formatNprFromPaisa(li.monthly_gross_local)}</div>
          </div>

          {/* Employer SSF USD + NPR */}
          <div>
            <div>{formatUsd(Math.round((li.employer_ssf_local / 100) * exchangeRate * 100))}</div>
            <div className="text-xs text-gray-400">{formatNprFromPaisa(li.employer_ssf_local)}</div>
          </div>

          {/* Severance USD + NPR */}
          <div>
            {li.severance_local > 0 ? (
              <>
                <div>{formatUsd(Math.round((li.severance_local / 100) * exchangeRate * 100))}</div>
                <div className="text-xs text-gray-400">{formatNprFromPaisa(li.severance_local)}</div>
              </>
            ) : (
              <div className="text-gray-400">-</div>
            )}
          </div>

          {/* Days */}
          <div className="text-gray-600">{li.payable_days}/{li.calendar_days}</div>

          {/* Total cost USD */}
          <div className="font-medium">{formatUsd(li.cost_usd_cents)}</div>

          {/* Platform fee */}
          <div className="text-right">{formatUsd(li.platform_fee_cents)}</div>
        </div>
      ))}

      {/* Totals row */}
      <div className="grid grid-cols-[2fr_1fr_1fr_0.8fr_0.8fr_1fr_1fr] items-center px-4 py-3 text-sm bg-white border-t border-gray-200">
        <div className="font-medium">Total ({lineItems.length} employees)</div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div className="font-medium text-base">{formatUsd(totalCostCents)}</div>
        <div className="text-right font-medium">{formatUsd(totalPlatformCents)}</div>
      </div>
    </div>
  );
}
