// ../frontend/src/components/FinancialDocuments.jsx
import { useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var BRAND = "#1a73e8";
var BRAND_DARK = "#0f4f9e";
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
var CYAN = "#00e5ff";
function TalynLogo({ logoSrc, size = 32 }) {
  const height = size;
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
function DocHeader({ logoSrc, docType, docNumber, issueDate, dueDate, paidDate }) {
  return /* @__PURE__ */ jsx("table", { style: { width: "100%", borderCollapse: "collapse", marginBottom: 16 }, children: /* @__PURE__ */ jsx("tbody", { children: /* @__PURE__ */ jsxs("tr", { children: [
    /* @__PURE__ */ jsxs("td", { style: { verticalAlign: "top" }, children: [
      /* @__PURE__ */ jsx(TalynLogo, { logoSrc, size: 44 }),
      /* @__PURE__ */ jsx(
        "div",
        {
          style: {
            marginTop: 6,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 2,
            fontWeight: 700,
            color: BRAND
          },
          children: docType
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("td", { style: { textAlign: "right", fontSize: 12, color: GRAY, verticalAlign: "top" }, children: [
      /* @__PURE__ */ jsxs("div", { style: { marginBottom: 6 }, children: [
        /* @__PURE__ */ jsx("span", { style: { color: "#9ca3af" }, children: "Document # " }),
        /* @__PURE__ */ jsx("span", { style: { color: DARK, fontWeight: 600 }, children: docNumber })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { marginBottom: 4 }, children: [
        /* @__PURE__ */ jsx("span", { style: { color: "#9ca3af" }, children: "Issue date " }),
        /* @__PURE__ */ jsx("span", { style: { color: DARK }, children: issueDate })
      ] }),
      dueDate && /* @__PURE__ */ jsxs("div", { style: { marginBottom: 4 }, children: [
        /* @__PURE__ */ jsx("span", { style: { color: "#9ca3af" }, children: "Due date " }),
        /* @__PURE__ */ jsx("span", { style: { color: DARK }, children: dueDate })
      ] }),
      paidDate && /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { style: { color: "#9ca3af" }, children: "Paid date " }),
        /* @__PURE__ */ jsx("span", { style: { color: DARK }, children: paidDate })
      ] })
    ] })
  ] }) }) });
}
function BillParties({ billFrom, billTo }) {
  const partyStyle = {
    padding: "16px 20px",
    background: LIGHT_GRAY,
    borderRadius: 8,
    fontSize: 12,
    width: "50%",
    verticalAlign: "top"
  };
  const labelStyle = {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#9ca3af",
    fontWeight: 600,
    marginBottom: 8
  };
  return /* @__PURE__ */ jsx("table", { style: { width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", marginBottom: 28 }, children: /* @__PURE__ */ jsx("tbody", { children: /* @__PURE__ */ jsxs("tr", { children: [
    /* @__PURE__ */ jsxs("td", { style: partyStyle, children: [
      /* @__PURE__ */ jsx("div", { style: labelStyle, children: "Bill from" }),
      /* @__PURE__ */ jsx("div", { style: { fontWeight: 600, marginBottom: 4 }, children: billFrom.name }),
      /* @__PURE__ */ jsxs("div", { style: { color: GRAY, lineHeight: 1.6 }, children: [
        billFrom.address,
        /* @__PURE__ */ jsx("br", {}),
        billFrom.cityStateZip,
        /* @__PURE__ */ jsx("br", {}),
        billFrom.country
      ] }),
      billFrom.phone && /* @__PURE__ */ jsx("div", { style: { color: GRAY, marginTop: 4 }, children: billFrom.phone })
    ] }),
    /* @__PURE__ */ jsxs("td", { style: partyStyle, children: [
      /* @__PURE__ */ jsx("div", { style: labelStyle, children: "Bill to" }),
      /* @__PURE__ */ jsx("div", { style: { fontWeight: 600, marginBottom: 4 }, children: billTo.name }),
      /* @__PURE__ */ jsxs("div", { style: { color: GRAY, lineHeight: 1.6 }, children: [
        billTo.address,
        /* @__PURE__ */ jsx("br", {}),
        billTo.cityStateZip,
        /* @__PURE__ */ jsx("br", {}),
        billTo.country
      ] }),
      billTo.vatId && /* @__PURE__ */ jsxs("div", { style: { color: GRAY, marginTop: 4 }, children: [
        "VAT ID: ",
        billTo.vatId
      ] })
    ] })
  ] }) }) });
}
function TotalBadge({ label, amount, currency = "USD", status }) {
  const isGreen = status === "paid";
  return /* @__PURE__ */ jsx(
    "table",
    {
      style: {
        width: "100%",
        borderCollapse: "collapse",
        padding: "20px 24px",
        background: isGreen ? "#ecfdf5" : BRAND_BG,
        borderRadius: 10,
        border: `1px solid ${isGreen ? "#a7f3d0" : "#bfdbfe"}`,
        marginBottom: 28
      },
      children: /* @__PURE__ */ jsx("tbody", { children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsxs("td", { style: { padding: "20px 24px", verticalAlign: "middle" }, children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              style: {
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                color: isGreen ? "#047857" : BRAND_DARK,
                fontWeight: 600,
                marginBottom: 4
              },
              children: label
            }
          ),
          /* @__PURE__ */ jsxs(
            "div",
            {
              style: {
                fontSize: 28,
                fontWeight: 700,
                color: isGreen ? "#065f46" : BRAND_DARK,
                letterSpacing: -0.5
              },
              children: [
                currency,
                " $",
                formatMoney(amount)
              ]
            }
          )
        ] }),
        status === "paid" && /* @__PURE__ */ jsx("td", { style: { padding: "20px 24px", textAlign: "right", verticalAlign: "middle" }, children: /* @__PURE__ */ jsx(
          "div",
          {
            style: {
              display: "inline-block",
              padding: "6px 16px",
              background: "#059669",
              color: "#fff",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1
            },
            children: "Paid"
          }
        ) })
      ] }) })
    }
  );
}
function SummaryTable({ rows, totalLabel = "Total due", totalAmount }) {
  return /* @__PURE__ */ jsxs("table", { style: { width: "100%", borderCollapse: "collapse", marginBottom: 24 }, children: [
    /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
      /* @__PURE__ */ jsx("th", { style: thStyle, children: "Summary" }),
      /* @__PURE__ */ jsx("th", { style: { ...thStyle, textAlign: "right" }, children: "Amount" })
    ] }) }),
    /* @__PURE__ */ jsx("tbody", { children: rows.map((row, i) => /* @__PURE__ */ jsxs("tr", { children: [
      /* @__PURE__ */ jsx("td", { style: { ...tdStyle, background: i % 2 === 0 ? "#fff" : LIGHT_GRAY }, children: row.label }),
      /* @__PURE__ */ jsxs(
        "td",
        {
          style: {
            ...tdStyle,
            textAlign: "right",
            background: i % 2 === 0 ? "#fff" : LIGHT_GRAY
          },
          children: [
            "$",
            formatMoney(row.amount)
          ]
        }
      )
    ] }, i)) }),
    /* @__PURE__ */ jsx("tfoot", { children: /* @__PURE__ */ jsxs("tr", { children: [
      /* @__PURE__ */ jsx("td", { style: { ...tdStyle, fontWeight: 700, borderTop: `2px solid ${DARK}` }, children: totalLabel }),
      /* @__PURE__ */ jsxs(
        "td",
        {
          style: {
            ...tdStyle,
            textAlign: "right",
            fontWeight: 700,
            borderTop: `2px solid ${DARK}`,
            fontSize: 15
          },
          children: [
            "$",
            formatMoney(totalAmount)
          ]
        }
      )
    ] }) })
  ] });
}
function ExchangeRateNote({ fromCurrency, toCurrency, rate }) {
  return /* @__PURE__ */ jsxs(
    "div",
    {
      style: {
        fontSize: 11,
        color: "#9ca3af",
        padding: "12px 16px",
        background: LIGHT_GRAY,
        borderRadius: 6,
        marginBottom: 20
      },
      children: [
        "Exchange rate: ",
        fromCurrency,
        " 1.00 = ",
        toCurrency,
        " $",
        rate,
        " \xB7 This includes a standard exchange rate and coverage for currency changes and operational costs."
      ]
    }
  );
}
function EmployeeSection({ employee, isDetailed = false }) {
  return /* @__PURE__ */ jsxs(
    "div",
    {
      style: {
        marginBottom: 20,
        padding: "16px 20px",
        border: `1px solid ${BORDER}`,
        borderRadius: 8
      },
      children: [
        /* @__PURE__ */ jsx(
          "table",
          {
            style: {
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: isDetailed ? 12 : 0
            },
            children: /* @__PURE__ */ jsx("tbody", { children: /* @__PURE__ */ jsxs("tr", { children: [
              /* @__PURE__ */ jsxs("td", { style: { verticalAlign: "middle" }, children: [
                /* @__PURE__ */ jsx("span", { style: { fontWeight: 600, fontSize: 13 }, children: employee.name }),
                employee.role && /* @__PURE__ */ jsxs("span", { style: { color: GRAY, fontSize: 12, marginLeft: 8 }, children: [
                  "\u2014 ",
                  employee.role
                ] })
              ] }),
              employee.invoiceNumber && /* @__PURE__ */ jsx("td", { style: { fontSize: 11, color: "#9ca3af", textAlign: "right", verticalAlign: "middle" }, children: employee.invoiceNumber })
            ] }) })
          }
        ),
        isDetailed && employee.lineItems && /* @__PURE__ */ jsxs(Fragment, { children: [
          employee.period && /* @__PURE__ */ jsxs(
            "div",
            {
              style: {
                fontSize: 11,
                color: GRAY,
                marginBottom: 10,
                paddingBottom: 10,
                borderBottom: `1px solid ${BORDER}`
              },
              children: [
                "Invoice for work between ",
                employee.period
              ]
            }
          ),
          /* @__PURE__ */ jsx("table", { style: { width: "100%", borderCollapse: "collapse" }, children: /* @__PURE__ */ jsx("tbody", { children: employee.lineItems.map((item, i) => /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsxs(
              "td",
              {
                style: {
                  padding: "6px 0",
                  fontSize: 12,
                  color: DARK,
                  borderBottom: i < employee.lineItems.length - 1 ? `1px solid #f3f4f6` : "none"
                },
                children: [
                  /* @__PURE__ */ jsx("div", { children: item.description }),
                  item.detail && /* @__PURE__ */ jsx("div", { style: { fontSize: 11, color: "#9ca3af", marginTop: 2 }, children: item.detail })
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              "td",
              {
                style: {
                  padding: "6px 0",
                  fontSize: 12,
                  textAlign: "right",
                  whiteSpace: "nowrap",
                  borderBottom: i < employee.lineItems.length - 1 ? `1px solid #f3f4f6` : "none"
                },
                children: [
                  item.amountNPR && /* @__PURE__ */ jsxs("div", { style: { color: GRAY, fontSize: 11 }, children: [
                    "NPR ",
                    formatMoney(item.amountNPR)
                  ] }),
                  /* @__PURE__ */ jsxs("div", { style: { fontWeight: 400 }, children: [
                    "USD $",
                    formatMoney(item.amountUSD)
                  ] })
                ]
              }
            )
          ] }, i)) }) }),
          /* @__PURE__ */ jsx(
            "table",
            {
              style: {
                width: "100%",
                borderCollapse: "collapse",
                marginTop: 10,
                paddingTop: 10,
                borderTop: `2px solid ${BORDER}`,
                fontWeight: 700,
                fontSize: 13
              },
              children: /* @__PURE__ */ jsx("tbody", { children: /* @__PURE__ */ jsxs("tr", { children: [
                /* @__PURE__ */ jsx("td", { style: { paddingTop: 10 }, children: "Total" }),
                /* @__PURE__ */ jsxs("td", { style: { textAlign: "right", paddingTop: 10 }, children: [
                  "$",
                  formatMoney(employee.total)
                ] })
              ] }) })
            }
          )
        ] }),
        !isDetailed && /* @__PURE__ */ jsx("table", { style: { width: "100%", borderCollapse: "collapse", marginTop: 10 }, children: /* @__PURE__ */ jsxs("tbody", { children: [
          employee.lineItems?.map((item, i) => /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("td", { style: { padding: "4px 0", fontSize: 12, color: GRAY }, children: item.description }),
            /* @__PURE__ */ jsxs(
              "td",
              {
                style: {
                  padding: "4px 0",
                  fontSize: 12,
                  textAlign: "right",
                  fontWeight: 400
                },
                children: [
                  "USD $",
                  formatMoney(item.amountUSD)
                ]
              }
            )
          ] }, i)),
          /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx(
              "td",
              {
                style: {
                  padding: "6px 0 0",
                  fontSize: 12,
                  fontWeight: 600,
                  borderTop: `1px solid ${BORDER}`
                },
                children: "Total"
              }
            ),
            /* @__PURE__ */ jsxs(
              "td",
              {
                style: {
                  padding: "6px 0 0",
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: "right",
                  borderTop: `1px solid ${BORDER}`
                },
                children: [
                  "$",
                  formatMoney(employee.total)
                ]
              }
            )
          ] })
        ] }) })
      ]
    }
  );
}
function DocFooter({ refNumber }) {
  return /* @__PURE__ */ jsx(
    "table",
    {
      style: {
        width: "100%",
        borderCollapse: "collapse",
        marginTop: 32,
        paddingTop: 16,
        borderTop: `1px solid ${BORDER}`,
        fontSize: 11,
        color: "#9ca3af"
      },
      children: /* @__PURE__ */ jsx("tbody", { children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("td", { style: { paddingTop: 16 }, children: "Talyn Global LLC (DBA Talyn LLC) \xB7 Tyler, TX 75701" }),
        refNumber && /* @__PURE__ */ jsxs("td", { style: { textAlign: "right", paddingTop: 16 }, children: [
          "Ref: ",
          refNumber
        ] })
      ] }) })
    }
  );
}
function InvoiceDocument({
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
  refNumber
}) {
  return /* @__PURE__ */ jsxs("div", { style: { ...baseFont, maxWidth: 680, margin: "0 auto", padding: "24px 32px" }, children: [
    /* @__PURE__ */ jsx(
      DocHeader,
      {
        logoSrc,
        docType: "Invoice",
        docNumber,
        issueDate,
        dueDate
      }
    ),
    /* @__PURE__ */ jsx(BillParties, { billFrom, billTo }),
    /* @__PURE__ */ jsx(TotalBadge, { label: "Total due", amount: totalDue }),
    /* @__PURE__ */ jsx(
      SummaryTable,
      {
        rows: summaryRows,
        totalLabel: "Total due",
        totalAmount: totalDue
      }
    ),
    variant === "detail" && /* @__PURE__ */ jsxs(Fragment, { children: [
      paymentDetails && /* @__PURE__ */ jsx(
        ExchangeRateNote,
        {
          fromCurrency: paymentDetails.exchangeFrom,
          toCurrency: paymentDetails.exchangeTo,
          rate: paymentDetails.exchangeRate
        }
      ),
      /* @__PURE__ */ jsx(
        "div",
        {
          style: {
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: 2,
            color: BRAND,
            fontWeight: 700,
            marginBottom: 16,
            marginTop: 28
          },
          children: "Platform fees"
        }
      ),
      platformFees.map((emp, i) => /* @__PURE__ */ jsx(EmployeeSection, { employee: emp, isDetailed: false }, i)),
      /* @__PURE__ */ jsx(
        "div",
        {
          style: {
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: 2,
            color: BRAND,
            fontWeight: 700,
            marginBottom: 16,
            marginTop: 28
          },
          children: "Employee payroll"
        }
      ),
      employees.map((emp, i) => /* @__PURE__ */ jsx(EmployeeSection, { employee: emp, isDetailed: true }, i))
    ] }),
    /* @__PURE__ */ jsx(DocFooter, { refNumber })
  ] });
}
function ReceiptDocument({
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
  refNumber
}) {
  return /* @__PURE__ */ jsxs("div", { style: { ...baseFont, maxWidth: 680, margin: "0 auto", padding: "24px 32px" }, children: [
    /* @__PURE__ */ jsx(
      DocHeader,
      {
        logoSrc,
        docType: "Receipt",
        docNumber,
        issueDate,
        paidDate
      }
    ),
    /* @__PURE__ */ jsx(BillParties, { billFrom, billTo }),
    /* @__PURE__ */ jsx(TotalBadge, { label: "Final amount", amount: totalPaid, status: "paid" }),
    /* @__PURE__ */ jsx(
      SummaryTable,
      {
        rows: summaryRows,
        totalLabel: "Total paid",
        totalAmount: totalPaid
      }
    ),
    variant === "detail" && /* @__PURE__ */ jsxs(Fragment, { children: [
      paymentDetails && /* @__PURE__ */ jsx(
        ExchangeRateNote,
        {
          fromCurrency: paymentDetails.exchangeFrom,
          toCurrency: paymentDetails.exchangeTo,
          rate: paymentDetails.exchangeRate
        }
      ),
      /* @__PURE__ */ jsx("div", { style: sectionLabel, children: "Platform fees" }),
      platformFees.map((emp, i) => /* @__PURE__ */ jsx(EmployeeSection, { employee: emp, isDetailed: false }, i)),
      /* @__PURE__ */ jsx("div", { style: sectionLabel, children: "Employee payroll" }),
      employees.map((emp, i) => /* @__PURE__ */ jsx(EmployeeSection, { employee: emp, isDetailed: true }, i))
    ] }),
    /* @__PURE__ */ jsx(DocFooter, { refNumber })
  ] });
}
function PayslipDocument({
  logoSrc,
  period,
  employee,
  incomeItems,
  deductionItems,
  totalGross,
  totalDeductions,
  netSalary
}) {
  const infoRows = [
    ["Employee name", employee.name],
    ["Employee ID", employee.oid],
    ["Date of joining", employee.joinDate],
    ["Designation", employee.designation],
    ["PAN", employee.pan],
    ["Bank account", employee.bankAccount ? `****${employee.bankAccount.slice(-4)}` : "\u2014"],
    ["Bank name", employee.bankName]
  ];
  return /* @__PURE__ */ jsxs("div", { style: { ...baseFont, maxWidth: 680, margin: "0 auto", padding: "24px 32px" }, children: [
    /* @__PURE__ */ jsx("table", { style: { width: "100%", borderCollapse: "collapse", marginBottom: 24 }, children: /* @__PURE__ */ jsx("tbody", { children: /* @__PURE__ */ jsxs("tr", { children: [
      /* @__PURE__ */ jsx("td", { style: { verticalAlign: "top" }, children: /* @__PURE__ */ jsx(TalynLogo, { logoSrc, size: 44 }) }),
      /* @__PURE__ */ jsxs("td", { style: { textAlign: "right", verticalAlign: "top" }, children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            style: {
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 2,
              fontWeight: 700,
              color: BRAND,
              marginBottom: 4
            },
            children: "Payslip"
          }
        ),
        /* @__PURE__ */ jsx("div", { style: { fontSize: 18, fontWeight: 600, color: DARK }, children: period })
      ] })
    ] }) }) }),
    /* @__PURE__ */ jsx(
      "div",
      {
        style: {
          background: LIGHT_GRAY,
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 24
        },
        children: /* @__PURE__ */ jsx("table", { style: { width: "100%", borderCollapse: "collapse" }, children: /* @__PURE__ */ jsx("tbody", { children: (() => {
          const rows = [];
          for (let i = 0; i < infoRows.length; i += 2) {
            rows.push(
              /* @__PURE__ */ jsxs("tr", { children: [
                /* @__PURE__ */ jsx("td", { style: { fontSize: 12, color: GRAY, padding: "4px 0", width: "25%" }, children: infoRows[i][0] }),
                /* @__PURE__ */ jsx("td", { style: { fontSize: 12, fontWeight: 400, padding: "4px 16px 4px 0", width: "25%" }, children: infoRows[i][1] }),
                infoRows[i + 1] && /* @__PURE__ */ jsxs(Fragment, { children: [
                  /* @__PURE__ */ jsx("td", { style: { fontSize: 12, color: GRAY, padding: "4px 0", width: "25%" }, children: infoRows[i + 1][0] }),
                  /* @__PURE__ */ jsx("td", { style: { fontSize: 12, fontWeight: 400, padding: "4px 0", width: "25%" }, children: infoRows[i + 1][1] })
                ] })
              ] }, i)
            );
          }
          return rows;
        })() }) })
      }
    ),
    /* @__PURE__ */ jsx("table", { style: { width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", marginBottom: 4 }, children: /* @__PURE__ */ jsx("tbody", { children: /* @__PURE__ */ jsxs("tr", { children: [
      /* @__PURE__ */ jsxs("td", { style: { width: "50%", verticalAlign: "top", padding: 0 }, children: [
        /* @__PURE__ */ jsx("div", { style: payslipColHeader, children: "Income" }),
        /* @__PURE__ */ jsx("table", { style: { width: "100%", borderCollapse: "collapse" }, children: /* @__PURE__ */ jsxs("tbody", { children: [
          incomeItems.map((item, i) => /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("td", { style: payslipTd, children: item.label }),
            /* @__PURE__ */ jsx("td", { style: { ...payslipTd, textAlign: "right", fontWeight: 400 }, children: item.amount != null ? formatNPR(item.amount) : "\u2014" })
          ] }, i)),
          /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("td", { style: payslipTotalTd, children: "Total gross salary" }),
            /* @__PURE__ */ jsx("td", { style: { ...payslipTotalTd, textAlign: "right" }, children: formatNPR(totalGross) })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("td", { style: { width: "50%", verticalAlign: "top", padding: 0 }, children: [
        /* @__PURE__ */ jsx("div", { style: payslipColHeader, children: "Deductions" }),
        /* @__PURE__ */ jsx("table", { style: { width: "100%", borderCollapse: "collapse" }, children: /* @__PURE__ */ jsxs("tbody", { children: [
          deductionItems.map((item, i) => /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("td", { style: payslipTd, children: item.label }),
            /* @__PURE__ */ jsx("td", { style: { ...payslipTd, textAlign: "right", fontWeight: 400 }, children: item.amount != null ? formatNPR(item.amount) : "\u2014" })
          ] }, i)),
          deductionItems.length < incomeItems.length && Array.from({ length: incomeItems.length - deductionItems.length }).map(
            (_, i) => /* @__PURE__ */ jsxs("tr", { children: [
              /* @__PURE__ */ jsx("td", { style: payslipTd, children: "\xA0" }),
              /* @__PURE__ */ jsx("td", { style: payslipTd, children: "\xA0" })
            ] }, `pad-${i}`)
          ),
          /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("td", { style: payslipTotalTd, children: "Total deductions" }),
            /* @__PURE__ */ jsx("td", { style: { ...payslipTotalTd, textAlign: "right" }, children: formatNPR(totalDeductions) })
          ] })
        ] }) })
      ] })
    ] }) }) }),
    /* @__PURE__ */ jsx(
      "table",
      {
        style: {
          width: "100%",
          borderCollapse: "collapse",
          marginTop: 4,
          background: BRAND_BG,
          borderRadius: 8,
          border: `1px solid #bfdbfe`
        },
        children: /* @__PURE__ */ jsx("tbody", { children: /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("td", { style: { padding: "16px 24px", fontWeight: 700, fontSize: 15, color: BRAND_DARK }, children: "Total net salary" }),
          /* @__PURE__ */ jsxs("td", { style: { padding: "16px 24px", fontWeight: 700, fontSize: 22, color: BRAND_DARK, textAlign: "right" }, children: [
            "NPR ",
            formatNPR(netSalary)
          ] })
        ] }) })
      }
    ),
    /* @__PURE__ */ jsx(DocFooter, {})
  ] });
}
function PlatformFeeInvoice({
  logoSrc,
  docNumber,
  issueDate,
  dueDate,
  billFrom,
  billTo,
  employee,
  platformFee,
  totalDue,
  refNumber
}) {
  return /* @__PURE__ */ jsxs("div", { style: { ...baseFont, maxWidth: 680, margin: "0 auto", padding: "24px 32px" }, children: [
    /* @__PURE__ */ jsx(
      DocHeader,
      {
        logoSrc,
        docType: "Invoice",
        docNumber,
        issueDate,
        dueDate
      }
    ),
    /* @__PURE__ */ jsx(BillParties, { billFrom, billTo }),
    /* @__PURE__ */ jsx(TotalBadge, { label: "Total due", amount: totalDue }),
    /* @__PURE__ */ jsxs(
      "div",
      {
        style: {
          padding: "12px 16px",
          background: LIGHT_GRAY,
          borderRadius: 6,
          marginBottom: 20,
          fontSize: 12
        },
        children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#9ca3af", fontWeight: 600, marginBottom: 6 }, children: "Employee" }),
          /* @__PURE__ */ jsx("span", { style: { fontWeight: 600, color: DARK }, children: employee.name }),
          employee.jobTitle && /* @__PURE__ */ jsxs("span", { style: { color: GRAY, marginLeft: 8 }, children: [
            "\u2014 ",
            employee.jobTitle
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxs("table", { style: { width: "100%", borderCollapse: "collapse", marginBottom: 24 }, children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { style: thStyle, children: "Description" }),
        /* @__PURE__ */ jsx("th", { style: { ...thStyle, textAlign: "right" }, children: "Amount" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("td", { style: tdStyle, children: "EOR platform fee" }),
        /* @__PURE__ */ jsxs("td", { style: { ...tdStyle, textAlign: "right" }, children: [
          "$",
          formatMoney(platformFee)
        ] })
      ] }) }),
      /* @__PURE__ */ jsx("tfoot", { children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("td", { style: { ...tdStyle, fontWeight: 700, borderTop: `2px solid ${DARK}` }, children: "Total due" }),
        /* @__PURE__ */ jsxs(
          "td",
          {
            style: {
              ...tdStyle,
              textAlign: "right",
              fontWeight: 700,
              borderTop: `2px solid ${DARK}`,
              fontSize: 15
            },
            children: [
              "$",
              formatMoney(totalDue)
            ]
          }
        )
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(DocFooter, { refNumber })
  ] });
}
function PlatformFeeReceipt({
  logoSrc,
  docNumber,
  issueDate,
  paidDate,
  billFrom,
  billTo,
  employee,
  platformFee,
  totalPaid,
  refNumber
}) {
  return /* @__PURE__ */ jsxs("div", { style: { ...baseFont, maxWidth: 680, margin: "0 auto", padding: "24px 32px" }, children: [
    /* @__PURE__ */ jsx(
      DocHeader,
      {
        logoSrc,
        docType: "Receipt",
        docNumber,
        issueDate,
        paidDate
      }
    ),
    /* @__PURE__ */ jsx(BillParties, { billFrom, billTo }),
    /* @__PURE__ */ jsx(TotalBadge, { label: "Total paid", amount: totalPaid, status: "paid" }),
    /* @__PURE__ */ jsxs(
      "div",
      {
        style: {
          padding: "12px 16px",
          background: LIGHT_GRAY,
          borderRadius: 6,
          marginBottom: 20,
          fontSize: 12
        },
        children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#9ca3af", fontWeight: 600, marginBottom: 6 }, children: "Employee" }),
          /* @__PURE__ */ jsx("span", { style: { fontWeight: 600, color: DARK }, children: employee.name }),
          employee.jobTitle && /* @__PURE__ */ jsxs("span", { style: { color: GRAY, marginLeft: 8 }, children: [
            "\u2014 ",
            employee.jobTitle
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxs("table", { style: { width: "100%", borderCollapse: "collapse", marginBottom: 24 }, children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { style: thStyle, children: "Description" }),
        /* @__PURE__ */ jsx("th", { style: { ...thStyle, textAlign: "right" }, children: "Amount" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("td", { style: tdStyle, children: "EOR platform fee" }),
        /* @__PURE__ */ jsxs("td", { style: { ...tdStyle, textAlign: "right" }, children: [
          "$",
          formatMoney(platformFee)
        ] })
      ] }) }),
      /* @__PURE__ */ jsx("tfoot", { children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("td", { style: { ...tdStyle, fontWeight: 700, borderTop: `2px solid ${DARK}` }, children: "Total paid" }),
        /* @__PURE__ */ jsxs(
          "td",
          {
            style: {
              ...tdStyle,
              textAlign: "right",
              fontWeight: 700,
              borderTop: `2px solid ${DARK}`,
              fontSize: 15
            },
            children: [
              "$",
              formatMoney(totalPaid)
            ]
          }
        )
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(DocFooter, { refNumber })
  ] });
}
function PerEmployeeInvoice({
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
  refNumber
}) {
  return /* @__PURE__ */ jsxs("div", { style: { ...baseFont, maxWidth: 680, margin: "0 auto", padding: "24px 32px" }, children: [
    /* @__PURE__ */ jsx(
      DocHeader,
      {
        logoSrc,
        docType: "Invoice",
        docNumber,
        issueDate,
        dueDate
      }
    ),
    /* @__PURE__ */ jsx(BillParties, { billFrom, billTo }),
    /* @__PURE__ */ jsx(TotalBadge, { label: "Total due", amount: totalDue }),
    /* @__PURE__ */ jsxs(
      "div",
      {
        style: {
          padding: "12px 16px",
          background: LIGHT_GRAY,
          borderRadius: 6,
          marginBottom: 20,
          fontSize: 12
        },
        children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#9ca3af", fontWeight: 600, marginBottom: 6 }, children: "Employee" }),
          /* @__PURE__ */ jsx("span", { style: { fontWeight: 600, color: DARK }, children: employee.name }),
          employee.jobTitle && /* @__PURE__ */ jsxs("span", { style: { color: GRAY, marginLeft: 8 }, children: [
            "\u2014 ",
            employee.jobTitle
          ] })
        ]
      }
    ),
    period && /* @__PURE__ */ jsxs(
      "div",
      {
        style: {
          fontSize: 11,
          color: GRAY,
          marginBottom: 16,
          paddingBottom: 10,
          borderBottom: `1px solid ${BORDER}`
        },
        children: [
          "Invoice for work between ",
          period
        ]
      }
    ),
    paymentDetails && /* @__PURE__ */ jsx(
      ExchangeRateNote,
      {
        fromCurrency: paymentDetails.exchangeFrom,
        toCurrency: paymentDetails.exchangeTo,
        rate: paymentDetails.exchangeRate
      }
    ),
    /* @__PURE__ */ jsxs("table", { style: { width: "100%", borderCollapse: "collapse", marginBottom: 24 }, children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { style: thStyle, children: "Description" }),
        /* @__PURE__ */ jsx("th", { style: { ...thStyle, textAlign: "right" }, children: "Amount" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: lineItems.map((item, i) => /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsxs("td", { style: { ...tdStyle, background: i % 2 === 0 ? "#fff" : LIGHT_GRAY }, children: [
          /* @__PURE__ */ jsx("div", { children: item.description }),
          item.detail && /* @__PURE__ */ jsx("div", { style: { fontSize: 11, color: "#9ca3af", marginTop: 2 }, children: item.detail })
        ] }),
        /* @__PURE__ */ jsxs(
          "td",
          {
            style: {
              ...tdStyle,
              textAlign: "right",
              background: i % 2 === 0 ? "#fff" : LIGHT_GRAY
            },
            children: [
              item.amountNPR != null && /* @__PURE__ */ jsxs("div", { style: { color: GRAY, fontSize: 11 }, children: [
                "NPR ",
                formatMoney(item.amountNPR)
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { fontWeight: 400 }, children: [
                "USD $",
                formatMoney(item.amountUSD)
              ] })
            ]
          }
        )
      ] }, i)) }),
      /* @__PURE__ */ jsx("tfoot", { children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("td", { style: { ...tdStyle, fontWeight: 700, borderTop: `2px solid ${DARK}` }, children: "Total due" }),
        /* @__PURE__ */ jsxs(
          "td",
          {
            style: {
              ...tdStyle,
              textAlign: "right",
              fontWeight: 700,
              borderTop: `2px solid ${DARK}`,
              fontSize: 15
            },
            children: [
              "$",
              formatMoney(totalDue)
            ]
          }
        )
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(DocFooter, { refNumber })
  ] });
}
function PerEmployeeReceipt({
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
  refNumber
}) {
  return /* @__PURE__ */ jsxs("div", { style: { ...baseFont, maxWidth: 680, margin: "0 auto", padding: "24px 32px" }, children: [
    /* @__PURE__ */ jsx(
      DocHeader,
      {
        logoSrc,
        docType: "Receipt",
        docNumber,
        issueDate,
        paidDate
      }
    ),
    /* @__PURE__ */ jsx(BillParties, { billFrom, billTo }),
    /* @__PURE__ */ jsx(TotalBadge, { label: "Total paid", amount: totalPaid, status: "paid" }),
    /* @__PURE__ */ jsxs(
      "div",
      {
        style: {
          padding: "12px 16px",
          background: LIGHT_GRAY,
          borderRadius: 6,
          marginBottom: 20,
          fontSize: 12
        },
        children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#9ca3af", fontWeight: 600, marginBottom: 6 }, children: "Employee" }),
          /* @__PURE__ */ jsx("span", { style: { fontWeight: 600, color: DARK }, children: employee.name }),
          employee.jobTitle && /* @__PURE__ */ jsxs("span", { style: { color: GRAY, marginLeft: 8 }, children: [
            "\u2014 ",
            employee.jobTitle
          ] })
        ]
      }
    ),
    period && /* @__PURE__ */ jsxs(
      "div",
      {
        style: {
          fontSize: 11,
          color: GRAY,
          marginBottom: 16,
          paddingBottom: 10,
          borderBottom: `1px solid ${BORDER}`
        },
        children: [
          "Payment for work between ",
          period
        ]
      }
    ),
    paymentDetails && /* @__PURE__ */ jsx(
      ExchangeRateNote,
      {
        fromCurrency: paymentDetails.exchangeFrom,
        toCurrency: paymentDetails.exchangeTo,
        rate: paymentDetails.exchangeRate
      }
    ),
    /* @__PURE__ */ jsxs("table", { style: { width: "100%", borderCollapse: "collapse", marginBottom: 24 }, children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { style: thStyle, children: "Description" }),
        /* @__PURE__ */ jsx("th", { style: { ...thStyle, textAlign: "right" }, children: "Amount" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: lineItems.map((item, i) => /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsxs("td", { style: { ...tdStyle, background: i % 2 === 0 ? "#fff" : LIGHT_GRAY }, children: [
          /* @__PURE__ */ jsx("div", { children: item.description }),
          item.detail && /* @__PURE__ */ jsx("div", { style: { fontSize: 11, color: "#9ca3af", marginTop: 2 }, children: item.detail })
        ] }),
        /* @__PURE__ */ jsxs(
          "td",
          {
            style: {
              ...tdStyle,
              textAlign: "right",
              background: i % 2 === 0 ? "#fff" : LIGHT_GRAY
            },
            children: [
              item.amountNPR != null && /* @__PURE__ */ jsxs("div", { style: { color: GRAY, fontSize: 11 }, children: [
                "NPR ",
                formatMoney(item.amountNPR)
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { fontWeight: 400 }, children: [
                "USD $",
                formatMoney(item.amountUSD)
              ] })
            ]
          }
        )
      ] }, i)) }),
      /* @__PURE__ */ jsx("tfoot", { children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("td", { style: { ...tdStyle, fontWeight: 700, borderTop: `2px solid ${DARK}` }, children: "Total paid" }),
        /* @__PURE__ */ jsxs(
          "td",
          {
            style: {
              ...tdStyle,
              textAlign: "right",
              fontWeight: 700,
              borderTop: `2px solid ${DARK}`,
              fontSize: 15
            },
            children: [
              "$",
              formatMoney(totalPaid)
            ]
          }
        )
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(DocFooter, { refNumber })
  ] });
}
var thStyle = {
  padding: "10px 12px",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: 1,
  color: "#9ca3af",
  fontWeight: 600,
  textAlign: "left",
  borderBottom: `2px solid ${DARK}`
};
var tdStyle = {
  padding: "10px 12px",
  fontSize: 13,
  borderBottom: `1px solid #f3f4f6`
};
var sectionLabel = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: 2,
  color: BRAND,
  fontWeight: 700,
  marginBottom: 16,
  marginTop: 28
};
var payslipColHeader = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: 1.5,
  color: BRAND,
  fontWeight: 700,
  padding: "8px 10px",
  background: BRAND_BG,
  borderRadius: "6px 6px 0 0",
  borderBottom: `2px solid ${BRAND}`
};
var payslipTd = {
  padding: "8px 10px",
  fontSize: 12,
  borderBottom: `1px solid #f3f4f6`,
  color: "#374151"
};
var payslipTotalTd = {
  padding: "10px 10px",
  fontSize: 13,
  fontWeight: 600,
  borderTop: `2px solid ${DARK}`,
  color: DARK
};
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
var sampleBillFrom = {
  name: "Talyn Global LLC (DBA Talyn LLC)",
  address: "2702 E Fifth St, #803",
  cityStateZip: "Tyler, TX 75701",
  country: "United States",
  phone: "+1 903-426-5303"
};
var sampleBillTo = {
  name: "EMA Engineering & Consulting, Inc.",
  address: "328 South Broadway Avenue",
  cityStateZip: "Tyler, TX 75703",
  country: "United States",
  vatId: "751684881"
};
var sampleEmployees = [
  {
    name: "Aashish Katuwal",
    role: "Energy/Sustainability Engineer I",
    invoiceNumber: "INV-TAL-2026-001",
    period: "March 1, 2026 to March 31, 2026",
    lineItems: [
      {
        description: "Salary",
        detail: "Monthly gross salary \u2014 regular work",
        amountNPR: 65e3,
        amountUSD: 461.57
      },
      {
        description: "Employer Contributions: Social Security",
        detail: "ER \u2014 Social Security (SSF 20% of 60% basic)",
        amountNPR: 7800,
        amountUSD: 55.39
      },
      {
        description: "Severance accrual",
        detail: "Employer contribution \u2014 Month 11 of 12",
        amountNPR: 2500,
        amountUSD: 17.75
      }
    ],
    total: 534.71
  },
  {
    name: "Nirmala Kutuwo",
    role: "Designer",
    invoiceNumber: "INV-TAL-2026-002",
    period: "March 1, 2026 to March 31, 2026",
    lineItems: [
      {
        description: "Salary",
        detail: "Monthly gross salary \u2014 regular work",
        amountNPR: 83333.33,
        amountUSD: 591.75
      },
      {
        description: "Employer Contributions: Social Security",
        detail: "ER \u2014 Social Security (SSF 20% of 60% basic)",
        amountNPR: 1e4,
        amountUSD: 71.01
      },
      {
        description: "Severance accrual",
        detail: "Employer contribution \u2014 Month 12 of 12",
        amountNPR: 3333.33,
        amountUSD: 23.67
      }
    ],
    total: 686.43
  }
];
var samplePlatformFees = [
  {
    name: "Aashish Katuwal",
    role: "Energy/Sustainability Engineer I",
    lineItems: [{ description: "EOR platform fee", amountUSD: 599 }],
    total: 599
  },
  {
    name: "Nirmala Kutuwo",
    role: "Designer",
    lineItems: [{ description: "EOR platform fee", amountUSD: 599 }],
    total: 599
  }
];
function FinancialDocumentsPreview() {
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
    { id: "emp-receipt", label: "Emp Receipt" }
  ];
  return /* @__PURE__ */ jsxs("div", { style: { fontFamily: baseFont.fontFamily }, children: [
    /* @__PURE__ */ jsx(
      "div",
      {
        style: {
          display: "flex",
          gap: 6,
          padding: "12px 16px",
          background: "#f9fafb",
          borderRadius: "10px 10px 0 0",
          borderBottom: "1px solid #e5e7eb",
          flexWrap: "wrap"
        },
        children: docs.map((d) => /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setActiveDoc(d.id),
            style: {
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: activeDoc === d.id ? 600 : 400,
              color: activeDoc === d.id ? "#fff" : GRAY,
              background: activeDoc === d.id ? BRAND : "#fff",
              border: `1px solid ${activeDoc === d.id ? BRAND : BORDER}`,
              borderRadius: 6,
              cursor: "pointer"
            },
            children: d.label
          },
          d.id
        ))
      }
    ),
    /* @__PURE__ */ jsxs(
      "div",
      {
        style: {
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderTop: "none",
          borderRadius: "0 0 10px 10px",
          minHeight: 400
        },
        children: [
          activeDoc === "invoice-summary" && /* @__PURE__ */ jsx(
            InvoiceDocument,
            {
              variant: "summary",
              docNumber: "S-2026-7",
              issueDate: "March 24, 2026",
              dueDate: "March 29, 2026",
              billFrom: sampleBillFrom,
              billTo: sampleBillTo,
              totalDue: 2331.14,
              summaryRows: [
                { label: "Employee invoices total", amount: 1221.14 },
                { label: "Talyn fees", amount: 5 },
                { label: "Platform fee (2 employees \xD7 $599)", amount: 1198 }
              ],
              refNumber: "TLN-7f8a3e2b"
            }
          ),
          activeDoc === "invoice-detail" && /* @__PURE__ */ jsx(
            InvoiceDocument,
            {
              variant: "detail",
              docNumber: "S-2026-7",
              issueDate: "March 24, 2026",
              dueDate: "March 29, 2026",
              billFrom: sampleBillFrom,
              billTo: sampleBillTo,
              totalDue: 2331.14,
              summaryRows: [
                { label: "Employee invoices total", amount: 1221.14 },
                { label: "Talyn fees", amount: 5 },
                { label: "Platform fee (2 employees \xD7 $599)", amount: 1198 }
              ],
              paymentDetails: {
                currency: "USD",
                exchangeRate: "0.0071010",
                exchangeFrom: "NPR",
                exchangeTo: "USD"
              },
              platformFees: samplePlatformFees,
              employees: sampleEmployees,
              refNumber: "TLN-7f8a3e2b"
            }
          ),
          activeDoc === "receipt-summary" && /* @__PURE__ */ jsx(
            ReceiptDocument,
            {
              variant: "summary",
              docNumber: "REC-2026-4",
              issueDate: "March 24, 2026",
              paidDate: "March 24, 2026",
              billFrom: sampleBillFrom,
              billTo: sampleBillTo,
              totalPaid: 2331.14,
              summaryRows: [
                { label: "Employee invoices total", amount: 1221.14 },
                { label: "Talyn fees", amount: 5 },
                { label: "Platform fee", amount: 1198 }
              ],
              refNumber: "TLN-7f8a3e2b"
            }
          ),
          activeDoc === "receipt-detail" && /* @__PURE__ */ jsx(
            ReceiptDocument,
            {
              variant: "detail",
              docNumber: "REC-2026-4",
              issueDate: "March 24, 2026",
              paidDate: "March 24, 2026",
              billFrom: sampleBillFrom,
              billTo: sampleBillTo,
              totalPaid: 2331.14,
              summaryRows: [
                { label: "Employee invoices total", amount: 1221.14 },
                { label: "Talyn fees", amount: 5 },
                { label: "Platform fee", amount: 1198 }
              ],
              paymentDetails: {
                currency: "USD",
                exchangeRate: "0.0071010",
                exchangeFrom: "NPR",
                exchangeTo: "USD"
              },
              platformFees: samplePlatformFees,
              employees: sampleEmployees,
              refNumber: "TLN-7f8a3e2b"
            }
          ),
          activeDoc === "platform-fee" && /* @__PURE__ */ jsx(
            PlatformFeeInvoice,
            {
              docNumber: "PF-2026-001",
              issueDate: "March 24, 2026",
              dueDate: "March 29, 2026",
              billFrom: sampleBillFrom,
              billTo: sampleBillTo,
              employee: { name: "Aashish Katuwal", jobTitle: "Energy/Sustainability Engineer I" },
              platformFee: 599,
              totalDue: 599,
              refNumber: "TLN-pf-7f8a"
            }
          ),
          activeDoc === "platform-fee-receipt" && /* @__PURE__ */ jsx(
            PlatformFeeReceipt,
            {
              docNumber: "PFR-2026-001",
              issueDate: "March 24, 2026",
              paidDate: "March 24, 2026",
              billFrom: sampleBillFrom,
              billTo: sampleBillTo,
              employee: { name: "Aashish Katuwal", jobTitle: "Energy/Sustainability Engineer I" },
              platformFee: 599,
              totalPaid: 599,
              refNumber: "TLN-pfr-7f8a"
            }
          ),
          activeDoc === "emp-invoice" && /* @__PURE__ */ jsx(
            PerEmployeeInvoice,
            {
              docNumber: "INV-TAL-2026-001",
              issueDate: "March 24, 2026",
              dueDate: "March 29, 2026",
              billFrom: sampleBillFrom,
              billTo: sampleBillTo,
              employee: { name: "Aashish Katuwal", jobTitle: "Energy/Sustainability Engineer I" },
              period: "March 1, 2026 to March 31, 2026",
              lineItems: [
                { description: "Salary", detail: "Monthly gross salary \u2014 regular work", amountNPR: 65e3, amountUSD: 461.57 },
                { description: "Employer Contributions: Social Security", detail: "ER \u2014 Social Security (SSF 20% of 60% basic)", amountNPR: 7800, amountUSD: 55.39 },
                { description: "Severance accrual", detail: "Monthly severance provision", amountNPR: 3250, amountUSD: 23.08 }
              ],
              totalDue: 540.04,
              paymentDetails: { exchangeFrom: "NPR", exchangeTo: "USD", exchangeRate: "0.0071010" },
              refNumber: "TLN-ei-7f8a"
            }
          ),
          activeDoc === "emp-receipt" && /* @__PURE__ */ jsx(
            PerEmployeeReceipt,
            {
              docNumber: "REC-TAL-2026-001",
              issueDate: "March 24, 2026",
              paidDate: "March 24, 2026",
              billFrom: sampleBillFrom,
              billTo: sampleBillTo,
              employee: { name: "Aashish Katuwal", jobTitle: "Energy/Sustainability Engineer I" },
              period: "March 1, 2026 to March 31, 2026",
              lineItems: [
                { description: "Salary", detail: "Monthly gross salary \u2014 regular work", amountNPR: 65e3, amountUSD: 461.57 },
                { description: "Employer Contributions: Social Security", detail: "ER \u2014 Social Security (SSF 20% of 60% basic)", amountNPR: 7800, amountUSD: 55.39 },
                { description: "Severance accrual", detail: "Monthly severance provision", amountNPR: 3250, amountUSD: 23.08 }
              ],
              totalPaid: 540.04,
              paymentDetails: { exchangeFrom: "NPR", exchangeTo: "USD", exchangeRate: "0.0071010" },
              refNumber: "TLN-er-7f8a"
            }
          ),
          activeDoc === "payslip" && /* @__PURE__ */ jsx(
            PayslipDocument,
            {
              period: "February 2026",
              employee: {
                name: "Nirmala Kutuwo",
                oid: "TLN-mqejx42",
                joinDate: "17-Apr-25",
                designation: "Designer",
                pan: "133856439",
                bankAccount: "00915121195",
                bankName: "Siddhartha Bank Ltd."
              },
              incomeItems: [
                { label: "Basic salary", amount: 5e4 },
                { label: "Dearness allowance", amount: 33333.33 },
                { label: "Other allowance", amount: null },
                { label: "Festival allowance", amount: null },
                { label: "Bonus", amount: null },
                { label: "Leave encashments", amount: null },
                { label: "Other payments", amount: null }
              ],
              deductionItems: [
                { label: "SSF (employee)", amount: 5500 },
                { label: "Income tax", amount: 5009.99 }
              ],
              totalGross: 83333.33,
              totalDeductions: 10509.99,
              netSalary: 72823.34
            }
          )
        ]
      }
    )
  ] });
}
export {
  InvoiceDocument,
  PayslipDocument,
  PerEmployeeInvoice,
  PerEmployeeReceipt,
  PlatformFeeInvoice,
  PlatformFeeReceipt,
  ReceiptDocument,
  FinancialDocumentsPreview as default,
  formatMoney,
  formatNPR
};
