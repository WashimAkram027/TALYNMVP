import { useState } from "react";

/*
 * QuoteDocument — EOR Cost Quote
 * ──────────────────────────────
 * Matches the Invoice/Receipt design language.
 * Place alongside FinancialDocuments.jsx or merge into it.
 *
 * Logo Integration (applies to ALL financial document components):
 *
 *   1. Place the logo at: frontend/src/assets/talyn-logo.png
 *   2. Import it: import talynLogo from '../assets/talyn-logo.png'
 *   3. Pass it as logoSrc prop to any document component:
 *      <QuoteDocument logoSrc={talynLogo} ... />
 *      <InvoiceDocument logoSrc={talynLogo} ... />
 *
 *   For the backend Anvil HTML templates:
 *   1. Place talyn-logo-base64.js at: backend/src/config/
 *   2. Import: import { TALYN_LOGO_BASE64 } from '../config/talyn-logo-base64.js'
 *   3. Use in HTML: <img src="${TALYN_LOGO_BASE64}" style="height: 40px;" />
 */

const BRAND = "#1a73e8";
const BRAND_DARK = "#0f4f9e";
const CYAN = "#00e5ff";
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

/* ─── Shared Logo Component ─── */

/**
 * Updated TalynLogo — use this in ALL financial document components.
 * Replace the old TalynLogo function in FinancialDocuments.jsx with this one.
 *
 * @param {Object} props
 * @param {string} [props.logoSrc] - Path to logo image (imported asset or URL)
 * @param {number} [props.height] - Logo height in px (default 36)
 */
export function TalynLogo({ logoSrc, height = 36 }) {
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
      {/* Logo mark — two overlapping squares */}
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

/* ─── Helpers ─── */

function formatMoney(n) {
  if (n == null) return "0.00";
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNPR(n) {
  if (n == null) return "—";
  const [int, dec] = Number(n).toFixed(2).split(".");
  const lastThree = int.slice(-3);
  const rest = int.slice(0, -3);
  const formatted =
    rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + (rest ? "," : "") + lastThree;
  return `${formatted}.${dec}`;
}

function formatRate(rate) {
  return `${(parseFloat(rate) * 100).toFixed(0)}%`;
}

/* ─── Sub-components ─── */

function DocHeader({ logoSrc, docType, docNumber, date, validUntil, quoteTitle }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
      <tbody>
        <tr>
          <td style={{ verticalAlign: "top" }}>
            <TalynLogo logoSrc={logoSrc} height={44} />
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 2,
                fontWeight: 600,
                color: BRAND,
              }}
            >
              {docType}
            </div>
          </td>
          <td style={{ textAlign: "right", verticalAlign: "top", fontSize: 12, color: GRAY }}>
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: "#9ca3af" }}>Quote # </span>
              <span style={{ color: DARK, fontWeight: 600 }}>{docNumber}</span>
            </div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: "#9ca3af" }}>Date </span>
              <span style={{ color: DARK }}>{date}</span>
            </div>
            <div>
              <span style={{ color: "#9ca3af" }}>Valid until </span>
              <span style={{ color: DARK }}>{validUntil}</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function InfoGrid({ rows, columns = 2 }) {
  // Pair rows into groups of `columns` for table layout
  const rowGroups = [];
  for (let i = 0; i < rows.length; i += columns) {
    rowGroups.push(rows.slice(i, i + columns));
  }
  const colWidth = `${Math.floor(100 / columns)}%`;

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        background: LIGHT_GRAY,
        borderRadius: 8,
        marginBottom: 24,
      }}
    >
      <tbody>
        {rowGroups.map((group, gi) => (
          <tr key={gi}>
            {group.map(([label, value], ci) => (
              <td
                key={ci}
                style={{
                  width: colWidth,
                  padding: "6px 20px",
                  fontSize: 12,
                  verticalAlign: "top",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ color: GRAY, textAlign: "left" }}>{label}</td>
                      <td style={{ fontWeight: 400, color: DARK, textAlign: "right" }}>{value || "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            ))}
            {/* Fill empty cells if last group is short */}
            {group.length < columns &&
              Array.from({ length: columns - group.length }).map((_, ei) => (
                <td key={`empty-${ei}`} style={{ width: colWidth }} />
              ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CostTable({ rows, header, accentColor = BRAND }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: 1.5,
          color: accentColor,
          fontWeight: 700,
          padding: "8px 12px",
          background: accentColor === BRAND ? BRAND_BG : "#f0fdf4",
          borderRadius: "6px 6px 0 0",
          borderBottom: `2px solid ${accentColor}`,
        }}
      >
        {header}
      </div>
      <table
        style={{ width: "100%", borderCollapse: "collapse" }}
      >
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td
                style={{
                  padding: "10px 12px",
                  fontSize: 13,
                  color: row.isTotal ? DARK : "#4b5563",
                  fontWeight: row.isTotal ? 700 : 400,
                  borderBottom: row.isTotal
                    ? `2px solid ${DARK}`
                    : `1px solid #f3f4f6`,
                  borderTop: row.isTotal ? `2px solid ${DARK}` : "none",
                }}
              >
                {row.label}
                {row.detail && (
                  <span style={{ color: "#9ca3af", fontSize: 11, marginLeft: 6 }}>
                    {row.detail}
                  </span>
                )}
              </td>
              <td
                style={{
                  padding: "10px 12px",
                  fontSize: row.isTotal ? 15 : 13,
                  fontWeight: row.isTotal ? 700 : 400,
                  textAlign: "right",
                  color: DARK,
                  borderBottom: row.isTotal
                    ? `2px solid ${DARK}`
                    : `1px solid #f3f4f6`,
                  borderTop: row.isTotal ? `2px solid ${DARK}` : "none",
                }}
              >
                {row.amount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnnualEstimateBox({ items }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        marginBottom: 28,
      }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            padding: "16px 20px",
            background: i === 0 ? BRAND_BG : LIGHT_GRAY,
            borderRadius: 8,
            border: `1px solid ${i === 0 ? "#bfdbfe" : BORDER}`,
          }}
        >
          <div
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: i === 0 ? BRAND_DARK : GRAY,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            {item.label}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: i === 0 ? BRAND_DARK : DARK,
              letterSpacing: -0.5,
            }}
          >
            {item.amount}
          </div>
        </div>
      ))}
    </div>
  );
}

function DocFooter({ refNumber }) {
  return (
    <div
      style={{
        marginTop: 32,
        paddingTop: 16,
        borderTop: `1px solid ${BORDER}`,
      }}
    >
      <div style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.6, marginBottom: 12 }}>
        This quote is valid for 30 days from the date of issue. Rates are based on
        current Nepal Social Security Fund (SSF) regulations under the Social Security
        Act 2018. Actual costs may vary based on regulatory changes. This quote does
        not constitute a binding contract.
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ fontSize: 11, color: "#9ca3af", textAlign: "left" }}>
              Talyn Global LLC (DBA Talyn LLC) · Tyler, TX 75701
            </td>
            {refNumber && (
              <td style={{ fontSize: 11, color: "#9ca3af", textAlign: "right" }}>
                Ref: {refNumber}
              </td>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════
 * QUOTE DOCUMENT COMPONENT
 * ═══════════════════════════════════════════════ */

/**
 * @param {Object} props
 * @param {string} [props.logoSrc] - Logo image path or URL
 * @param {string} props.quoteNumber - e.g. "TQ-2026-001"
 * @param {string} props.date - Issue date string
 * @param {string} props.validUntil - Expiry date string
 * @param {string} props.orgName - Employer organization name
 * @param {string} props.generatedBy - Name of person who generated quote
 *
 * @param {Object} props.employee
 * @param {string} props.employee.name
 * @param {string} props.employee.email
 * @param {string} [props.employee.role]
 * @param {string} [props.employee.department]
 * @param {string} [props.employee.employmentType]
 * @param {string} [props.employee.startDate]
 * @param {string} [props.employee.payFrequency]
 * @param {string} [props.employee.country]
 *
 * @param {Object} props.costs - All in display-ready numbers (major units)
 * @param {string} props.costs.currency - e.g. "NPR"
 * @param {number} props.costs.monthlyGross
 * @param {number} props.costs.basicSalaryRatio - e.g. 0.60
 * @param {number} props.costs.employerSsf
 * @param {string} props.costs.employerSsfRate - e.g. "0.20"
 * @param {number} props.costs.severance - monthly severance accrual
 * @param {number} props.costs.subtotalLocal - monthlyGross + employerSsf + severance
 * @param {number} props.costs.platformFee - in USD (e.g. 499)
 * @param {number} props.costs.employeeSsf
 * @param {string} props.costs.employeeSsfRate - e.g. "0.11"
 * @param {number} props.costs.estimatedNetSalary
 * @param {number} [props.costs.exchangeRate] - NPR-to-USD rate
 * @param {number} [props.costs.monthlyGrossUsd] - monthly gross in USD
 * @param {number} [props.costs.monthlyCostUsd] - total monthly cost in USD (incl. platform fee)
 * @param {number} [props.costs.totalAnnualCostUsd] - total annual cost in USD
 * @param {number} props.costs.annualCostLocal
 * @param {number} props.costs.annualPlatformFee - in USD
 * @param {number} [props.costs.thirteenthMonth] - 13th month amount (local)
 * @param {number} [props.costs.documentHandlingFee] - annual doc fee in USD
 *
 * @param {'draft'|'accepted'|'expired'} [props.status]
 * @param {string} [props.refNumber]
 */
export function QuoteDocument({
  logoSrc,
  quoteNumber,
  date,
  validUntil,
  orgName,
  generatedBy,
  employee,
  costs,
  status = "draft",
  refNumber,
}) {
  const cur = costs.currency || "NPR";

  const statusBadge =
    status === "accepted"
      ? { text: "Accepted", bg: "#059669", color: "#fff" }
      : status === "expired"
      ? { text: "Expired", bg: "#dc2626", color: "#fff" }
      : { text: "Draft", bg: "#f3f4f6", color: GRAY };

  return (
    <div style={{ ...baseFont, maxWidth: 680, margin: "0 auto", padding: "24px 32px" }}>
      {/* Header */}
      <DocHeader
        logoSrc={logoSrc}
        docType="EOR Cost Quote"
        docNumber={quoteNumber}
        date={date}
        validUntil={validUntil}
      />

      {/* Prepared For + Status */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: "middle" }}>
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                  color: "#9ca3af",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Prepared for
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: DARK }}>
                {orgName}
              </div>
              <div style={{ fontSize: 12, color: GRAY, marginTop: 2 }}>
                Generated by: {generatedBy}
              </div>
            </td>
            <td style={{ textAlign: "right", verticalAlign: "middle" }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "6px 16px",
                  background: statusBadge.bg,
                  color: statusBadge.color,
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {statusBadge.text}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Divider */}
      <hr style={{ border: "none", borderTop: `1px solid ${BORDER}`, margin: "0 0 24px" }} />

      {/* Employee Details */}
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: 2,
          color: BRAND,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        Employee details
      </div>
      <InfoGrid
        rows={[
          ["Name", employee.name],
          ["Email", employee.email],
          ["Role", employee.role],
          ["Department", employee.department],
          ["Employment type", employee.employmentType || "Full time"],
          ["Start date", employee.startDate],
          ["Pay frequency", employee.payFrequency || "Monthly"],
          ["Country", employee.country || "Nepal"],
        ]}
      />

      {/* Monthly Employer Cost */}
      <CostTable
        header="Monthly employer cost breakdown"
        rows={[
          {
            label: "Employee gross salary",
            amount: `${cur} ${formatNPR(costs.monthlyGross)}`,
          },
          {
            label: "Employer SSF contribution",
            detail: `(${formatRate(costs.employerSsfRate)} of ${costs.basicSalaryRatio ? (costs.basicSalaryRatio * 100).toFixed(0) + '% basic' : '60% basic'})`,
            amount: `${cur} ${formatNPR(costs.employerSsf)}`,
          },
          ...(costs.severance ? [{
            label: "Severance accrual",
            detail: "(basic salary / 12)",
            amount: `${cur} ${formatNPR(costs.severance)}`,
          }] : []),
          {
            label: "Total monthly company cost",
            amount: `${cur} ${formatNPR(costs.subtotalLocal)}`,
            isTotal: true,
          },
          ...(costs.monthlyCostUsd ? [{
            label: "Total monthly company cost (USD)",
            amount: `USD $${formatMoney(costs.monthlyCostUsd)}`,
            isTotal: true,
          }] : []),
          {
            label: "Talyn platform fee",
            detail: "(included in USD total above)",
            amount: `USD $${formatMoney(costs.platformFee)} /mo`,
          },
        ]}
      />

      {/* Employee Deductions Reference */}
      <CostTable
        header="Reference: employee deductions (not billed to you)"
        accentColor="#9ca3af"
        rows={[
          {
            label: "Employee SSF deduction",
            detail: `(${formatRate(costs.employeeSsfRate)} of ${costs.basicSalaryRatio ? (costs.basicSalaryRatio * 100).toFixed(0) + '% basic' : '60% basic'})`,
            amount: `${cur} ${formatNPR(costs.employeeSsf)}`,
          },
          {
            label: "Estimated net salary (before income tax)",
            amount: `${cur} ${formatNPR(costs.estimatedNetSalary)}`,
          },
        ]}
      />

      {/* Annual Cost Breakdown */}
      <CostTable
        header="Annual cost estimate"
        rows={[
          {
            label: "Annual salary + SSF + severance",
            amount: `${cur} ${formatNPR(costs.annualCostLocal)}`,
          },
          ...(costs.thirteenthMonth ? [{
            label: "13th month salary",
            amount: `${cur} ${formatNPR(costs.thirteenthMonth)}`,
          }] : []),
          {
            label: "Annual platform fee",
            amount: `USD $${formatMoney(costs.annualPlatformFee)}`,
          },
          ...(costs.documentHandlingFee ? [{
            label: "Document handling fee",
            detail: "(annual)",
            amount: `USD $${formatMoney(costs.documentHandlingFee)}`,
          }] : []),
          ...(costs.totalAnnualCostUsd ? [{
            label: "Total annual company cost",
            amount: `USD $${formatMoney(costs.totalAnnualCostUsd)}`,
            isTotal: true,
          }] : []),
        ]}
      />

      {/* Exchange rate note */}
      {costs.exchangeRate && (
        <div
          style={{
            fontSize: 11,
            color: "#9ca3af",
            marginBottom: 16,
            padding: "8px 12px",
            background: LIGHT_GRAY,
            borderRadius: 6,
          }}
        >
          Exchange rate: 1 NPR = {Number(costs.exchangeRate).toFixed(6)} USD.
          USD amounts are estimates and may vary with exchange rate fluctuations.
        </div>
      )}

      <DocFooter refNumber={refNumber} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
 * PREVIEW WITH SAMPLE DATA
 * ═══════════════════════════════════════════════ */

export default function QuotePreview() {
  return (
    <div style={{ fontFamily: baseFont.fontFamily }}>
      <QuoteDocument
        quoteNumber="TQ-2026-003"
        date="March 29, 2026"
        validUntil="April 28, 2026"
        orgName="EMA Engineering & Consulting, Inc."
        generatedBy="Washim Ahmed"
        employee={{
          name: "Aashish Katuwal",
          email: "aashish@ema-eng.com",
          role: "Energy/Sustainability Engineer I",
          department: "Engineering",
          employmentType: "Full time",
          startDate: "April 17, 2025",
          payFrequency: "Monthly",
          country: "Nepal (NPL)",
        }}
        costs={{
          currency: "NPR",
          monthlyGross: 65000,
          basicSalaryRatio: 0.60,
          employerSsf: 7800,
          employerSsfRate: "0.20",
          severance: 3250,
          subtotalLocal: 76050,
          platformFee: 499,
          employeeSsf: 4290,
          employeeSsfRate: "0.11",
          estimatedNetSalary: 60710,
          exchangeRate: 0.0074,
          monthlyGrossUsd: 481,
          monthlyCostUsd: 1061.77,
          totalAnnualCostUsd: 13302.24,
          annualCostLocal: 912600,
          annualPlatformFee: 5988,
          thirteenthMonth: 65000,
          documentHandlingFee: 80,
        }}
        status="draft"
      />
    </div>
  );
}
