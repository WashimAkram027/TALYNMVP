import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { bsToAd, countBsMonthsElapsed, countConsecutiveCalendarDays } from '../utils/nepaliDate.js'

// ═══════════════════════════════════════════════════════════════
// Custom scenario: 30-day month, 6 sick leave days, 2 home leave days
// ═══════════════════════════════════════════════════════════════

function simulateSickLeaveBalance({ joinedBs, currentBs, priorBalance, takenThisFy }) {
  const fyStartBs = { year: currentBs.year, month: 4, day: 1 }
  if (currentBs.month < 4) fyStartBs.year = currentBs.year - 1

  const joinedBeforeFy = joinedBs.year < fyStartBs.year ||
    (joinedBs.year === fyStartBs.year && joinedBs.month <= fyStartBs.month)

  const B = joinedBeforeFy ? Math.min(priorBalance, 45) : 0
  const accrualStart = joinedBeforeFy ? fyStartBs : joinedBs
  const bsMonths = countBsMonthsElapsed(accrualStart, bsToAd(currentBs))
  const C = Math.min(bsMonths, 12)
  const D = takenThisFy
  const available = Math.min(Math.max(B + C - D, 0), 45)
  return { B, C, D, available }
}

function simulateHomeLeaveBalance({ joinedBs, currentBs, takenThisFy }) {
  const fyStartBs = { year: currentBs.year, month: 4, day: 1 }
  if (currentBs.month < 4) fyStartBs.year = currentBs.year - 1

  const joinedBeforeFy = joinedBs.year < fyStartBs.year ||
    (joinedBs.year === fyStartBs.year && joinedBs.month <= fyStartBs.month)

  const accrualStart = joinedBeforeFy ? fyStartBs : joinedBs
  const bsMonths = countBsMonthsElapsed(accrualStart, bsToAd(currentBs))
  const C = Math.min(bsMonths * 1.5, 18)
  const D = takenThisFy
  const available = Math.max(C - D, 0)
  return { B: 0, C, D, available }
}

function simulatePayableDays({ calendarDays, leaveRequests }) {
  let totalPaid = 0, totalUnpaid = 0
  for (const r of leaveRequests) { totalPaid += r.paidDays; totalUnpaid += r.unpaidDays }
  const deductionDays = totalUnpaid
  const payableDays = Math.max(calendarDays - deductionDays, 0)
  return { calendarDays, paidLeaveDays: totalPaid, unpaidLeaveDays: totalUnpaid, deductionDays, payableDays }
}

// ═══════════════════════════════════════════════════════════════
// SETUP:
//   Employee joined Shrawan 1, 2081 (before current FY)
//   Current: Magh 1, 2082 (7 months into FY 2082/83)
//   Sick leave balance before request: 4 days (7 accrued - 3 previously taken)
//   Home leave balance before request: 5 days (10.5 accrued - 5.5 previously taken)
//   THIS MONTH: 6 sick leave days + 2 home leave days
//   Calendar month: 30 days
//   Monthly CTC: 80,000 NPR
// ═══════════════════════════════════════════════════════════════

describe('Custom: 30-day month, 6 sick + 2 home leave, CTC 80k NPR', () => {
  const joinedBs = { year: 2081, month: 4, day: 1 }
  const currentBs = { year: 2082, month: 10, day: 1 }

  it('Sick leave: 6 requested, 4 available → 4 paid + 2 unpaid', () => {
    const balance = simulateSickLeaveBalance({
      joinedBs, currentBs, priorBalance: 0, takenThisFy: 3
    })
    console.log('    Sick balance BEFORE:', JSON.stringify(balance))
    assert.equal(balance.available, 4)

    const requested = 6
    const paidDays = Math.min(requested, balance.available)
    const unpaidDays = Math.max(requested - balance.available, 0)

    console.log('    Request 6 sick days → paid=' + paidDays + ', unpaid=' + unpaidDays)
    assert.equal(paidDays, 4)
    assert.equal(unpaidDays, 2)

    const medCert = countConsecutiveCalendarDays('2026-01-05', '2026-01-10') > 3
    console.log('    Medical certificate required: ' + medCert + ' (6 consecutive days)')
    assert.ok(medCert)
  })

  it('Home leave: 2 requested, 5 available → 2 paid + 0 unpaid', () => {
    const balance = simulateHomeLeaveBalance({
      joinedBs, currentBs, takenThisFy: 5.5
    })
    console.log('    Home balance BEFORE:', JSON.stringify(balance))
    assert.equal(balance.available, 5)

    const requested = 2
    const paidDays = Math.min(requested, balance.available)
    const unpaidDays = Math.max(requested - balance.available, 0)

    console.log('    Request 2 home days → paid=' + paidDays + ', unpaid=' + unpaidDays)
    assert.equal(paidDays, 2)
    assert.equal(unpaidDays, 0)
  })

  it('Payroll day-count: 30 days - 2 unpaid = 28 payable', () => {
    const result = simulatePayableDays({
      calendarDays: 30,
      leaveRequests: [
        { paidDays: 4, unpaidDays: 2 },  // sick (4 paid from balance, 2 unpaid)
        { paidDays: 2, unpaidDays: 0 }   // home (2 paid from balance)
      ]
    })

    console.log('    Day-count:', JSON.stringify(result))
    assert.equal(result.calendarDays, 30)
    assert.equal(result.paidLeaveDays, 6, '4 sick + 2 home = 6 paid')
    assert.equal(result.unpaidLeaveDays, 2, '2 sick days exceed balance')
    assert.equal(result.deductionDays, 2)
    assert.equal(result.payableDays, 28)
  })

  it('Salary: 80,000 NPR prorated to 28/30 days', () => {
    const monthlyCTC = 80000
    const calendarDays = 30
    const payableDays = 28
    const unpaidDays = 2

    const dailyRate = monthlyCTC / calendarDays
    const grossPay = Math.round(dailyRate * payableDays)
    const leaveDeduction = Math.round(dailyRate * unpaidDays)
    const basicSalary = Math.round(grossPay * 0.60)
    const otherAllowance = grossPay - basicSalary
    const employerSSF = Math.round(basicSalary * 0.20)
    const employeeSSF = Math.round(basicSalary * 0.11)
    const estimatedNet = grossPay - employeeSSF

    console.log('')
    console.log('    ┌─────────────────────────────────────────────┐')
    console.log('    │          PAYSLIP BREAKDOWN                  │')
    console.log('    ├─────────────────────────────────────────────┤')
    console.log('    │  Monthly CTC:         NPR ' + monthlyCTC.toLocaleString().padStart(10))
    console.log('    │  Calendar days:              ' + String(calendarDays).padStart(10))
    console.log('    │  Paid leave days:            ' + String(6).padStart(10))
    console.log('    │  Unpaid leave days:          ' + String(unpaidDays).padStart(10))
    console.log('    │  Payable days:               ' + String(payableDays).padStart(10))
    console.log('    │  Daily rate:          NPR ' + dailyRate.toFixed(2).padStart(10))
    console.log('    ├─────────────────────────────────────────────┤')
    console.log('    │  Gross pay:           NPR ' + grossPay.toLocaleString().padStart(10))
    console.log('    │  Leave deduction:    -NPR ' + leaveDeduction.toLocaleString().padStart(10))
    console.log('    ├─────────────────────────────────────────────┤')
    console.log('    │  Basic salary (60%):  NPR ' + basicSalary.toLocaleString().padStart(10))
    console.log('    │  Other allowance:     NPR ' + otherAllowance.toLocaleString().padStart(10))
    console.log('    │  Employer SSF (20%):  NPR ' + employerSSF.toLocaleString().padStart(10))
    console.log('    │  Employee SSF (11%): -NPR ' + employeeSSF.toLocaleString().padStart(10))
    console.log('    │  Est. net salary:     NPR ' + estimatedNet.toLocaleString().padStart(10))
    console.log('    └─────────────────────────────────────────────┘')
    console.log('')

    assert.equal(dailyRate, 80000 / 30)
    assert.equal(grossPay, 74667, 'gross = round(2666.67 × 28)')
    assert.equal(leaveDeduction, 5333, 'deduction = round(2666.67 × 2)')
    assert.equal(grossPay + leaveDeduction, monthlyCTC)
  })

  it('Post-leave balances updated correctly', () => {
    const sickAfter = simulateSickLeaveBalance({
      joinedBs, currentBs, priorBalance: 0, takenThisFy: 3 + 4  // used all 4 paid
    })
    console.log('    Sick balance AFTER:  ' + sickAfter.available + ' days (was 4)')
    assert.equal(sickAfter.available, 0)

    const homeAfter = simulateHomeLeaveBalance({
      joinedBs, currentBs, takenThisFy: 5.5 + 2  // used 2 of 5
    })
    console.log('    Home balance AFTER:  ' + homeAfter.available + ' days (was 5)')
    assert.equal(homeAfter.available, 3)
  })
})
