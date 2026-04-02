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
  return `रू${formatted}.${dec}`;
}

function formatRate(rate) {
  return `${(parseFloat(rate) * 100).toFixed(0)}%`;
}

/* ─── Sub-components ─── */

function DocHeader({ logoSrc, docType, docNumber, date, validUntil, quoteTitle }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 32,
      }}
    >
      <div>
        <TalynLogo logoSrc={logoSrc} height={240} />
        <div
          style={{
            marginTop: 12,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 2,
            fontWeight: 700,
            color: BRAND,
          }}
        >
          {docType}
        </div>
      </div>
      <div style={{ textAlign: "right", fontSize: 12, color: GRAY }}>
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
      </div>
    </div>
  );
}

function InfoGrid({ rows, columns = 2 }) {
  return (
    <div
      style={{
        background: LIGHT_GRAY,
        borderRadius: 8,
        padding: "16px 20px",
        marginBottom: 24,
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: "8px 32px",
      }}
    >
      {rows.map(([label, value], i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
          }}
        >
          <span style={{ color: GRAY }}>{label}</span>
          <span style={{ fontWeight: 500, color: DARK }}>{value || "—"}</span>
        </div>
      ))}
    </div>
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
                  fontWeight: row.isTotal ? 700 : 500,
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "#9ca3af",
        }}
      >
        <div>Talyn Global LLC (DBA Talyn LLC) · Tyler, TX 75701</div>
        {refNumber && <div>Ref: {refNumber}</div>}
      </div>
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
 * @param {number} props.costs.employerSsf
 * @param {string} props.costs.employerSsfRate - e.g. "0.20"
 * @param {number} props.costs.subtotalLocal - monthlyGross + employerSsf
 * @param {number} props.costs.platformFee - in USD (e.g. 599)
 * @param {number} props.costs.employeeSsf
 * @param {string} props.costs.employeeSsfRate - e.g. "0.11"
 * @param {number} props.costs.estimatedNetSalary
 * @param {number} props.costs.annualCostLocal
 * @param {number} props.costs.annualPlatformFee - in USD
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
    <div style={{ ...baseFont, maxWidth: 680, margin: "0 auto", padding: 40 }}>
      {/* Header */}
      <DocHeader
        logoSrc={logoSrc}
        docType="EOR Cost Quote"
        docNumber={quoteNumber}
        date={date}
        validUntil={validUntil}
      />

      {/* Prepared For + Status */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
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
        </div>
        <div
          style={{
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
      </div>

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
            amount: `${cur} ${formatNPR(costs.monthlyGross).replace("रू", "")}`,
          },
          {
            label: "Employer SSF contribution",
            detail: `(${formatRate(costs.employerSsfRate)})`,
            amount: `${cur} ${formatNPR(costs.employerSsf).replace("रू", "")}`,
          },
          {
            label: "Subtotal (local currency)",
            amount: `${cur} ${formatNPR(costs.subtotalLocal).replace("रू", "")}`,
            isTotal: true,
          },
          {
            label: "Talyn platform fee",
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
            detail: `(${formatRate(costs.employeeSsfRate)})`,
            amount: `${cur} ${formatNPR(costs.employeeSsf).replace("रू", "")}`,
          },
          {
            label: "Estimated net salary (before income tax)",
            amount: `${cur} ${formatNPR(costs.estimatedNetSalary).replace("रू", "")}`,
          },
        ]}
      />

      {/* Annual Estimates */}
      <AnnualEstimateBox
        items={[
          {
            label: "Annual estimate (local)",
            amount: `${cur} ${formatNPR(costs.annualCostLocal).replace("रू", "")}`,
          },
          {
            label: "Annual platform fee",
            amount: `USD $${formatMoney(costs.annualPlatformFee)}`,
          },
        ]}
      />

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
          employerSsf: 13000,
          employerSsfRate: "0.20",
          subtotalLocal: 78000,
          platformFee: 599,
          employeeSsf: 7150,
          employeeSsfRate: "0.11",
          estimatedNetSalary: 57850,
          annualCostLocal: 936000,
          annualPlatformFee: 7188,
        }}
        status="draft"
      />
    </div>
  );
}
