// ../frontend/src/components/QuoteDocument.jsx
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
var BRAND = "#1a73e8";
var CYAN = "#00e5ff";
var DARK = "#111827";
var GRAY = "#6b7280";
var LIGHT_GRAY = "#f9fafb";
var BORDER = "#e5e7eb";
var BRAND_BG = "#eff6ff";
var baseFont = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  color: DARK,
  fontSize: 13,
  lineHeight: 1.5
};
function TalynLogo({ logoSrc, height = 36 }) {
  if (logoSrc) {
    return /* @__PURE__ */ jsx(
      "img",
      {
        src: logoSrc,
        alt: "Talyn",
        style: { height, width: "auto", display: "block" }
      }
    );
  }
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
    /* @__PURE__ */ jsxs("div", { style: { position: "relative", width: height, height }, children: [
      /* @__PURE__ */ jsx(
        "div",
        {
          style: {
            position: "absolute",
            bottom: 0,
            left: 0,
            width: height * 0.6,
            height: height * 0.6,
            background: CYAN,
            borderRadius: 2
          }
        }
      ),
      /* @__PURE__ */ jsx(
        "div",
        {
          style: {
            position: "absolute",
            top: 0,
            right: 0,
            width: height * 0.7,
            height: height * 0.7,
            background: BRAND,
            borderRadius: 2
          }
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(
        "div",
        {
          style: {
            fontSize: height * 0.65,
            fontWeight: 400,
            color: DARK,
            letterSpacing: -0.5,
            lineHeight: 1,
            fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
          },
          children: "Talyn"
        }
      ),
      /* @__PURE__ */ jsx(
        "div",
        {
          style: {
            fontSize: height * 0.2,
            fontWeight: 400,
            color: GRAY,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginTop: 1
          },
          children: "Global Talent Solutions"
        }
      )
    ] })
  ] });
}
function formatMoney(n) {
  if (n == null) return "0.00";
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function formatNPR(n) {
  if (n == null) return "\u2014";
  const [int, dec] = Number(n).toFixed(2).split(".");
  const lastThree = int.slice(-3);
  const rest = int.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + (rest ? "," : "") + lastThree;
  return `${formatted}.${dec}`;
}
function formatRate(rate) {
  return `${(parseFloat(rate) * 100).toFixed(0)}%`;
}
function DocHeader({ logoSrc, docType, docNumber, date, validUntil, quoteTitle }) {
  return /* @__PURE__ */ jsx("table", { style: { width: "100%", borderCollapse: "collapse", marginBottom: 16 }, children: /* @__PURE__ */ jsx("tbody", { children: /* @__PURE__ */ jsxs("tr", { children: [
    /* @__PURE__ */ jsxs("td", { style: { verticalAlign: "top" }, children: [
      /* @__PURE__ */ jsx(TalynLogo, { logoSrc, height: 44 }),
      /* @__PURE__ */ jsx(
        "div",
        {
          style: {
            marginTop: 6,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 2,
            fontWeight: 600,
            color: BRAND
          },
          children: docType
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("td", { style: { textAlign: "right", verticalAlign: "top", fontSize: 12, color: GRAY }, children: [
      /* @__PURE__ */ jsxs("div", { style: { marginBottom: 6 }, children: [
        /* @__PURE__ */ jsx("span", { style: { color: "#9ca3af" }, children: "Quote # " }),
        /* @__PURE__ */ jsx("span", { style: { color: DARK, fontWeight: 600 }, children: docNumber })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { marginBottom: 4 }, children: [
        /* @__PURE__ */ jsx("span", { style: { color: "#9ca3af" }, children: "Date " }),
        /* @__PURE__ */ jsx("span", { style: { color: DARK }, children: date })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { style: { color: "#9ca3af" }, children: "Valid until " }),
        /* @__PURE__ */ jsx("span", { style: { color: DARK }, children: validUntil })
      ] })
    ] })
  ] }) }) });
}
function InfoGrid({ rows, columns = 2 }) {
  const rowGroups = [];
  for (let i = 0; i < rows.length; i += columns) {
    rowGroups.push(rows.slice(i, i + columns));
  }
  const colWidth = `${Math.floor(100 / columns)}%`;
  return /* @__PURE__ */ jsx(
    "table",
    {
      style: {
        width: "100%",
        borderCollapse: "collapse",
        background: LIGHT_GRAY,
        borderRadius: 8,
        marginBottom: 24
      },
      children: /* @__PURE__ */ jsx("tbody", { children: rowGroups.map((group, gi) => /* @__PURE__ */ jsxs("tr", { children: [
        group.map(([label, value], ci) => /* @__PURE__ */ jsx(
          "td",
          {
            style: {
              width: colWidth,
              padding: "6px 20px",
              fontSize: 12,
              verticalAlign: "top"
            },
            children: /* @__PURE__ */ jsx("table", { style: { width: "100%", borderCollapse: "collapse" }, children: /* @__PURE__ */ jsx("tbody", { children: /* @__PURE__ */ jsxs("tr", { children: [
              /* @__PURE__ */ jsx("td", { style: { color: GRAY, textAlign: "left" }, children: label }),
              /* @__PURE__ */ jsx("td", { style: { fontWeight: 400, color: DARK, textAlign: "right" }, children: value || "\u2014" })
            ] }) }) })
          },
          ci
        )),
        group.length < columns && Array.from({ length: columns - group.length }).map((_, ei) => /* @__PURE__ */ jsx("td", { style: { width: colWidth } }, `empty-${ei}`))
      ] }, gi)) })
    }
  );
}
function CostTable({ rows, header, accentColor = BRAND }) {
  return /* @__PURE__ */ jsxs("div", { style: { marginBottom: 24 }, children: [
    /* @__PURE__ */ jsx(
      "div",
      {
        style: {
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: 1.5,
          color: accentColor,
          fontWeight: 700,
          padding: "8px 12px",
          background: accentColor === BRAND ? BRAND_BG : "#f0fdf4",
          borderRadius: "6px 6px 0 0",
          borderBottom: `2px solid ${accentColor}`
        },
        children: header
      }
    ),
    /* @__PURE__ */ jsx(
      "table",
      {
        style: { width: "100%", borderCollapse: "collapse" },
        children: /* @__PURE__ */ jsx("tbody", { children: rows.map((row, i) => /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsxs(
            "td",
            {
              style: {
                padding: "10px 12px",
                fontSize: 13,
                color: row.isTotal ? DARK : "#4b5563",
                fontWeight: row.isTotal ? 700 : 400,
                borderBottom: row.isTotal ? `2px solid ${DARK}` : `1px solid #f3f4f6`,
                borderTop: row.isTotal ? `2px solid ${DARK}` : "none"
              },
              children: [
                row.label,
                row.detail && /* @__PURE__ */ jsx("span", { style: { color: "#9ca3af", fontSize: 11, marginLeft: 6 }, children: row.detail })
              ]
            }
          ),
          /* @__PURE__ */ jsx(
            "td",
            {
              style: {
                padding: "10px 12px",
                fontSize: row.isTotal ? 15 : 13,
                fontWeight: row.isTotal ? 700 : 400,
                textAlign: "right",
                color: DARK,
                borderBottom: row.isTotal ? `2px solid ${DARK}` : `1px solid #f3f4f6`,
                borderTop: row.isTotal ? `2px solid ${DARK}` : "none"
              },
              children: row.amount
            }
          )
        ] }, i)) })
      }
    )
  ] });
}
function DocFooter({ refNumber }) {
  return /* @__PURE__ */ jsxs(
    "div",
    {
      style: {
        marginTop: 32,
        paddingTop: 16,
        borderTop: `1px solid ${BORDER}`
      },
      children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: 11, color: "#9ca3af", lineHeight: 1.6, marginBottom: 12 }, children: "This quote is valid for 30 days from the date of issue. Rates are based on current Nepal Social Security Fund (SSF) regulations under the Social Security Act 2018. Actual costs may vary based on regulatory changes. This quote does not constitute a binding contract." }),
        /* @__PURE__ */ jsx("table", { style: { width: "100%", borderCollapse: "collapse" }, children: /* @__PURE__ */ jsx("tbody", { children: /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("td", { style: { fontSize: 11, color: "#9ca3af", textAlign: "left" }, children: "Talyn Global LLC (DBA Talyn LLC) \xB7 Tyler, TX 75701" }),
          refNumber && /* @__PURE__ */ jsxs("td", { style: { fontSize: 11, color: "#9ca3af", textAlign: "right" }, children: [
            "Ref: ",
            refNumber
          ] })
        ] }) }) })
      ]
    }
  );
}
function QuoteDocument({
  logoSrc,
  quoteNumber,
  date,
  validUntil,
  orgName,
  generatedBy,
  employee,
  costs,
  status = "draft",
  refNumber
}) {
  const cur = costs.currency || "NPR";
  const statusBadge = status === "accepted" ? { text: "Accepted", bg: "#059669", color: "#fff" } : status === "expired" ? { text: "Expired", bg: "#dc2626", color: "#fff" } : { text: "Draft", bg: "#f3f4f6", color: GRAY };
  return /* @__PURE__ */ jsxs("div", { style: { ...baseFont, maxWidth: 680, margin: "0 auto", padding: "24px 32px" }, children: [
    /* @__PURE__ */ jsx(
      DocHeader,
      {
        logoSrc,
        docType: "EOR Cost Quote",
        docNumber: quoteNumber,
        date,
        validUntil
      }
    ),
    /* @__PURE__ */ jsx("table", { style: { width: "100%", borderCollapse: "collapse", marginBottom: 24 }, children: /* @__PURE__ */ jsx("tbody", { children: /* @__PURE__ */ jsxs("tr", { children: [
      /* @__PURE__ */ jsxs("td", { style: { verticalAlign: "middle" }, children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            style: {
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: "#9ca3af",
              fontWeight: 600,
              marginBottom: 4
            },
            children: "Prepared for"
          }
        ),
        /* @__PURE__ */ jsx("div", { style: { fontSize: 18, fontWeight: 600, color: DARK }, children: orgName }),
        /* @__PURE__ */ jsxs("div", { style: { fontSize: 12, color: GRAY, marginTop: 2 }, children: [
          "Generated by: ",
          generatedBy
        ] })
      ] }),
      /* @__PURE__ */ jsx("td", { style: { textAlign: "right", verticalAlign: "middle" }, children: /* @__PURE__ */ jsx(
        "div",
        {
          style: {
            display: "inline-block",
            padding: "6px 16px",
            background: statusBadge.bg,
            color: statusBadge.color,
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1
          },
          children: statusBadge.text
        }
      ) })
    ] }) }) }),
    /* @__PURE__ */ jsx("hr", { style: { border: "none", borderTop: `1px solid ${BORDER}`, margin: "0 0 24px" } }),
    /* @__PURE__ */ jsx(
      "div",
      {
        style: {
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: 2,
          color: BRAND,
          fontWeight: 700,
          marginBottom: 12
        },
        children: "Employee details"
      }
    ),
    /* @__PURE__ */ jsx(
      InfoGrid,
      {
        rows: [
          ["Name", employee.name],
          ["Email", employee.email],
          ["Role", employee.role],
          ["Department", employee.department],
          ["Employment type", employee.employmentType || "Full time"],
          ["Start date", employee.startDate],
          ["Pay frequency", employee.payFrequency || "Monthly"],
          ["Country", employee.country || "Nepal"]
        ]
      }
    ),
    /* @__PURE__ */ jsx(
      CostTable,
      {
        header: "Monthly employer cost breakdown",
        rows: [
          {
            label: "Employee gross salary",
            amount: `${cur} ${formatNPR(costs.monthlyGross)}`
          },
          {
            label: "Employer SSF contribution",
            detail: `(${formatRate(costs.employerSsfRate)} of ${costs.basicSalaryRatio ? (costs.basicSalaryRatio * 100).toFixed(0) + "% basic" : "60% basic"})`,
            amount: `${cur} ${formatNPR(costs.employerSsf)}`
          },
          ...costs.severance ? [{
            label: "Severance accrual",
            detail: "(basic salary / 12)",
            amount: `${cur} ${formatNPR(costs.severance)}`
          }] : [],
          {
            label: "Total monthly company cost",
            amount: `${cur} ${formatNPR(costs.subtotalLocal)}`,
            isTotal: true
          },
          ...costs.monthlyCostUsd ? [{
            label: "Total monthly company cost (USD)",
            amount: `USD $${formatMoney(costs.monthlyCostUsd)}`,
            isTotal: true
          }] : [],
          {
            label: "Talyn platform fee",
            detail: "(included in USD total above)",
            amount: `USD $${formatMoney(costs.platformFee)} /mo`
          }
        ]
      }
    ),
    /* @__PURE__ */ jsx(
      CostTable,
      {
        header: "Reference: employee deductions (not billed to you)",
        accentColor: "#9ca3af",
        rows: [
          {
            label: "Employee SSF deduction",
            detail: `(${formatRate(costs.employeeSsfRate)} of ${costs.basicSalaryRatio ? (costs.basicSalaryRatio * 100).toFixed(0) + "% basic" : "60% basic"})`,
            amount: `${cur} ${formatNPR(costs.employeeSsf)}`
          },
          {
            label: "Estimated net salary (before income tax)",
            amount: `${cur} ${formatNPR(costs.estimatedNetSalary)}`
          }
        ]
      }
    ),
    /* @__PURE__ */ jsx(
      CostTable,
      {
        header: "Annual cost estimate",
        rows: [
          {
            label: "Annual salary + SSF + severance",
            amount: `${cur} ${formatNPR(costs.annualCostLocal)}`
          },
          ...costs.thirteenthMonth ? [{
            label: "13th month salary",
            amount: `${cur} ${formatNPR(costs.thirteenthMonth)}`
          }] : [],
          {
            label: "Annual platform fee",
            amount: `USD $${formatMoney(costs.annualPlatformFee)}`
          },
          ...costs.documentHandlingFee ? [{
            label: "Document handling fee",
            detail: "(annual)",
            amount: `USD $${formatMoney(costs.documentHandlingFee)}`
          }] : [],
          ...costs.totalAnnualCostUsd ? [{
            label: "Total annual company cost",
            amount: `USD $${formatMoney(costs.totalAnnualCostUsd)}`,
            isTotal: true
          }] : []
        ]
      }
    ),
    costs.exchangeRate && /* @__PURE__ */ jsxs(
      "div",
      {
        style: {
          fontSize: 11,
          color: "#9ca3af",
          marginBottom: 16,
          padding: "8px 12px",
          background: LIGHT_GRAY,
          borderRadius: 6
        },
        children: [
          "Exchange rate: 1 NPR = ",
          Number(costs.exchangeRate).toFixed(6),
          " USD. USD amounts are estimates and may vary with exchange rate fluctuations."
        ]
      }
    ),
    /* @__PURE__ */ jsx(DocFooter, { refNumber })
  ] });
}
function QuotePreview() {
  return /* @__PURE__ */ jsx("div", { style: { fontFamily: baseFont.fontFamily }, children: /* @__PURE__ */ jsx(
    QuoteDocument,
    {
      quoteNumber: "TQ-2026-003",
      date: "March 29, 2026",
      validUntil: "April 28, 2026",
      orgName: "EMA Engineering & Consulting, Inc.",
      generatedBy: "Washim Ahmed",
      employee: {
        name: "Aashish Katuwal",
        email: "aashish@ema-eng.com",
        role: "Energy/Sustainability Engineer I",
        department: "Engineering",
        employmentType: "Full time",
        startDate: "April 17, 2025",
        payFrequency: "Monthly",
        country: "Nepal (NPL)"
      },
      costs: {
        currency: "NPR",
        monthlyGross: 65e3,
        basicSalaryRatio: 0.6,
        employerSsf: 7800,
        employerSsfRate: "0.20",
        severance: 3250,
        subtotalLocal: 76050,
        platformFee: 499,
        employeeSsf: 4290,
        employeeSsfRate: "0.11",
        estimatedNetSalary: 60710,
        exchangeRate: 74e-4,
        monthlyGrossUsd: 481,
        monthlyCostUsd: 1061.77,
        totalAnnualCostUsd: 13302.24,
        annualCostLocal: 912600,
        annualPlatformFee: 5988,
        thirteenthMonth: 65e3,
        documentHandlingFee: 80
      },
      status: "draft"
    }
  ) });
}
export {
  QuoteDocument,
  TalynLogo,
  QuotePreview as default
};
