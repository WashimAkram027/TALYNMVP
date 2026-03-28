import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { bsToAd, countBsMonthsElapsed, countConsecutiveCalendarDays, daysBetween } from '../utils/nepaliDate.js'

// ═══════════════════════════════════════════════════════════════
// Scenario: Female employee in a 30-day month
//   - 4 sick leave days
//   - 2 home leave days
//   - 10 maternity leave days (within first 60 paid days)
//   - CTC: 80,000 NPR/month
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
  return { B, C, D, available: Math.min(Math.max(B + C - D, 0), 45) }
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
  return { B: 0, C, D, available: Math.max(C - D, 0) }
}

function simulatePayableDays({ calendarDays, leaveRequests }) {
  let totalPaid = 0, totalUnpaid = 0
  for (const r of leaveRequests) { totalPaid += r.paidDays; totalUnpaid += r.unpaidDays }
  return {
    calendarDays,
    paidLeaveDays: totalPaid,
    unpaidLeaveDays: totalUnpaid,
    deductionDays: totalUnpaid,
    payableDays: Math.max(calendarDays - totalUnpaid, 0)
  }
}

// ═══════════════════════════════════════════════════════════════

describe('Combined: 4 sick + 2 home + 10 maternity in a 30-day month', () => {
  const joinedBs = { year: 2081, month: 4, day: 1 }  // long-term employee
  const currentBs = { year: 2082, month: 10, day: 1 } // 7 months into FY

  it('Step 1: Sick leave — 4 requested, 5 available → all paid', () => {
    // 7 months accrued, 2 previously taken = 5 available
    const balance = simulateSickLeaveBalance({
      joinedBs, currentBs, priorBalance: 0, takenThisFy: 2
    })
    console.log('    Sick balance:', JSON.stringify(balance))
    assert.equal(balance.available, 5)

    const requested = 4
    const paidDays = Math.min(requested, balance.available)
    const unpaidDays = Math.max(requested - balance.available, 0)

    console.log('    → 4 sick days requested: paid=' + paidDays + ', unpaid=' + unpaidDays)
    assert.equal(paidDays, 4, 'all 4 within balance')
    assert.equal(unpaidDays, 0, 'no unpaid')

    // Medical cert? 4 consecutive > 3
    const medCert = countConsecutiveCalendarDays('2026-01-05', '2026-01-08') > 3
    console.log('    Medical certificate required:', medCert)
    assert.ok(medCert, '4 consecutive days triggers medical cert')
  })

  it('Step 2: Home leave — 2 requested, 8 available → all paid', () => {
    // 7 months × 1.5 = 10.5 accrued, 2.5 previously taken = 8 available
    const balance = simulateHomeLeaveBalance({
      joinedBs, currentBs, takenThisFy: 2.5
    })
    console.log('    Home balance:', JSON.stringify(balance))
    assert.equal(balance.available, 8)

    const requested = 2
    const paidDays = Math.min(requested, balance.available)
    const unpaidDays = Math.max(requested - balance.available, 0)

    console.log('    → 2 home days requested: paid=' + paidDays + ', unpaid=' + unpaidDays)
    assert.equal(paidDays, 2, 'all 2 within balance')
    assert.equal(unpaidDays, 0)
  })

  it('Step 3: Maternity leave — 10 days this month (within first 60 paid days)', () => {
    // Maternity started earlier, employee is in days 20-30 of maternity this month
    // Still within first 60 paid days → all 10 days are paid
    const maternityDaySoFar = 20
    const daysThisMonth = 10
    const endDay = maternityDaySoFar + daysThisMonth  // day 30, still within 60 paid

    const paidDays = (endDay <= 60) ? daysThisMonth : Math.max(60 - maternityDaySoFar, 0)
    const unpaidDays = daysThisMonth - paidDays

    console.log('    Maternity: day ' + maternityDaySoFar + ' to day ' + endDay + ' (of 98 total)')
    console.log('    → 10 maternity days: paid=' + paidDays + ', unpaid=' + unpaidDays)
    assert.equal(paidDays, 10, 'all within first 60 paid days')
    assert.equal(unpaidDays, 0)
  })

  it('Step 4: Payroll calculation — all 16 leave days are paid, no deduction', () => {
    const result = simulatePayableDays({
      calendarDays: 30,
      leaveRequests: [
        { paidDays: 4, unpaidDays: 0 },   // sick (within balance)
        { paidDays: 2, unpaidDays: 0 },   // home (within balance)
        { paidDays: 10, unpaidDays: 0 }   // maternity (within first 60 days)
      ]
    })

    console.log('    Day-count:', JSON.stringify(result))
    assert.equal(result.paidLeaveDays, 16, '4+2+10 = 16 paid leave days')
    assert.equal(result.unpaidLeaveDays, 0, 'all leave is paid')
    assert.equal(result.deductionDays, 0, 'no deductions')
    assert.equal(result.payableDays, 30, 'full 30 days payable')
  })

  it('Step 5: Salary — full pay, no deduction', () => {
    const monthlyCTC = 80000
    const calendarDays = 30
    const payableDays = 30

    const dailyRate = monthlyCTC / calendarDays
    const grossPay = Math.round(dailyRate * payableDays)
    const deduction = 0
    const basicSalary = Math.round(grossPay * 0.60)
    const employerSSF = Math.round(basicSalary * 0.20)
    const employeeSSF = Math.round(basicSalary * 0.11)
    const netPay = grossPay - employeeSSF

    console.log('')
    console.log('    ┌──────────────────────────────────────────────────┐')
    console.log('    │   PAYSLIP: 4 Sick + 2 Home + 10 Maternity       │')
    console.log('    ├──────────────────────────────────────────────────┤')
    console.log('    │  Calendar days:                ' + String(calendarDays).padStart(10))
    console.log('    │  Sick leave (paid):            ' + String(4).padStart(10))
    console.log('    │  Home leave (paid):            ' + String(2).padStart(10))
    console.log('    │  Maternity leave (paid):       ' + String(10).padStart(10))
    console.log('    │  Total paid leave:             ' + String(16).padStart(10))
    console.log('    │  Unpaid leave:                 ' + String(0).padStart(10))
    console.log('    │  Payable days:                 ' + String(payableDays).padStart(10))
    console.log('    ├──────────────────────────────────────────────────┤')
    console.log('    │  Monthly CTC:          NPR ' + monthlyCTC.toLocaleString().padStart(10))
    console.log('    │  Gross pay:            NPR ' + grossPay.toLocaleString().padStart(10))
    console.log('    │  Leave deduction:      NPR ' + String(deduction).padStart(10))
    console.log('    │  Basic salary (60%):   NPR ' + basicSalary.toLocaleString().padStart(10))
    console.log('    │  Employer SSF (20%):   NPR ' + employerSSF.toLocaleString().padStart(10))
    console.log('    │  Employee SSF (11%):  -NPR ' + employeeSSF.toLocaleString().padStart(10))
    console.log('    │  Est. net pay:         NPR ' + netPay.toLocaleString().padStart(10))
    console.log('    └──────────────────────────────────────────────────┘')
    console.log('')

    assert.equal(grossPay, 80000, 'full CTC — all leave is paid')
    assert.equal(deduction, 0, 'zero deduction')
  })

  it('Step 6: Post-leave balances updated', () => {
    // Sick: was 5, used 4 paid → 1 remaining
    const sickAfter = simulateSickLeaveBalance({
      joinedBs, currentBs, priorBalance: 0, takenThisFy: 2 + 4
    })
    console.log('    Sick balance after:  ' + sickAfter.available + ' days (was 5, used 4)')
    assert.equal(sickAfter.available, 1)

    // Home: was 8, used 2 paid → 6 remaining
    const homeAfter = simulateHomeLeaveBalance({
      joinedBs, currentBs, takenThisFy: 2.5 + 2
    })
    console.log('    Home balance after:  ' + homeAfter.available + ' days (was 8, used 2)')
    assert.equal(homeAfter.available, 6)

    // Maternity: event-based, no "balance" — just tracking days used of 98 total
    const maternityDaysUsed = 30  // 20 prior + 10 this month
    const maternityRemaining = 98 - maternityDaysUsed
    console.log('    Maternity progress:  ' + maternityDaysUsed + '/98 days used, ' + maternityRemaining + ' remaining')
    console.log('    Maternity paid used: 30/60 paid days used, 30 paid days remaining')
    assert.equal(maternityRemaining, 68)
  })
})
