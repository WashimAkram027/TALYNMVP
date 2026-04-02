import { useState } from "react";

/*
 * Talyn Financial Document Components
 * ────────────────────────────────────
 * Seven document types:
 *   1. InvoiceDocument           — Monthly bill sent to employer (summary + detail)
 *   2. ReceiptDocument            — Payment confirmation after ACH clears (summary + detail)
 *   3. PayslipDocument            — Employee-facing salary breakdown
 *   4. PlatformFeeInvoice         — Per-employee EOR platform fee invoice
 *   5. PlatformFeeReceipt         — Per-employee EOR platform fee receipt
 *   6. PerEmployeeInvoice         — Per-employee salary/costs invoice
 *   7. PerEmployeeReceipt         — Per-employee salary/costs receipt
 *
 * Props are typed via JSDoc below each component.
 * Replace sample data with real props from your API.
 */

const BRAND = "#1a73e8";
const BRAND_DARK = "#0f4f9e";
const GREEN = "#059669";
const RED = "#dc2626";
const DARK = "#111827";
const GRAY = "#6b7280";
const LIGHT_GRAY = "#f9fafb";
const BORDER = "#e5e7eb";
const BRAND_BG = "#eff6ff";

const baseFont = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  color: DARK,
  fontSize: 13,
  lineHeight: 1.5,
};

/* ═══════════════════════════════════════════════
 * SHARED SUB-COMPONENTS
 * ═══════════════════════════════════════════════ */

const CYAN = "#00e5ff";

function TalynLogo({ logoSrc, size = 32 }) {
  const height = size;
  if (logoSrc) {
    return (
      <img
        src={logoSrc}
        alt="Talyn"
        style={{ height, width: "auto", display: "block" }}
      />
    );
  }

  // Fallback: CSS recreation of the logo mark + text
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: height, height }}>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: height * 0.6,
            height: height * 0.6,
            background: CYAN,
            borderRadius: 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: height * 0.7,
            height: height * 0.7,
            background: BRAND,
            borderRadius: 2,
          }}
        />
      </div>
      <div>
        <div
          style={{
            fontSize: height * 0.65,
            fontWeight: 400,
            color: DARK,
            letterSpacing: -0.5,
            lineHeight: 1,
            fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
          }}
        >
          Talyn
        </div>
        <div
          style={{
            fontSize: height * 0.2,
            fontWeight: 400,
            color: GRAY,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginTop: 1,
          }}
        >
          Global Talent Solutions
        </div>
      </div>
    </div>
  );
}

function DocHeader({ logoSrc, docType, docNumber, issueDate, dueDate, paidDate }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
      <tbody>
        <tr>
          <td style={{ verticalAlign: "top" }}>
            <TalynLogo logoSrc={logoSrc} size={44} />
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 2,
                fontWeight: 700,
                color: BRAND,
              }}
            >
              {docType}
            </div>
          </td>
          <td style={{ textAlign: "right", fontSize: 12, color: GRAY, verticalAlign: "top" }}>
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: "#9ca3af" }}>Document # </span>
              <span style={{ color: DARK, fontWeight: 600 }}>{docNumber}</span>
            </div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: "#9ca3af" }}>Issue date </span>
              <span style={{ color: DARK }}>{issueDate}</span>
            </div>
            {dueDate && (
              <div style={{ marginBottom: 4 }}>
                <span style={{ color: "#9ca3af" }}>Due date </span>
                <span style={{ color: DARK }}>{dueDate}</span>
              </div>
            )}
            {paidDate && (
              <div>
                <span style={{ color: "#9ca3af" }}>Paid date </span>
                <span style={{ color: DARK }}>{paidDate}</span>
              </div>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function BillParties({ billFrom, billTo }) {
  const partyStyle = {
    padding: "16px 20px",
    background: LIGHT_GRAY,
    borderRadius: 8,
    fontSize: 12,
    width: "50%",
    verticalAlign: "top",
  };
  const labelStyle = {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#9ca3af",
    fontWeight: 600,
    marginBottom: 8,
  };
  return (
    <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", marginBottom: 28 }}>
      <tbody>
        <tr>
          <td style={partyStyle}>
            <div style={labelStyle}>Bill from</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{billFrom.name}</div>
            <div style={{ color: GRAY, lineHeight: 1.6 }}>
              {billFrom.address}
              <br />
              {billFrom.cityStateZip}
              <br />
              {billFrom.country}
            </div>
            {billFrom.phone && (
              <div style={{ color: GRAY, marginTop: 4 }}>{billFrom.phone}</div>
            )}
          </td>
          <td style={partyStyle}>
            <div style={labelStyle}>Bill to</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{billTo.name}</div>
            <div style={{ color: GRAY, lineHeight: 1.6 }}>
              {billTo.address}
              <br />
              {billTo.cityStateZip}
              <br />
              {billTo.country}
            </div>
            {billTo.vatId && (
              <div style={{ color: GRAY, marginTop: 4 }}>
                VAT ID: {billTo.vatId}
              </div>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function TotalBadge({ label, amount, currency = "USD", status }) {
  const isGreen = status === "paid";
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        padding: "20px 24px",
        background: isGreen ? "#ecfdf5" : BRAND_BG,
        borderRadius: 10,
        border: `1px solid ${isGreen ? "#a7f3d0" : "#bfdbfe"}`,
        marginBottom: 28,
      }}
    >
      <tbody>
        <tr>
          <td style={{ padding: "20px 24px", verticalAlign: "middle" }}>
            <div
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                color: isGreen ? "#047857" : BRAND_DARK,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: isGreen ? "#065f46" : BRAND_DARK,
                letterSpacing: -0.5,
              }}
            >
              {currency} ${formatMoney(amount)}
            </div>
          </td>
          {status === "paid" && (
            <td style={{ padding: "20px 24px", textAlign: "right", verticalAlign: "middle" }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "6px 16px",
                  background: "#059669",
                  color: "#fff",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Paid
              </div>
            </td>
          )}
        </tr>
      </tbody>
    </table>
  );
}

function SummaryTable({ rows, totalLabel = "Total due", totalAmount }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
      <thead>
        <tr>
          <th style={thStyle}>Summary</th>
          <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            <td style={{ ...tdStyle, background: i % 2 === 0 ? "#fff" : LIGHT_GRAY }}>
              {row.label}
            </td>
            <td
              style={{
                ...tdStyle,
                textAlign: "right",
                background: i % 2 === 0 ? "#fff" : LIGHT_GRAY,
              }}
            >
              ${formatMoney(row.amount)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td style={{ ...tdStyle, fontWeight: 700, borderTop: `2px solid ${DARK}` }}>
            {totalLabel}
          </td>
          <td
            style={{
              ...tdStyle,
              textAlign: "right",
              fontWeight: 700,
              borderTop: `2px solid ${DARK}`,
              fontSize: 15,
            }}
          >
            ${formatMoney(totalAmount)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

function ExchangeRateNote({ fromCurrency, toCurrency, rate }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: "#9ca3af",
        padding: "12px 16px",
        background: LIGHT_GRAY,
        borderRadius: 6,
        marginBottom: 20,
      }}
    >
      Exchange rate: {fromCurrency} 1.00 = {toCurrency} ${rate} · This includes
      a standard exchange rate and coverage for currency changes and operational
      costs.
    </div>
  );
}

function EmployeeSection({ employee, isDetailed = false }) {
  return (
    <div
      style={{
        marginBottom: 20,
        padding: "16px 20px",
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: isDetailed ? 12 : 0,
        }}
      >
        <tbody>
          <tr>
            <td style={{ verticalAlign: "middle" }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{employee.name}</span>
              {employee.role && (
                <span style={{ color: GRAY, fontSize: 12, marginLeft: 8 }}>
                  — {employee.role}
                </span>
              )}
            </td>
            {employee.invoiceNumber && (
              <td style={{ fontSize: 11, color: "#9ca3af", textAlign: "right", verticalAlign: "middle" }}>
                {employee.invoiceNumber}
              </td>
            )}
          </tr>
        </tbody>
      </table>

      {isDetailed && employee.lineItems && (
        <>
          {employee.period && (
            <div
              style={{
                fontSize: 11,
                color: GRAY,
                marginBottom: 10,
                paddingBottom: 10,
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              Invoice for work between {employee.period}
            </div>
          )}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {employee.lineItems.map((item, i) => (
                <tr key={i}>
                  <td
                    style={{
                      padding: "6px 0",
                      fontSize: 12,
                      color: DARK,
                      borderBottom:
                        i < employee.lineItems.length - 1
                          ? `1px solid #f3f4f6`
                          : "none",
                    }}
                  >
                    <div>{item.description}</div>
                    {item.detail && (
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                        {item.detail}
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "6px 0",
                      fontSize: 12,
                      textAlign: "right",
                      whiteSpace: "nowrap",
                      borderBottom:
                        i < employee.lineItems.length - 1
                          ? `1px solid #f3f4f6`
                          : "none",
                    }}
                  >
                    {item.amountNPR && (
                      <div style={{ color: GRAY, fontSize: 11 }}>
                        NPR {formatMoney(item.amountNPR)}
                      </div>
                    )}
                    <div style={{ fontWeight: 400 }}>
                      USD ${formatMoney(item.amountUSD)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: 10,
              paddingTop: 10,
              borderTop: `2px solid ${BORDER}`,
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            <tbody>
              <tr>
                <td style={{ paddingTop: 10 }}>Total</td>
                <td style={{ textAlign: "right", paddingTop: 10 }}>${formatMoney(employee.total)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {!isDetailed && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
          <tbody>
            {employee.lineItems?.map((item, i) => (
              <tr key={i}>
                <td style={{ padding: "4px 0", fontSize: 12, color: GRAY }}>
                  {item.description}
                </td>
                <td
                  style={{
                    padding: "4px 0",
                    fontSize: 12,
                    textAlign: "right",
                    fontWeight: 400,
                  }}
                >
                  USD ${formatMoney(item.amountUSD)}
                </td>
              </tr>
            ))}
            <tr>
              <td
                style={{
                  padding: "6px 0 0",
                  fontSize: 12,
                  fontWeight: 600,
                  borderTop: `1px solid ${BORDER}`,
                }}
              >
                Total
              </td>
              <td
                style={{
                  padding: "6px 0 0",
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: "right",
                  borderTop: `1px solid ${BORDER}`,
                }}
              >
                ${formatMoney(employee.total)}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

function DocFooter({ refNumber }) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        marginTop: 32,
        paddingTop: 16,
        borderTop: `1px solid ${BORDER}`,
        fontSize: 11,
        color: "#9ca3af",
      }}
    >
      <tbody>
        <tr>
          <td style={{ paddingTop: 16 }}>Talyn Global LLC (DBA Talyn LLC) · Tyler, TX 75701</td>
          {refNumber && <td style={{ textAlign: "right", paddingTop: 16 }}>Ref: {refNumber}</td>}
        </tr>
      </tbody>
    </table>
  );
}

/* ═══════════════════════════════════════════════
 * 1. INVOICE DOCUMENT
 * ═══════════════════════════════════════════════ */

/**
 * @param {Object} props
 * @param {'summary'|'detail'} props.variant - Summary (1 page) or detail (per-employee breakdown)
 * @param {string} props.docNumber - e.g. "S-2026-7"
 * @param {string} props.issueDate
 * @param {string} props.dueDate
 * @param {Object} props.billFrom - { name, address, cityStateZip, country, phone }
 * @param {Object} props.billTo - { name, address, cityStateZip, country, vatId }
 * @param {number} props.totalDue
 * @param {{ label: string, amount: number }[]} props.summaryRows
 * @param {Object} [props.paymentDetails] - { currency, exchangeRate, exchangeFrom, exchangeTo }
 * @param {Object[]} [props.employees] - Per-employee data (detail variant only)
 * @param {Object[]} [props.platformFees] - Platform fee line items
 * @param {string} [props.refNumber]
 */
export function InvoiceDocument({
  logoSrc,
  variant = "summary",
  docNumber,
  issueDate,
  dueDate,
  billFrom,
  billTo,
  totalDue,
  summaryRows,
  paymentDetails,
  employees = [],
  platformFees = [],
  refNumber,
}) {
  return (
    <div style={{ ...baseFont, maxWidth: 680, margin: "0 auto", padding: "24px 32px" }}>
      <DocHeader
        logoSrc={logoSrc}
        docType="Invoice"
        docNumber={docNumber}
        issueDate={issueDate}
        dueDate={dueDate}
      />
      <BillParties billFrom={billFrom} billTo={billTo} />
      <TotalBadge label="Total due" amount={totalDue} />
      <SummaryTable
        rows={summaryRows}
        totalLabel="Total due"
        totalAmount={totalDue}
      />

      {variant === "detail" && (
        <>
          {paymentDetails && (
            <ExchangeRateNote
              fromCurrency={paymentDetails.exchangeFrom}
              toCurrency={paymentDetails.exchangeTo}
              rate={paymentDetails.exchangeRate}
            />
          )}

          <div
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: 2,
              color: BRAND,
              fontWeight: 700,
              marginBottom: 16,
              marginTop: 28,
            }}
          >
            Platform fees
          </div>
          {platformFees.map((emp, i) => (
            <EmployeeSection key={i} employee={emp} isDetailed={false} />
          ))}

          <div
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: 2,
              color: BRAND,
              fontWeight: 700,
              marginBottom: 16,
              marginTop: 28,
            }}
          >
            Employee payroll
          </div>
          {employees.map((emp, i) => (
            <EmployeeSection key={i} employee={emp} isDetailed={true} />
          ))}
        </>
      )}

      <DocFooter refNumber={refNumber} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
 * 2. RECEIPT DOCUMENT
 * ═══════════════════════════════════════════════ */

/**
 * Same props as InvoiceDocument, but shows "PAID" status.
 * @param {Object} props - Same as InvoiceDocument plus:
 * @param {string} props.paidDate
 */
export function ReceiptDocument({
  logoSrc,
  variant = "summary",
  docNumber,
  issueDate,
  paidDate,
  billFrom,
  billTo,
  totalPaid,
  summaryRows,
  paymentDetails,
  employees = [],
  platformFees = [],
  refNumber,
}) {
  return (
    <div style={{ ...baseFont, maxWidth: 680, margin: "0 auto", padding: "24px 32px" }}>
      <DocHeader
        logoSrc={logoSrc}
        docType="Receipt"
        docNumber={docNumber}
        issueDate={issueDate}
        paidDate={paidDate}
      />
      <BillParties billFrom={billFrom} billTo={billTo} />
      <TotalBadge label="Final amount" amount={totalPaid} status="paid" />
      <SummaryTable
        rows={summaryRows}
        totalLabel="Total paid"
        totalAmount={totalPaid}
      />

      {variant === "detail" && (
        <>
          {paymentDetails && (
            <ExchangeRateNote
              fromCurrency={paymentDetails.exchangeFrom}
              toCurrency={paymentDetails.exchangeTo}
              rate={paymentDetails.exchangeRate}
            />
          )}

          <div style={sectionLabel}>Platform fees</div>
          {platformFees.map((emp, i) => (
            <EmployeeSection key={i} employee={emp} isDetailed={false} />
          ))}

          <div style={sectionLabel}>Employee payroll</div>
          {employees.map((emp, i) => (
            <EmployeeSection key={i} employee={emp} isDetailed={true} />
          ))}
        </>
      )}

      <DocFooter refNumber={refNumber} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
 * 3. PAYSLIP DOCUMENT
 * ═══════════════════════════════════════════════ */

/**
 * @param {Object} props
 * @param {string} props.period - e.g. "February 2026"
 * @param {Object} props.employee - { name, oid, joinDate, designation, pan, bankAccount, bankName }
 * @param {{ label: string, amount: number|null }[]} props.incomeItems
 * @param {{ label: string, amount: number|null }[]} props.deductionItems
 * @param {number} props.totalGross
 * @param {number} props.totalDeductions
 * @param {number} props.netSalary
 */
export function PayslipDocument({
  logoSrc,
  period,
  employee,
  incomeItems,
  deductionItems,
  totalGross,
  totalDeductions,
  netSalary,
}) {
  const infoRows = [
    ["Employee name", employee.name],
    ["Employee ID", employee.oid],
    ["Date of joining", employee.joinDate],
    ["Designation", employee.designation],
    ["PAN", employee.pan],
    ["Bank account", employee.bankAccount ? `****${employee.bankAccount.slice(-4)}` : "—"],
    ["Bank name", employee.bankName],
  ];

  return (
    <div style={{ ...baseFont, maxWidth: 680, margin: "0 auto", padding: "24px 32px" }}>
      {/* Header */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: "top" }}>
              <TalynLogo logoSrc={logoSrc} size={44} />
            </td>
            <td style={{ textAlign: "right", verticalAlign: "top" }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  fontWeight: 700,
                  color: BRAND,
                  marginBottom: 4,
                }}
              >
                Payslip
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: DARK }}>
                {period}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Employee Info */}
      <div
        style={{
          background: LIGHT_GRAY,
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 24,
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {(() => {
              const rows = [];
              for (let i = 0; i < infoRows.length; i += 2) {
                rows.push(
                  <tr key={i}>
                    <td style={{ fontSize: 12, color: GRAY, padding: "4px 0", width: "25%" }}>{infoRows[i][0]}</td>
                    <td style={{ fontSize: 12, fontWeight: 400, padding: "4px 16px 4px 0", width: "25%" }}>{infoRows[i][1]}</td>
                    {infoRows[i + 1] && (
                      <>
                        <td style={{ fontSize: 12, color: GRAY, padding: "4px 0", width: "25%" }}>{infoRows[i + 1][0]}</td>
                        <td style={{ fontSize: 12, fontWeight: 400, padding: "4px 0", width: "25%" }}>{infoRows[i + 1][1]}</td>
                      </>
                    )}
                  </tr>
                );
              }
              return rows;
            })()}
          </tbody>
        </table>
      </div>

      {/* Income & Deductions */}
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", marginBottom: 4 }}>
        <tbody>
          <tr>
            {/* Income column */}
            <td style={{ width: "50%", verticalAlign: "top", padding: 0 }}>
              <div style={payslipColHeader}>Income</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {incomeItems.map((item, i) => (
                    <tr key={i}>
                      <td style={payslipTd}>{item.label}</td>
                      <td style={{ ...payslipTd, textAlign: "right", fontWeight: 400 }}>
                        {item.amount != null ? formatNPR(item.amount) : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td style={payslipTotalTd}>Total gross salary</td>
                    <td style={{ ...payslipTotalTd, textAlign: "right" }}>
                      {formatNPR(totalGross)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>

            {/* Deductions column */}
            <td style={{ width: "50%", verticalAlign: "top", padding: 0 }}>
              <div style={payslipColHeader}>Deductions</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {deductionItems.map((item, i) => (
                    <tr key={i}>
                      <td style={payslipTd}>{item.label}</td>
                      <td style={{ ...payslipTd, textAlign: "right", fontWeight: 400 }}>
                        {item.amount != null ? formatNPR(item.amount) : "—"}
                      </td>
                    </tr>
                  ))}
                  {/* Pad empty rows to align with income side */}
                  {deductionItems.length < incomeItems.length &&
                    Array.from({ length: incomeItems.length - deductionItems.length }).map(
                      (_, i) => (
                        <tr key={`pad-${i}`}>
                          <td style={payslipTd}>&nbsp;</td>
                          <td style={payslipTd}>&nbsp;</td>
                        </tr>
                      )
                    )}
                  <tr>
                    <td style={payslipTotalTd}>Total deductions</td>
                    <td style={{ ...payslipTotalTd, textAlign: "right" }}>
                      {formatNPR(totalDeductions)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Net Salary */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: 4,
          background: BRAND_BG,
          borderRadius: 8,
          border: `1px solid #bfdbfe`,
        }}
      >
        <tbody>
          <tr>
            <td style={{ padding: "16px 24px", fontWeight: 700, fontSize: 15, color: BRAND_DARK }}>
              Total net salary
            </td>
            <td style={{ padding: "16px 24px", fontWeight: 700, fontSize: 22, color: BRAND_DARK, textAlign: "right" }}>
              NPR {formatNPR(netSalary)}
            </td>
          </tr>
        </tbody>
      </table>

      <DocFooter />
    </div>
  );
}

/* ═══════════════════════════════════════════════
 * 4. PLATFORM FEE INVOICE
 * ═══════════════════════════════════════════════ */

/**
 * Per-employee EOR platform fee invoice.
 * @param {Object} props
 * @param {string} props.docNumber - e.g. "PF-2026-001"
 * @param {string} props.issueDate
 * @param {string} props.dueDate
 * @param {Object} props.billFrom - { name, address, cityStateZip, country, phone }
 * @param {Object} props.billTo - { name, address, cityStateZip, country, vatId }
 * @param {Object} props.employee - { name, jobTitle }
 * @param {number} props.platformFee - Fee amount in USD
 * @param {number} props.totalDue - Total amount due in USD
 * @param {string} [props.refNumber]
 */
export function PlatformFeeInvoice({
  logoSrc,
  docNumber,
  issueDate,
  dueDate,
  billFrom,
  billTo,
  employee,
  platformFee,
  totalDue,
  refNumber,
}) {
  return (
    <div style={{ ...baseFont, maxWidth: 680, margin: "0 auto", padding: "24px 32px" }}>
      <DocHeader
        logoSrc={logoSrc}
        docType="Invoice"
        docNumber={docNumber}
        issueDate={issueDate}
        dueDate={dueDate}
      />
      <BillParties billFrom={billFrom} billTo={billTo} />
      <TotalBadge label="Total due" amount={totalDue} />

      {/* Employee scope */}
      <div
        style={{
          padding: "12px 16px",
          background: LIGHT_GRAY,
          borderRadius: 6,
          marginBottom: 20,
          fontSize: 12,
        }}
      >
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#9ca3af", fontWeight: 600, marginBottom: 6 }}>
          Employee
        </div>
        <span style={{ fontWeight: 600, color: DARK }}>{employee.name}</span>
        {employee.jobTitle && (
          <span style={{ color: GRAY, marginLeft: 8 }}>— {employee.jobTitle}</span>
        )}
      </div>

      {/* Line item table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr>
            <th style={thStyle}>Description</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>EOR platform fee</td>
            <td style={{ ...tdStyle, textAlign: "right" }}>${formatMoney(platformFee)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td style={{ ...tdStyle, fontWeight: 700, borderTop: `2px solid ${DARK}` }}>
              Total due
            </td>
            <td
              style={{
                ...tdStyle,
                textAlign: "right",
                fontWeight: 700,
                borderTop: `2px solid ${DARK}`,
                fontSize: 15,
              }}
            >
              ${formatMoney(totalDue)}
            </td>
          </tr>
        </tfoot>
      </table>

      <DocFooter refNumber={refNumber} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
 * 5. PLATFORM FEE RECEIPT
 * ═══════════════════════════════════════════════ */

/**
 * Per-employee EOR platform fee receipt (payment confirmation).
 * @param {Object} props
 * @param {string} props.docNumber
 * @param {string} props.issueDate
 * @param {string} props.paidDate
 * @param {Object} props.billFrom - { name, address, cityStateZip, country, phone }
 * @param {Object} props.billTo - { name, address, cityStateZip, country, vatId }
 * @param {Object} props.employee - { name, jobTitle }
 * @param {number} props.platformFee - Fee amount in USD
 * @param {number} props.totalPaid - Total amount paid in USD
 * @param {string} [props.refNumber]
 */
export function PlatformFeeReceipt({
  logoSrc,
  docNumber,
  issueDate,
  paidDate,
  billFrom,
  billTo,
  employee,
  platformFee,
  totalPaid,
  refNumber,
}) {
  return (
    <div style={{ ...baseFont, maxWidth: 680, margin: "0 auto", padding: "24px 32px" }}>
      <DocHeader
        logoSrc={logoSrc}
        docType="Receipt"
        docNumber={docNumber}
        issueDate={issueDate}
        paidDate={paidDate}
      />
      <BillParties billFrom={billFrom} billTo={billTo} />
      <TotalBadge label="Total paid" amount={totalPaid} status="paid" />

      {/* Employee scope */}
      <div
        style={{
          padding: "12px 16px",
          background: LIGHT_GRAY,
          borderRadius: 6,
          marginBottom: 20,
          fontSize: 12,
        }}
      >
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#9ca3af", fontWeight: 600, marginBottom: 6 }}>
          Employee
        </div>
        <span style={{ fontWeight: 600, color: DARK }}>{employee.name}</span>
        {employee.jobTitle && (
          <span style={{ color: GRAY, marginLeft: 8 }}>— {employee.jobTitle}</span>
        )}
      </div>

      {/* Line item table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr>
            <th style={thStyle}>Description</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>EOR platform fee</td>
            <td style={{ ...tdStyle, textAlign: "right" }}>${formatMoney(platformFee)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td style={{ ...tdStyle, fontWeight: 700, borderTop: `2px solid ${DARK}` }}>
              Total paid
            </td>
            <td
              style={{
                ...tdStyle,
                textAlign: "right",
                fontWeight: 700,
                borderTop: `2px solid ${DARK}`,
                fontSize: 15,
              }}
            >
              ${formatMoney(totalPaid)}
            </td>
          </tr>
        </tfoot>
      </table>

      <DocFooter refNumber={refNumber} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
 * 6. PER-EMPLOYEE INVOICE
 * ═══════════════════════════════════════════════ */

/**
 * Invoice for a single employee's salary and employer costs.
 * @param {Object} props
 * @param {string} props.docNumber
 * @param {string} props.issueDate
 * @param {string} props.dueDate
 * @param {Object} props.billFrom - { name, address, cityStateZip, country, phone }
 * @param {Object} props.billTo - { name, address, cityStateZip, country, vatId }
 * @param {Object} props.employee - { name, jobTitle }
 * @param {string} [props.period] - e.g. "March 1, 2026 to March 31, 2026"
 * @param {{ description: string, detail?: string, amountNPR?: number, amountUSD: number }[]} props.lineItems
 * @param {number} props.totalDue
 * @param {Object} [props.paymentDetails] - { exchangeFrom, exchangeTo, exchangeRate }
 * @param {string} [props.refNumber]
 */
export function PerEmployeeInvoice({
  logoSrc,
  docNumber,
  issueDate,
  dueDate,
  billFrom,
  billTo,
  employee,
  period,
  lineItems = [],
  totalDue,
  paymentDetails,
  refNumber,
}) {
  return (
    <div style={{ ...baseFont, maxWidth: 680, margin: "0 auto", padding: "24px 32px" }}>
      <DocHeader
        logoSrc={logoSrc}
        docType="Invoice"
        docNumber={docNumber}
        issueDate={issueDate}
        dueDate={dueDate}
      />
      <BillParties billFrom={billFrom} billTo={billTo} />
      <TotalBadge label="Total due" amount={totalDue} />

      {/* Employee scope */}
      <div
        style={{
          padding: "12px 16px",
          background: LIGHT_GRAY,
          borderRadius: 6,
          marginBottom: 20,
          fontSize: 12,
        }}
      >
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#9ca3af", fontWeight: 600, marginBottom: 6 }}>
          Employee
        </div>
        <span style={{ fontWeight: 600, color: DARK }}>{employee.name}</span>
        {employee.jobTitle && (
          <span style={{ color: GRAY, marginLeft: 8 }}>— {employee.jobTitle}</span>
        )}
      </div>

      {period && (
        <div
          style={{
            fontSize: 11,
            color: GRAY,
            marginBottom: 16,
            paddingBottom: 10,
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          Invoice for work between {period}
        </div>
      )}

      {paymentDetails && (
        <ExchangeRateNote
          fromCurrency={paymentDetails.exchangeFrom}
          toCurrency={paymentDetails.exchangeTo}
          rate={paymentDetails.exchangeRate}
        />
      )}

      {/* Line items table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr>
            <th style={thStyle}>Description</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, i) => (
            <tr key={i}>
              <td style={{ ...tdStyle, background: i % 2 === 0 ? "#fff" : LIGHT_GRAY }}>
                <div>{item.description}</div>
                {item.detail && (
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                    {item.detail}
                  </div>
                )}
              </td>
              <td
                style={{
                  ...tdStyle,
                  textAlign: "right",
                  background: i % 2 === 0 ? "#fff" : LIGHT_GRAY,
                }}
              >
                {item.amountNPR != null && (
                  <div style={{ color: GRAY, fontSize: 11 }}>
                    NPR {formatMoney(item.amountNPR)}
                  </div>
                )}
                <div style={{ fontWeight: 400 }}>
                  USD ${formatMoney(item.amountUSD)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ ...tdStyle, fontWeight: 700, borderTop: `2px solid ${DARK}` }}>
              Total due
            </td>
            <td
              style={{
                ...tdStyle,
                textAlign: "right",
                fontWeight: 700,
                borderTop: `2px solid ${DARK}`,
                fontSize: 15,
              }}
            >
              ${formatMoney(totalDue)}
            </td>
          </tr>
        </tfoot>
      </table>

      <DocFooter refNumber={refNumber} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
 * 7. PER-EMPLOYEE RECEIPT
 * ═══════════════════════════════════════════════ */

/**
 * Receipt for a single employee's salary and employer costs (payment confirmation).
 * @param {Object} props
 * @param {string} props.docNumber
 * @param {string} props.issueDate
 * @param {string} props.paidDate
 * @param {Object} props.billFrom - { name, address, cityStateZip, country, phone }
 * @param {Object} props.billTo - { name, address, cityStateZip, country, vatId }
 * @param {Object} props.employee - { name, jobTitle }
 * @param {string} [props.period]
 * @param {{ description: string, detail?: string, amountNPR?: number, amountUSD: number }[]} props.lineItems
 * @param {number} props.totalPaid
 * @param {Object} [props.paymentDetails] - { exchangeFrom, exchangeTo, exchangeRate }
 * @param {string} [props.refNumber]
 */
export function PerEmployeeReceipt({
  logoSrc,
  docNumber,
  issueDate,
  paidDate,
  billFrom,
  billTo,
  employee,
  period,
  lineItems = [],
  totalPaid,
  paymentDetails,
  refNumber,
}) {
  return (
    <div style={{ ...baseFont, maxWidth: 680, margin: "0 auto", padding: "24px 32px" }}>
      <DocHeader
        logoSrc={logoSrc}
        docType="Receipt"
        docNumber={docNumber}
        issueDate={issueDate}
        paidDate={paidDate}
      />
      <BillParties billFrom={billFrom} billTo={billTo} />
      <TotalBadge label="Total paid" amount={totalPaid} status="paid" />

      {/* Employee scope */}
      <div
        style={{
          padding: "12px 16px",
          background: LIGHT_GRAY,
          borderRadius: 6,
          marginBottom: 20,
          fontSize: 12,
        }}
      >
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#9ca3af", fontWeight: 600, marginBottom: 6 }}>
          Employee
        </div>
        <span style={{ fontWeight: 600, color: DARK }}>{employee.name}</span>
        {employee.jobTitle && (
          <span style={{ color: GRAY, marginLeft: 8 }}>— {employee.jobTitle}</span>
        )}
      </div>

      {period && (
        <div
          style={{
            fontSize: 11,
            color: GRAY,
            marginBottom: 16,
            paddingBottom: 10,
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          Payment for work between {period}
        </div>
      )}

      {paymentDetails && (
        <ExchangeRateNote
          fromCurrency={paymentDetails.exchangeFrom}
          toCurrency={paymentDetails.exchangeTo}
          rate={paymentDetails.exchangeRate}
        />
      )}

      {/* Line items table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr>
            <th style={thStyle}>Description</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, i) => (
            <tr key={i}>
              <td style={{ ...tdStyle, background: i % 2 === 0 ? "#fff" : LIGHT_GRAY }}>
                <div>{item.description}</div>
                {item.detail && (
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                    {item.detail}
                  </div>
                )}
              </td>
              <td
                style={{
                  ...tdStyle,
                  textAlign: "right",
                  background: i % 2 === 0 ? "#fff" : LIGHT_GRAY,
                }}
              >
                {item.amountNPR != null && (
                  <div style={{ color: GRAY, fontSize: 11 }}>
                    NPR {formatMoney(item.amountNPR)}
                  </div>
                )}
                <div style={{ fontWeight: 400 }}>
                  USD ${formatMoney(item.amountUSD)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ ...tdStyle, fontWeight: 700, borderTop: `2px solid ${DARK}` }}>
              Total paid
            </td>
            <td
              style={{
                ...tdStyle,
                textAlign: "right",
                fontWeight: 700,
                borderTop: `2px solid ${DARK}`,
                fontSize: 15,
              }}
            >
              ${formatMoney(totalPaid)}
            </td>
          </tr>
        </tfoot>
      </table>

      <DocFooter refNumber={refNumber} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
 * HELPER STYLES & FORMATTERS
 * ═══════════════════════════════════════════════ */

const thStyle = {
  padding: "10px 12px",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: 1,
  color: "#9ca3af",
  fontWeight: 600,
  textAlign: "left",
  borderBottom: `2px solid ${DARK}`,
};

const tdStyle = {
  padding: "10px 12px",
  fontSize: 13,
  borderBottom: `1px solid #f3f4f6`,
};

const sectionLabel = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: 2,
  color: BRAND,
  fontWeight: 700,
  marginBottom: 16,
  marginTop: 28,
};

const payslipColHeader = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: 1.5,
  color: BRAND,
  fontWeight: 700,
  padding: "8px 10px",
  background: BRAND_BG,
  borderRadius: "6px 6px 0 0",
  borderBottom: `2px solid ${BRAND}`,
};

const payslipTd = {
  padding: "8px 10px",
  fontSize: 12,
  borderBottom: `1px solid #f3f4f6`,
  color: "#374151",
};

const payslipTotalTd = {
  padding: "10px 10px",
  fontSize: 13,
  fontWeight: 600,
  borderTop: `2px solid ${DARK}`,
  color: DARK,
};

export function formatMoney(n) {
  if (n == null) return "0.00";
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatNPR(n) {
  if (n == null) return "—";
  // Nepal uses Indian comma system: 1,00,000
  const [int, dec] = Number(n).toFixed(2).split(".");
  const lastThree = int.slice(-3);
  const rest = int.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + (rest ? "," : "") + lastThree;
  return `${formatted}.${dec}`;
}

/* ═══════════════════════════════════════════════
 * PREVIEW WITH SAMPLE DATA
 * (Remove this default export in production —
 *  export the 3 components individually instead)
 * ═══════════════════════════════════════════════ */

const sampleBillFrom = {
  name: "Talyn Global LLC (DBA Talyn LLC)",
  address: "2702 E Fifth St, #803",
  cityStateZip: "Tyler, TX 75701",
  country: "United States",
  phone: "+1 903-426-5303",
};

const sampleBillTo = {
  name: "EMA Engineering & Consulting, Inc.",
  address: "328 South Broadway Avenue",
  cityStateZip: "Tyler, TX 75703",
  country: "United States",
  vatId: "751684881",
};

const sampleEmployees = [
  {
    name: "Aashish Katuwal",
    role: "Energy/Sustainability Engineer I",
    invoiceNumber: "INV-TAL-2026-001",
    period: "March 1, 2026 to March 31, 2026",
    lineItems: [
      {
        description: "Salary",
        detail: "Monthly gross salary — regular work",
        amountNPR: 65000,
        amountUSD: 461.57,
      },
      {
        description: "Employer Contributions: Social Security",
        detail: "ER — Social Security (SSF 20%)",
        amountNPR: 7800,
        amountUSD: 55.39,
      },
      {
        description: "Severance accrual",
        detail: "Employer contribution — Month 11 of 12",
        amountNPR: 2500,
        amountUSD: 17.75,
      },
    ],
    total: 534.71,
  },
  {
    name: "Nirmala Kutuwo",
    role: "Designer",
    invoiceNumber: "INV-TAL-2026-002",
    period: "March 1, 2026 to March 31, 2026",
    lineItems: [
      {
        description: "Salary",
        detail: "Monthly gross salary — regular work",
        amountNPR: 83333.33,
        amountUSD: 591.75,
      },
      {
        description: "Employer Contributions: Social Security",
        detail: "ER — Social Security (SSF 20%)",
        amountNPR: 10000,
        amountUSD: 71.01,
      },
      {
        description: "Severance accrual",
        detail: "Employer contribution — Month 12 of 12",
        amountNPR: 3333.33,
        amountUSD: 23.67,
      },
    ],
    total: 686.43,
  },
];

const samplePlatformFees = [
  {
    name: "Aashish Katuwal",
    role: "Energy/Sustainability Engineer I",
    lineItems: [{ description: "EOR platform fee", amountUSD: 599.0 }],
    total: 599.0,
  },
  {
    name: "Nirmala Kutuwo",
    role: "Designer",
    lineItems: [{ description: "EOR platform fee", amountUSD: 599.0 }],
    total: 599.0,
  },
];

export default function FinancialDocumentsPreview() {
  const [activeDoc, setActiveDoc] = useState("invoice-detail");

  const docs = [
    { id: "invoice-summary", label: "Invoice (Summary)" },
    { id: "invoice-detail", label: "Invoice (Detail)" },
    { id: "receipt-summary", label: "Receipt (Summary)" },
    { id: "receipt-detail", label: "Receipt (Detail)" },
    { id: "payslip", label: "Payslip" },
    { id: "platform-fee", label: "Platform Fee" },
    { id: "platform-fee-receipt", label: "PF Receipt" },
    { id: "emp-invoice", label: "Emp Invoice" },
    { id: "emp-receipt", label: "Emp Receipt" },
  ];

  return (
    <div style={{ fontFamily: baseFont.fontFamily }}>
      {/* Doc type selector */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "12px 16px",
          background: "#f9fafb",
          borderRadius: "10px 10px 0 0",
          borderBottom: "1px solid #e5e7eb",
          flexWrap: "wrap",
        }}
      >
        {docs.map((d) => (
          <button
            key={d.id}
            onClick={() => setActiveDoc(d.id)}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: activeDoc === d.id ? 600 : 400,
              color: activeDoc === d.id ? "#fff" : GRAY,
              background: activeDoc === d.id ? BRAND : "#fff",
              border: `1px solid ${activeDoc === d.id ? BRAND : BORDER}`,
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Document render area */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderTop: "none",
          borderRadius: "0 0 10px 10px",
          minHeight: 400,
        }}
      >
        {activeDoc === "invoice-summary" && (
          <InvoiceDocument
            variant="summary"
            docNumber="S-2026-7"
            issueDate="March 24, 2026"
            dueDate="March 29, 2026"
            billFrom={sampleBillFrom}
            billTo={sampleBillTo}
            totalDue={2331.14}
            summaryRows={[
              { label: "Employee invoices total", amount: 1221.14 },
              { label: "Talyn fees", amount: 5.0 },
              { label: "Platform fee (2 employees × $599)", amount: 1198.0 },
            ]}
            refNumber="TLN-7f8a3e2b"
          />
        )}

        {activeDoc === "invoice-detail" && (
          <InvoiceDocument
            variant="detail"
            docNumber="S-2026-7"
            issueDate="March 24, 2026"
            dueDate="March 29, 2026"
            billFrom={sampleBillFrom}
            billTo={sampleBillTo}
            totalDue={2331.14}
            summaryRows={[
              { label: "Employee invoices total", amount: 1221.14 },
              { label: "Talyn fees", amount: 5.0 },
              { label: "Platform fee (2 employees × $599)", amount: 1198.0 },
            ]}
            paymentDetails={{
              currency: "USD",
              exchangeRate: "0.0071010",
              exchangeFrom: "NPR",
              exchangeTo: "USD",
            }}
            platformFees={samplePlatformFees}
            employees={sampleEmployees}
            refNumber="TLN-7f8a3e2b"
          />
        )}

        {activeDoc === "receipt-summary" && (
          <ReceiptDocument
            variant="summary"
            docNumber="REC-2026-4"
            issueDate="March 24, 2026"
            paidDate="March 24, 2026"
            billFrom={sampleBillFrom}
            billTo={sampleBillTo}
            totalPaid={2331.14}
            summaryRows={[
              { label: "Employee invoices total", amount: 1221.14 },
              { label: "Talyn fees", amount: 5.0 },
              { label: "Platform fee", amount: 1198.0 },
            ]}
            refNumber="TLN-7f8a3e2b"
          />
        )}

        {activeDoc === "receipt-detail" && (
          <ReceiptDocument
            variant="detail"
            docNumber="REC-2026-4"
            issueDate="March 24, 2026"
            paidDate="March 24, 2026"
            billFrom={sampleBillFrom}
            billTo={sampleBillTo}
            totalPaid={2331.14}
            summaryRows={[
              { label: "Employee invoices total", amount: 1221.14 },
              { label: "Talyn fees", amount: 5.0 },
              { label: "Platform fee", amount: 1198.0 },
            ]}
            paymentDetails={{
              currency: "USD",
              exchangeRate: "0.0071010",
              exchangeFrom: "NPR",
              exchangeTo: "USD",
            }}
            platformFees={samplePlatformFees}
            employees={sampleEmployees}
            refNumber="TLN-7f8a3e2b"
          />
        )}

        {activeDoc === "platform-fee" && (
          <PlatformFeeInvoice
            docNumber="PF-2026-001"
            issueDate="March 24, 2026"
            dueDate="March 29, 2026"
            billFrom={sampleBillFrom}
            billTo={sampleBillTo}
            employee={{ name: "Aashish Katuwal", jobTitle: "Energy/Sustainability Engineer I" }}
            platformFee={599.0}
            totalDue={599.0}
            refNumber="TLN-pf-7f8a"
          />
        )}

        {activeDoc === "platform-fee-receipt" && (
          <PlatformFeeReceipt
            docNumber="PFR-2026-001"
            issueDate="March 24, 2026"
            paidDate="March 24, 2026"
            billFrom={sampleBillFrom}
            billTo={sampleBillTo}
            employee={{ name: "Aashish Katuwal", jobTitle: "Energy/Sustainability Engineer I" }}
            platformFee={599.0}
            totalPaid={599.0}
            refNumber="TLN-pfr-7f8a"
          />
        )}

        {activeDoc === "emp-invoice" && (
          <PerEmployeeInvoice
            docNumber="INV-TAL-2026-001"
            issueDate="March 24, 2026"
            dueDate="March 29, 2026"
            billFrom={sampleBillFrom}
            billTo={sampleBillTo}
            employee={{ name: "Aashish Katuwal", jobTitle: "Energy/Sustainability Engineer I" }}
            period="March 1, 2026 to March 31, 2026"
            lineItems={[
              { description: "Salary", detail: "Monthly gross salary — regular work", amountNPR: 65000, amountUSD: 461.57 },
              { description: "Employer Contributions: Social Security", detail: "ER — Social Security (SSF 20%)", amountNPR: 13000, amountUSD: 92.31 },
            ]}
            totalDue={553.88}
            paymentDetails={{ exchangeFrom: "NPR", exchangeTo: "USD", exchangeRate: "0.0071010" }}
            refNumber="TLN-ei-7f8a"
          />
        )}

        {activeDoc === "emp-receipt" && (
          <PerEmployeeReceipt
            docNumber="REC-TAL-2026-001"
            issueDate="March 24, 2026"
            paidDate="March 24, 2026"
            billFrom={sampleBillFrom}
            billTo={sampleBillTo}
            employee={{ name: "Aashish Katuwal", jobTitle: "Energy/Sustainability Engineer I" }}
            period="March 1, 2026 to March 31, 2026"
            lineItems={[
              { description: "Salary", detail: "Monthly gross salary — regular work", amountNPR: 65000, amountUSD: 461.57 },
              { description: "Employer Contributions: Social Security", detail: "ER — Social Security (SSF 20%)", amountNPR: 13000, amountUSD: 92.31 },
            ]}
            totalPaid={553.88}
            paymentDetails={{ exchangeFrom: "NPR", exchangeTo: "USD", exchangeRate: "0.0071010" }}
            refNumber="TLN-er-7f8a"
          />
        )}

        {activeDoc === "payslip" && (
          <PayslipDocument
            period="February 2026"
            employee={{
              name: "Nirmala Kutuwo",
              oid: "TLN-mqejx42",
              joinDate: "17-Apr-25",
              designation: "Designer",
              pan: "133856439",
              bankAccount: "00915121195",
              bankName: "Siddhartha Bank Ltd.",
            }}
            incomeItems={[
              { label: "Basic salary", amount: 50000 },
              { label: "Dearness allowance", amount: 33333.33 },
              { label: "Other allowance", amount: null },
              { label: "Festival allowance", amount: null },
              { label: "Bonus", amount: null },
              { label: "Leave encashments", amount: null },
              { label: "Other payments", amount: null },
            ]}
            deductionItems={[
              { label: "SSF (employee)", amount: 5500 },
              { label: "Income tax", amount: 5009.99 },
            ]}
            totalGross={83333.33}
            totalDeductions={10509.99}
            netSalary={72823.34}
          />
        )}
      </div>
    </div>
  );
}
