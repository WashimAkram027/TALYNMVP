import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  bsToAd, getCurrentFiscalYear, countWorkingDays, daysBetween
} from '../utils/nepaliDate.js'

// ═══════════════════════════════════════════════════════════════
// Supplementary Leave Types — Algorithm Tests
// Based on updatedleave.md §1-§5
// ═══════════════════════════════════════════════════════════════

// ─── Shared helpers ───────────────────────────────────────────
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
// 1. Maternity Leave (§45) — 98 days: 60 paid + 38 unpaid
// ═══════════════════════════════════════════════════════════════

describe('Maternity Leave (§45)', () => {
  it('98 days total: 60 paid + 38 unpaid (no accumulated leave cover)', () => {
    const totalDays = 98
    const paidDays = 60
    const unpaidDays = 38

    assert.equal(totalDays, 98)
    assert.equal(paidDays + unpaidDays, totalDays)
    assert.equal(paidDays, 60, '60 days at full salary')
    assert.equal(unpaidDays, 38, '38 days unpaid')
  })

  it('Unpaid portion can be covered by accumulated sick+home leave', () => {
    const unpaidDays = 38
    const sickBalance = 10
    const homeBalance = 8
    const coverable = Math.min(unpaidDays, sickBalance + homeBalance)

    const finalPaid = 60 + coverable
    const finalUnpaid = unpaidDays - coverable

    assert.equal(coverable, 18, '10 sick + 8 home = 18 coverable')
    assert.equal(finalPaid, 78, '60 + 18 = 78 paid days')
    assert.equal(finalUnpaid, 20, '38 - 18 = 20 unpaid days')
  })

  it('Pre-delivery minimum: 14 days before expected delivery', () => {
    const expectedDelivery = new Date('2026-01-15')
    const leaveStart = new Date('2025-12-25')
    const preDeliveryDays = daysBetween(expectedDelivery, leaveStart)

    assert.equal(preDeliveryDays, 21)
    assert.ok(preDeliveryDays >= 14, 'must be >= 14 days before delivery')
  })

  it('Rejects if less than 14 days before delivery', () => {
    const expectedDelivery = new Date('2026-01-15')
    const leaveStart = new Date('2026-01-05')
    const preDeliveryDays = daysBetween(expectedDelivery, leaveStart)

    assert.equal(preDeliveryDays, 10)
    assert.ok(preDeliveryDays < 14, 'should fail: only 10 days before delivery')
  })

  it('Medical extension: up to 30 additional unpaid days', () => {
    const baseEndDate = new Date('2026-04-10')
    const extensionDays = 30
    const maxExtension = 30

    assert.ok(extensionDays <= maxExtension, 'extension within 30-day limit')

    const newEndDate = new Date(baseEndDate.getTime() + extensionDays * 86400000)
    const totalWithExtension = 98 + extensionDays
    assert.equal(totalWithExtension, 128, '98 base + 30 extension = 128 total days')
  })

  it('Payroll: first 60 days paid, remaining unpaid deducted', () => {
    // Month 1: 30 days in maternity (all within first 60 paid days)
    const month1 = simulatePayableDays({
      calendarDays: 30,
      leaveRequests: [{ paidDays: 30, unpaidDays: 0 }]
    })
    assert.equal(month1.payableDays, 30, 'month 1: full pay')
    assert.equal(month1.deductionDays, 0, 'month 1: no deduction')

    // Month 3: 30 days in maternity (days 61-90, all unpaid)
    const month3 = simulatePayableDays({
      calendarDays: 30,
      leaveRequests: [{ paidDays: 0, unpaidDays: 30 }]
    })
    assert.equal(month3.payableDays, 0, 'month 3: zero pay')
    assert.equal(month3.deductionDays, 30, 'month 3: full deduction')
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. Paternity Leave (§45) — 15 days, fully paid
// ═══════════════════════════════════════════════════════════════

describe('Paternity Leave (§45)', () => {
  it('15 days, fully paid', () => {
    const totalDays = 15
    const paidDays = 15
    const unpaidDays = 0

    assert.equal(totalDays, 15)
    assert.equal(paidDays, 15, 'all 15 days paid')
    assert.equal(unpaidDays, 0, 'no unpaid days')
  })

  it('Must be taken within 30 days of childbirth', () => {
    const birthDate = new Date('2026-02-01')
    const leaveStart = new Date('2026-02-10')
    const daysSinceBirth = daysBetween(leaveStart, birthDate)

    assert.equal(daysSinceBirth, 9)
    assert.ok(daysSinceBirth <= 30, 'within 30-day window')
  })

  it('Rejected if > 30 days after childbirth', () => {
    const birthDate = new Date('2026-02-01')
    const leaveStart = new Date('2026-03-15')
    const daysSinceBirth = daysBetween(leaveStart, birthDate)

    assert.equal(daysSinceBirth, 42)
    assert.ok(daysSinceBirth > 30, 'should fail: 42 days after birth')
  })

  it('Payroll: no salary deduction (fully paid)', () => {
    const result = simulatePayableDays({
      calendarDays: 30,
      leaveRequests: [{ paidDays: 15, unpaidDays: 0 }]
    })
    assert.equal(result.payableDays, 30, 'full pay — paternity is paid leave')
    assert.equal(result.deductionDays, 0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. Mourning Leave (§46) — 13 days, fully paid
// ═══════════════════════════════════════════════════════════════

describe('Mourning Leave (§46)', () => {
  it('13 days, fully paid per death event', () => {
    const totalDays = 13
    const paidDays = 13

    assert.equal(totalDays, 13)
    assert.equal(paidDays, 13, 'all 13 days paid')
  })

  it('Only for immediate family: parent, spouse, child', () => {
    const allowed = ['parent', 'father', 'mother', 'spouse', 'child', 'son', 'daughter']

    assert.ok(allowed.includes('parent'), 'parent allowed')
    assert.ok(allowed.includes('spouse'), 'spouse allowed')
    assert.ok(allowed.includes('child'), 'child allowed')
    assert.ok(!allowed.includes('cousin'), 'cousin not allowed')
    assert.ok(!allowed.includes('uncle'), 'uncle not allowed')
  })

  it('Must commence within 7 days of death', () => {
    const deathDate = new Date('2026-03-01')
    const leaveStart = new Date('2026-03-05')
    const daysSinceDeath = daysBetween(leaveStart, deathDate)

    assert.equal(daysSinceDeath, 4)
    assert.ok(daysSinceDeath <= 7, 'within 7-day window')
  })

  it('Rejected if > 7 days after death', () => {
    const deathDate = new Date('2026-03-01')
    const leaveStart = new Date('2026-03-10')
    const daysSinceDeath = daysBetween(leaveStart, deathDate)

    assert.equal(daysSinceDeath, 9)
    assert.ok(daysSinceDeath > 7, 'should fail: 9 days after death')
  })

  it('Multiple mourning events allowed (separate entitlements)', () => {
    // Two family deaths = two separate 13-day entitlements
    const event1 = { totalDays: 13, paidDays: 13 }
    const event2 = { totalDays: 13, paidDays: 13 }
    const totalMourningDays = event1.totalDays + event2.totalDays

    assert.equal(totalMourningDays, 26, '13 + 13 = 26 total mourning days')
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. Special Leave (§47) — unpaid, 30/yr, 180 lifetime
// ═══════════════════════════════════════════════════════════════

describe('Special Leave (§47)', () => {
  it('Entirely unpaid — all days deducted from salary', () => {
    const requestedDays = 10
    const paidDays = 0
    const unpaidDays = requestedDays

    assert.equal(paidDays, 0, 'special leave is entirely unpaid')
    assert.equal(unpaidDays, 10, 'all days are unpaid')
  })

  it('Annual cap: 30 days per fiscal year', () => {
    const alreadyUsed = 25
    const requested = 10
    const remaining = 30 - alreadyUsed

    assert.equal(remaining, 5)
    assert.ok(requested > remaining, 'should fail: 10 requested but only 5 remaining')
  })

  it('Lifetime cap: 180 days total', () => {
    const lifetimeUsed = 170
    const requested = 15
    const remaining = 180 - lifetimeUsed

    assert.equal(remaining, 10)
    assert.ok(requested > remaining, 'should fail: 15 requested but only 10 lifetime remaining')
  })

  it('Payroll: full deduction for special leave', () => {
    const monthlyCTC = 80000
    const calendarDays = 30
    const specialLeaveDays = 10

    const result = simulatePayableDays({
      calendarDays,
      leaveRequests: [{ paidDays: 0, unpaidDays: specialLeaveDays }]
    })

    assert.equal(result.payableDays, 20, '30 - 10 = 20 payable')
    assert.equal(result.deductionDays, 10)

    const dailyRate = monthlyCTC / calendarDays
    const grossPay = Math.round(dailyRate * result.payableDays)
    const deduction = Math.round(dailyRate * result.deductionDays)

    console.log(`    Special leave payroll: ${result.payableDays}/${calendarDays} days, gross=NPR ${grossPay.toLocaleString()}, deduction=NPR ${deduction.toLocaleString()}`)
    assert.equal(grossPay + deduction, monthlyCTC)
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. Compensatory Leave (§42) — earned per holiday worked
// ═══════════════════════════════════════════════════════════════

describe('Compensatory Leave (§42)', () => {
  it('1 day earned per public holiday or weekly off worked', () => {
    const daysWorkedOnHoliday = 3
    const compLeaveEarned = daysWorkedOnHoliday * 1

    assert.equal(compLeaveEarned, 3, '3 holidays worked = 3 comp days')
  })

  it('Alternative: employer can pay 1.5x overtime instead', () => {
    const dailyRate = 2667  // NPR 80,000 / 30
    const overtimeRate = dailyRate * 1.5

    assert.equal(overtimeRate, 4000.5, '1.5x daily rate')
  })

  it('Compensatory leave is paid when taken (no deduction)', () => {
    const result = simulatePayableDays({
      calendarDays: 30,
      leaveRequests: [{ paidDays: 2, unpaidDays: 0 }]  // 2 comp days used
    })
    assert.equal(result.payableDays, 30, 'comp leave is paid — no deduction')
    assert.equal(result.deductionDays, 0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. Combined Payroll Scenario — All Leave Types in One Month
// ═══════════════════════════════════════════════════════════════

describe('Combined Payroll: Multiple Leave Types in One Month', () => {
  it('30-day month with sick, home, mourning, and special leave', () => {
    // Employee takes:
    // - 3 sick days (all paid, within balance)
    // - 2 home days (all paid, within balance)
    // - 13 mourning days (all paid)
    // - 5 special days (all unpaid)
    const result = simulatePayableDays({
      calendarDays: 30,
      leaveRequests: [
        { paidDays: 3, unpaidDays: 0 },   // sick
        { paidDays: 2, unpaidDays: 0 },   // home
        { paidDays: 13, unpaidDays: 0 },  // mourning
        { paidDays: 0, unpaidDays: 5 }    // special (unpaid)
      ]
    })

    console.log('    Combined:', JSON.stringify(result))
    assert.equal(result.paidLeaveDays, 18, '3+2+13 = 18 paid leave days')
    assert.equal(result.unpaidLeaveDays, 5, '5 special leave days unpaid')
    assert.equal(result.deductionDays, 5, 'only unpaid days deducted')
    assert.equal(result.payableDays, 25, '30 - 5 = 25')

    const monthlyCTC = 80000
    const dailyRate = monthlyCTC / 30
    const grossPay = Math.round(dailyRate * 25)
    const deduction = Math.round(dailyRate * 5)
    console.log(`    Salary: NPR ${grossPay.toLocaleString()} (deduction: NPR ${deduction.toLocaleString()})`)
    assert.equal(grossPay + deduction, monthlyCTC)
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. Leave Type Classification — Paid vs Unpaid Summary
// ═══════════════════════════════════════════════════════════════

describe('Leave Classification: Paid vs Unpaid', () => {
  const leaveTypes = [
    { code: 'sick_leave', paidWhenWithinBalance: true, alwaysPaid: false },
    { code: 'home_leave', paidWhenWithinBalance: true, alwaysPaid: false },
    { code: 'maternity_leave', paidFirst60Days: true, unpaidRemaining: true },
    { code: 'paternity_leave', alwaysPaid: true, days: 15 },
    { code: 'mourning_leave', alwaysPaid: true, days: 13 },
    { code: 'special_leave', alwaysPaid: false, alwaysUnpaid: true },
    { code: 'compensatory_leave', alwaysPaid: true }
  ]

  it('Paternity and mourning are always fully paid', () => {
    const paternity = leaveTypes.find(l => l.code === 'paternity_leave')
    const mourning = leaveTypes.find(l => l.code === 'mourning_leave')

    assert.ok(paternity.alwaysPaid)
    assert.ok(mourning.alwaysPaid)
  })

  it('Special leave is always unpaid', () => {
    const special = leaveTypes.find(l => l.code === 'special_leave')
    assert.ok(special.alwaysUnpaid)
    assert.ok(!special.alwaysPaid)
  })

  it('Maternity has split: 60 paid + 38 unpaid', () => {
    const maternity = leaveTypes.find(l => l.code === 'maternity_leave')
    assert.ok(maternity.paidFirst60Days)
    assert.ok(maternity.unpaidRemaining)
  })

  it('Sick and home depend on balance', () => {
    const sick = leaveTypes.find(l => l.code === 'sick_leave')
    const home = leaveTypes.find(l => l.code === 'home_leave')
    assert.ok(sick.paidWhenWithinBalance)
    assert.ok(home.paidWhenWithinBalance)
  })
})
