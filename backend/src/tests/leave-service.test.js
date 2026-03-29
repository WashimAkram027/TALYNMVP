/**
 * Service-Layer Leave & Payroll Day-Count Tests
 *
 * Tests the REAL leaveService and payrollDayCountService against Supabase.
 * Uses Sam Thapa (sam@inergyx.us) as the test employee.
 *
 * Usage:
 *   node --test src/tests/leave-service.test.js
 *
 * Prerequisites:
 *   - .env must be configured with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *   - Sam Thapa must exist as active employee in org "Lonestar"
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import dotenv from 'dotenv'
dotenv.config()

import { supabase } from '../config/supabase.js'
import { leaveService } from '../services/leave.service.js'
import { payrollDayCountService } from '../services/payrollDayCount.service.js'

// ═══════════════════════════════════════════════════════════════
// Test Constants
// ═══════════════════════════════════════════════════════════════

const EMPLOYEE_ID = '2eac7668-4d89-41d1-9f3a-b322fcd78cb2'   // Sam Thapa
const ORG_ID = '7a07751c-1869-43bc-ab72-7439adee649b'         // Lonestar
const APPROVER_ID = 'e08ada34-8eb2-421d-a5b9-1da849b690fb'    // Biraj Bhandari (employer)

// Track IDs of records created during tests so we can clean up
const createdLeaveRequestIds = []
const createdHolidayIds = []

// ═══════════════════════════════════════════════════════════════
// Cleanup: delete all test-created records after tests finish
// ═══════════════════════════════════════════════════════════════

after(async () => {
  console.log('\n    ── CLEANUP ──')

  if (createdLeaveRequestIds.length > 0) {
    // Delete leave balance updates caused by our approved requests
    await supabase
      .from('leave_balances')
      .delete()
      .eq('employee_id', EMPLOYEE_ID)
      .in('leave_type_code', ['sick_leave', 'home_leave', 'maternity_leave'])
      .eq('fiscal_year', '2082/83')

    // Delete leave requests we created
    for (const id of createdLeaveRequestIds) {
      await supabase.from('leave_requests').delete().eq('id', id)
    }
    console.log(`    Deleted ${createdLeaveRequestIds.length} leave requests`)
  }

  // Delete childbirth_events we may have created
  await supabase
    .from('childbirth_events')
    .delete()
    .eq('employee_id', EMPLOYEE_ID)

  if (createdHolidayIds.length > 0) {
    for (const id of createdHolidayIds) {
      await supabase.from('public_holidays').delete().eq('id', id)
    }
    console.log(`    Deleted ${createdHolidayIds.length} public holidays`)
  }

  console.log('    Cleanup complete.\n')
})

// ═══════════════════════════════════════════════════════════════
// 1. Verify Test Employee Exists
// ═══════════════════════════════════════════════════════════════

describe('Test Setup — Verify Sam Thapa', () => {
  it('Employee exists and is active', async () => {
    const { data, error } = await supabase
      .from('organization_members')
      .select('id, status, joined_at, salary_amount, gender, weekly_off_day')
      .eq('id', EMPLOYEE_ID)
      .single()

    assert.ok(!error, `DB error: ${error?.message}`)
    assert.equal(data.status, 'active')
    assert.equal(data.gender, 'female')
    assert.ok(data.joined_at, 'must have joined_at set')
    assert.ok(data.salary_amount, 'must have salary set')

    console.log('    Employee: Sam Thapa')
    console.log('    Status: ' + data.status)
    console.log('    Gender: ' + data.gender)
    console.log('    Joined: ' + data.joined_at)
    console.log('    Salary: NPR ' + parseFloat(data.salary_amount).toLocaleString())
    console.log('    Weekly off: ' + data.weekly_off_day)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. Sick Leave Balance — via leaveService
// ═══════════════════════════════════════════════════════════════

describe('Service: Sick Leave Balance', () => {
  it('calculates sick leave balance from DB', async () => {
    const balance = await leaveService.calculateSickLeaveBalance(EMPLOYEE_ID)

    console.log('    Sick leave balance:', JSON.stringify(balance, null, 2))

    assert.equal(balance.leaveType, 'sick_leave')
    assert.equal(balance.annualEntitlement, 12)
    assert.equal(balance.maxAccumulation, 45)
    assert.ok(balance.currentYearAccrued >= 0, 'accrued must be >= 0')
    assert.ok(balance.available >= 0, 'available must be >= 0')
    assert.ok(balance.available <= 45, 'available must be <= 45')
    assert.ok(balance.fiscalYear, 'must return fiscal year')
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. Home Leave Balance — via leaveService
// ═══════════════════════════════════════════════════════════════

describe('Service: Home Leave Balance', () => {
  it('calculates home leave balance from DB', async () => {
    const balance = await leaveService.calculateHomeLeaveBalance(EMPLOYEE_ID)

    console.log('    Home leave balance:', JSON.stringify(balance, null, 2))

    assert.equal(balance.leaveType, 'home_leave')
    assert.equal(balance.annualEntitlement, 18)
    assert.equal(balance.carryForward, 0, 'home leave never carries forward')
    assert.ok(balance.currentYearAccrued >= 0)
    assert.ok(balance.available >= 0)
    assert.ok(balance.available <= 18)
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. SCENARIO: Second Month (Aug 2025) — 2 days sick leave
//    Sam joined July 16, 2025. By Aug 25, that's 40 days.
//    FY 2082/83 started Shrawan 1 (~July 16).
//    Accrual: ~2 BS months (Shrawan, Bhadra) = 2 sick days.
//    Aug 2025 has 31 days, 5 Saturdays.
// ═══════════════════════════════════════════════════════════════

describe('Scenario: 2nd Month — 2 Sick Days After 40 Days (Aug 2025)', () => {
  let sickRequest = null

  it('checks sick balance as of Aug 25, 2025 (~40 days after joining)', async () => {
    const asOf = new Date('2025-08-25')
    const balance = await leaveService.calculateSickLeaveBalance(EMPLOYEE_ID, asOf)

    console.log('    Sick balance as of Aug 25, 2025:')
    console.log('      Carry-forward: ' + balance.carryForward)
    console.log('      Accrued: ' + balance.currentYearAccrued + ' (BS months since Shrawan 1)')
    console.log('      Taken: ' + balance.taken)
    console.log('      Available: ' + balance.available)
    console.log('      Fiscal year: ' + balance.fiscalYear)

    assert.ok(balance.currentYearAccrued >= 2, 'should have at least 2 months accrued')
    assert.equal(balance.taken, 0, 'no leave taken yet')
    assert.ok(balance.available >= 2, 'need at least 2 days for this test')
  })

  it('checks home balance as of Aug 25, 2025', async () => {
    const asOf = new Date('2025-08-25')
    const balance = await leaveService.calculateHomeLeaveBalance(EMPLOYEE_ID, asOf)

    console.log('    Home balance as of Aug 25, 2025:')
    console.log('      Accrued: ' + balance.currentYearAccrued + ' (2 months × 1.5)')
    console.log('      Available: ' + balance.available)

    assert.ok(balance.currentYearAccrued >= 3, '2 months × 1.5 = 3')
    assert.equal(balance.taken, 0)
  })

  it('creates 2-day sick leave (Aug 25-26, Mon-Tue)', async () => {
    sickRequest = await leaveService.createLeaveRequest(EMPLOYEE_ID, ORG_ID, {
      leaveTypeCode: 'sick_leave',
      startDate: '2025-08-25',
      endDate: '2025-08-26',
      reason: '2nd month scenario — 2 day sick leave'
    })

    createdLeaveRequestIds.push(sickRequest.id)

    console.log('    Request: ' + sickRequest.id)
    console.log('    Days: ' + sickRequest.total_days + ' (paid: ' + sickRequest.paid_days + ', unpaid: ' + sickRequest.unpaid_days + ')')
    console.log('    Medical cert: ' + sickRequest.medical_certificate_required)

    assert.equal(sickRequest.status, 'pending')
    assert.equal(parseFloat(sickRequest.total_days), 2)
    assert.equal(parseFloat(sickRequest.paid_days), 2, 'both days within balance')
    assert.equal(parseFloat(sickRequest.unpaid_days), 0)
    assert.equal(sickRequest.medical_certificate_required, false, '2 days ≤ 3 threshold')
  })

  it('approves the request', async () => {
    const approved = await leaveService.approveLeaveRequest(sickRequest.id, ORG_ID, APPROVER_ID)
    assert.equal(approved.status, 'approved')
    console.log('    Approved at ' + approved.approved_at)
  })

  it('payroll day-count for August 2025', async () => {
    const dayCount = await payrollDayCountService.calculatePayableDays(
      EMPLOYEE_ID, '2025-08-01', '2025-08-31'
    )

    console.log('')
    console.log('    ╔══════════════════════════════════════════════════════════╗')
    console.log('    ║     PAYROLL DAY-COUNT — AUGUST 2025 (2nd Month)         ║')
    console.log('    ║     Employee: Sam Thapa — 40 days after joining         ║')
    console.log('    ╠══════════════════════════════════════════════════════════╣')
    console.log('    ║  Calendar days:          ' + String(dayCount.calendarDays).padStart(6) + '                          ║')
    console.log('    ║  Weekly off days:        ' + String(dayCount.weeklyOffDays).padStart(6) + '                          ║')
    console.log('    ║  Public holidays:        ' + String(dayCount.publicHolidayDays).padStart(6) + '                          ║')
    console.log('    ║  Expected working days:  ' + String(dayCount.expectedWorkingDays).padStart(6) + '                          ║')
    console.log('    ║  ────────────────────────────────────────────────        ║')
    console.log('    ║  Paid leave days:        ' + String(dayCount.paidLeaveDays).padStart(6) + '  (sick — within balance) ║')
    console.log('    ║  Unpaid leave days:      ' + String(dayCount.unpaidLeaveDays).padStart(6) + '                          ║')
    console.log('    ║  Deduction days:         ' + String(dayCount.deductionDays).padStart(6) + '                          ║')
    console.log('    ║  PAYABLE DAYS:           ' + String(dayCount.payableDays).padStart(6) + '                          ║')
    console.log('    ╚══════════════════════════════════════════════════════════╝')

    assert.equal(dayCount.calendarDays, 31, 'August has 31 days')
    assert.equal(dayCount.deductionDays, dayCount.unpaidLeaveDays)
    // 2 sick days are paid — no deduction expected
    assert.equal(dayCount.unpaidLeaveDays, 0, 'all sick leave is paid')
    assert.equal(dayCount.payableDays, 31, 'full pay — no unpaid leave')
  })

  it('payslip + invoice for August 2025', async () => {
    const dayCount = await payrollDayCountService.calculatePayableDays(
      EMPLOYEE_ID, '2025-08-01', '2025-08-31'
    )

    // Fetch EOR config
    const { data: config } = await supabase
      .from('eor_cost_config')
      .select('*')
      .eq('country_code', 'NPL')
      .eq('is_active', true)
      .single()

    const exchangeRate = parseFloat(config.exchange_rate)
    const employerSsfRate = parseFloat(config.employer_ssf_rate)
    const employeeSsfRate = parseFloat(config.employee_ssf_rate)
    const platformFeeCents = config.platform_fee_amount
    const periodsPerYear = config.periods_per_year

    const annualSalary = 1000000
    const fullMonthlyGross = Math.round((annualSalary / periodsPerYear) * 100) // paisa
    let monthlyGross = fullMonthlyGross

    if (dayCount.deductionDays > 0 && dayCount.calendarDays > 0) {
      const dailyRate = Math.round(fullMonthlyGross / dayCount.calendarDays)
      monthlyGross = dailyRate * dayCount.payableDays
    }

    const employerSsf = Math.round(monthlyGross * employerSsfRate)
    const employeeSsf = Math.round(monthlyGross * employeeSsfRate)
    const totalCostLocal = monthlyGross + employerSsf
    const costUsdCents = Math.round(totalCostLocal * exchangeRate)
    const totalAmountCents = costUsdCents + platformFeeCents

    const grossNpr = monthlyGross / 100
    const basicSalary = Math.round(grossNpr * 0.60)
    const empSsfNpr = Math.round(basicSalary * 0.11)
    const netPay = grossNpr - empSsfNpr

    const npr = (paisa) => 'NPR ' + (paisa / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const usd = (cents) => '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    console.log('')
    console.log('    ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓')
    console.log('    ┃                                                                    ┃')
    console.log('    ┃   T A L Y N                    INVOICE — AUGUST 2025               ┃')
    console.log('    ┃   Employee: Sam Thapa           2nd month after joining             ┃')
    console.log('    ┃                                                                    ┃')
    console.log('    ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫')
    console.log('    ┃  Period:        2025-08-01 to 2025-08-31                           ┃')
    console.log('    ┃  Organization:  Lonestar                                            ┃')
    console.log('    ┃                                                                    ┃')
    console.log('    ┃  ATTENDANCE                                                        ┃')
    console.log('    ┃  ────────────────────────────────────────────────────────────       ┃')
    console.log('    ┃  Calendar days:        ' + String(dayCount.calendarDays).padStart(5) + '                                     ┃')
    console.log('    ┃  Weekly offs (Sat):    ' + String(dayCount.weeklyOffDays).padStart(5) + '                                     ┃')
    console.log('    ┃  Public holidays:      ' + String(dayCount.publicHolidayDays).padStart(5) + '                                     ┃')
    console.log('    ┃  Working days:         ' + String(dayCount.expectedWorkingDays).padStart(5) + '                                     ┃')
    console.log('    ┃  Sick leave (PAID):    ' + String(dayCount.paidLeaveDays).padStart(5) + '   (within 2-day balance)             ┃')
    console.log('    ┃  Unpaid leave:         ' + String(dayCount.unpaidLeaveDays).padStart(5) + '                                     ┃')
    console.log('    ┃  Days worked:          ' + String(dayCount.expectedWorkingDays - dayCount.paidLeaveDays).padStart(5) + '                                     ┃')
    console.log('    ┃  Payable days:         ' + String(dayCount.payableDays).padStart(5) + '   (FULL — no deductions)             ┃')
    console.log('    ┃                                                                    ┃')
    console.log('    ┃  PAYSLIP                                                           ┃')
    console.log('    ┃  ────────────────────────────────────────────────────────────       ┃')
    console.log('    ┃  Monthly CTC:          NPR ' + Math.round(grossNpr).toLocaleString().padStart(10) + '                        ┃')
    console.log('    ┃  Leave deduction:      NPR ' + String(0).padStart(10) + '   (sick leave covered)  ┃')
    console.log('    ┃  Gross pay:            NPR ' + Math.round(grossNpr).toLocaleString().padStart(10) + '                        ┃')
    console.log('    ┃  Basic salary (60%):   NPR ' + basicSalary.toLocaleString().padStart(10) + '                        ┃')
    console.log('    ┃  Employer SSF (20%):   NPR ' + Math.round(basicSalary * 0.20).toLocaleString().padStart(10) + '   (employer cost)       ┃')
    console.log('    ┃  Employee SSF (11%):  -NPR ' + empSsfNpr.toLocaleString().padStart(10) + '   (deducted)            ┃')
    console.log('    ┃  NET PAY:              NPR ' + netPay.toLocaleString().padStart(10) + '                        ┃')
    console.log('    ┃                                                                    ┃')
    console.log('    ┃  INVOICE TO EMPLOYER                                               ┃')
    console.log('    ┃  ────────────────────────────────────────────────────────────       ┃')
    console.log('    ┃  Gross (local):        ' + npr(monthlyGross).padStart(20) + '                        ┃')
    console.log('    ┃  Employer SSF:         ' + npr(employerSsf).padStart(20) + '                        ┃')
    console.log('    ┃  Total local cost:     ' + npr(totalCostLocal).padStart(20) + '                        ┃')
    console.log('    ┃  FX rate:              1 NPR = ' + exchangeRate + ' USD                          ┃')
    console.log('    ┃  Payroll (USD):        ' + usd(costUsdCents).padStart(20) + '                        ┃')
    console.log('    ┃  Platform fee:         ' + usd(platformFeeCents).padStart(20) + '                        ┃')
    console.log('    ┃                        ─────────────────────                       ┃')
    console.log('    ┃  TOTAL DUE:            ' + usd(totalAmountCents).padStart(20) + '                        ┃')
    console.log('    ┃                                                                    ┃')
    console.log('    ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫')
    console.log('    ┃  SUMMARY: Sam took 2 sick days in her 2nd month.                   ┃')
    console.log('    ┃  Both days covered by sick balance (2 accrued, 2 used).            ┃')
    console.log('    ┃  Result: FULL SALARY, ZERO deduction.                              ┃')
    console.log('    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛')
    console.log('')

    // Full pay — no deductions
    assert.equal(dayCount.payableDays, 31, 'full month payable')
    assert.equal(dayCount.deductionDays, 0, 'zero deduction')
    assert.equal(monthlyGross, fullMonthlyGross, 'no proration — full gross')
    assert.ok(totalAmountCents > 0, 'invoice total positive')
  })

  it('sick balance after 2 days used in Aug', async () => {
    const asOf = new Date('2025-08-27')
    const balance = await leaveService.calculateSickLeaveBalance(EMPLOYEE_ID, asOf)

    console.log('    Sick balance after Aug leave:')
    console.log('      Accrued: ' + balance.currentYearAccrued)
    console.log('      Taken: ' + balance.taken)
    console.log('      Available: ' + balance.available)

    assert.equal(balance.taken, 2, '2 sick days taken')
    assert.ok(balance.available >= 0, 'balance non-negative')
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. SCENARIO: Leave on the 27th — after billing cycle runs (26th)
//    Sam requests 1 sick day on Sep 27, 2025.
//    Billing cycle runs on the 26th for period Sep 1-30.
//    Question: does the Sep 27 leave affect Sep payroll or Oct payroll?
//    Answer depends on whether the invoice was already generated.
//
//    Test A: payrollDayCountService for Sep 1-30 (includes the 27th)
//    Test B: payrollDayCountService for Oct 1-31 (does NOT include the 27th)
//    This proves the day-count is date-range based, not billing-trigger based.
// ═══════════════════════════════════════════════════════════════

describe('Scenario: Leave on 27th — After Billing Cycle (Sep 2025)', () => {
  let sickRequest = null

  it('creates 1-day sick leave on Sep 27 (Saturday check)', async () => {
    // Sep 27, 2025 is a Saturday — that's the weekly off!
    // Let's check and use Sep 29 (Monday) instead if needed
    const sep27 = new Date('2025-09-27')
    const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][sep27.getDay()]
    console.log('    Sep 27, 2025 is a ' + dayName)

    // Use Sep 29 (Monday) if Sep 27 is Saturday
    const leaveDate = dayName === 'Saturday' ? '2025-09-29' : '2025-09-27'
    const leaveDayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date(leaveDate).getDay()]
    console.log('    Using leave date: ' + leaveDate + ' (' + leaveDayName + ')')

    const balanceBefore = await leaveService.calculateSickLeaveBalance(EMPLOYEE_ID, new Date(leaveDate))
    console.log('    Sick balance before: ' + balanceBefore.available + ' (accrued: ' + balanceBefore.currentYearAccrued + ', taken: ' + balanceBefore.taken + ')')

    sickRequest = await leaveService.createLeaveRequest(EMPLOYEE_ID, ORG_ID, {
      leaveTypeCode: 'sick_leave',
      startDate: leaveDate,
      endDate: leaveDate,
      reason: 'Billing boundary test — leave after 26th'
    })

    createdLeaveRequestIds.push(sickRequest.id)

    console.log('    Request: ' + sickRequest.id)
    console.log('    Paid: ' + sickRequest.paid_days + ', Unpaid: ' + sickRequest.unpaid_days)

    assert.equal(parseFloat(sickRequest.total_days), 1)
  })

  it('approves the request', async () => {
    const approved = await leaveService.approveLeaveRequest(sickRequest.id, ORG_ID, APPROVER_ID)
    assert.equal(approved.status, 'approved')
  })

  it('SEPTEMBER payroll (1-30) — INCLUDES the leave', async () => {
    const dayCount = await payrollDayCountService.calculatePayableDays(
      EMPLOYEE_ID, '2025-09-01', '2025-09-30'
    )

    console.log('')
    console.log('    ╔══════════════════════════════════════════════════════════════╗')
    console.log('    ║  SEPTEMBER 2025 PAYROLL (period: Sep 1-30)                  ║')
    console.log('    ║  Billing cycle ran on Sep 26 — leave taken Sep 29           ║')
    console.log('    ╠══════════════════════════════════════════════════════════════╣')
    console.log('    ║  Calendar days:          ' + String(dayCount.calendarDays).padStart(6) + '                              ║')
    console.log('    ║  Weekly off days:        ' + String(dayCount.weeklyOffDays).padStart(6) + '                              ║')
    console.log('    ║  Public holidays:        ' + String(dayCount.publicHolidayDays).padStart(6) + '                              ║')
    console.log('    ║  Expected working days:  ' + String(dayCount.expectedWorkingDays).padStart(6) + '                              ║')
    console.log('    ║  ──────────────────────────────────────────────────          ║')
    console.log('    ║  Paid leave days:        ' + String(dayCount.paidLeaveDays).padStart(6) + '  (sick — within balance)     ║')
    console.log('    ║  Unpaid leave days:      ' + String(dayCount.unpaidLeaveDays).padStart(6) + '                              ║')
    console.log('    ║  Deduction days:         ' + String(dayCount.deductionDays).padStart(6) + '                              ║')
    console.log('    ║  PAYABLE DAYS:           ' + String(dayCount.payableDays).padStart(6) + '                              ║')
    console.log('    ╠══════════════════════════════════════════════════════════════╣')
    console.log('    ║  RESULT: Leave on 29th IS INCLUDED in Sep payroll.          ║')
    console.log('    ║  The day-count service uses the full billing period          ║')
    console.log('    ║  (Sep 1-30), not the billing trigger date (26th).           ║')
    console.log('    ║  Since leave is paid, payable days = full month.            ║')
    console.log('    ╚══════════════════════════════════════════════════════════════╝')

    // The leave is on Sep 29, within Sep 1-30 period
    assert.ok(dayCount.paidLeaveDays >= 1, 'should include the 1 paid sick day')
    assert.equal(dayCount.calendarDays, 30, 'September has 30 days')
    // Paid leave = no deduction
    assert.equal(dayCount.unpaidLeaveDays, 0, 'sick leave is paid')
    assert.equal(dayCount.payableDays, 30, 'full pay — paid leave')
  })

  it('OCTOBER payroll (1-31) — does NOT include the Sep leave', async () => {
    const dayCount = await payrollDayCountService.calculatePayableDays(
      EMPLOYEE_ID, '2025-10-01', '2025-10-31'
    )

    console.log('')
    console.log('    ╔══════════════════════════════════════════════════════════════╗')
    console.log('    ║  OCTOBER 2025 PAYROLL (period: Oct 1-31)                    ║')
    console.log('    ║  The Sep 29 leave should NOT appear here                    ║')
    console.log('    ╠══════════════════════════════════════════════════════════════╣')
    console.log('    ║  Calendar days:          ' + String(dayCount.calendarDays).padStart(6) + '                              ║')
    console.log('    ║  Paid leave days:        ' + String(dayCount.paidLeaveDays).padStart(6) + '                              ║')
    console.log('    ║  Unpaid leave days:      ' + String(dayCount.unpaidLeaveDays).padStart(6) + '                              ║')
    console.log('    ║  Deduction days:         ' + String(dayCount.deductionDays).padStart(6) + '                              ║')
    console.log('    ║  PAYABLE DAYS:           ' + String(dayCount.payableDays).padStart(6) + '                              ║')
    console.log('    ╠══════════════════════════════════════════════════════════════╣')
    console.log('    ║  RESULT: Sep 29 leave does NOT bleed into Oct payroll.      ║')
    console.log('    ║  Each billing period is self-contained (date range query).  ║')
    console.log('    ╚══════════════════════════════════════════════════════════════╝')

    assert.equal(dayCount.calendarDays, 31, 'October has 31 days')
    assert.equal(dayCount.paidLeaveDays, 0, 'no leave in October')
    assert.equal(dayCount.unpaidLeaveDays, 0, 'no unpaid leave in October')
    assert.equal(dayCount.payableDays, 31, 'full month — no leave overlap')
  })

  it('TIMING ANALYSIS: what if invoice was generated on 26th before leave?', async () => {
    // The invoice generation on the 26th calls payrollDayCountService
    // with period Sep 1-30. At that point (Sep 26), the Sep 29 leave
    // doesn't exist yet — it hasn't been requested.
    //
    // AFTER the employee takes leave on Sep 29, re-running day-count
    // for Sep 1-30 would show different numbers.
    //
    // This means: if the invoice was already generated and finalized on Sep 26,
    // the Sep 29 leave would NOT be reflected in the invoice.
    // The leave would need to be handled as an adjustment in the next cycle.

    console.log('')
    console.log('    ┌──────────────────────────────────────────────────────────────┐')
    console.log('    │  TIMING ANALYSIS                                             │')
    console.log('    ├──────────────────────────────────────────────────────────────┤')
    console.log('    │                                                              │')
    console.log('    │  Timeline:                                                   │')
    console.log('    │    Sep 26 — Cron runs, generates invoice for Sep 1-30        │')
    console.log('    │             Invoice uses day-count as of Sep 26              │')
    console.log('    │             Leave on Sep 29 doesn\'t exist yet               │')
    console.log('    │             Invoice shows FULL MONTH (no deductions)         │')
    console.log('    │                                                              │')
    console.log('    │    Sep 29 — Employee takes 1 sick day                        │')
    console.log('    │             Leave is approved                                │')
    console.log('    │             But invoice is ALREADY GENERATED                 │')
    console.log('    │                                                              │')
    console.log('    │  Two scenarios:                                              │')
    console.log('    │                                                              │')
    console.log('    │  A) Leave is PAID (within balance):                          │')
    console.log('    │     → No financial impact. Invoice is correct.               │')
    console.log('    │     → Employee gets full salary either way.                  │')
    console.log('    │     → No adjustment needed.                                  │')
    console.log('    │                                                              │')
    console.log('    │  B) Leave is UNPAID (balance exhausted):                     │')
    console.log('    │     → Invoice overstated (charged full month).               │')
    console.log('    │     → Needs credit/adjustment in next month\'s invoice.      │')
    console.log('    │     → Current system does NOT auto-adjust.                   │')
    console.log('    │     → This is a known gap for future implementation.         │')
    console.log('    │                                                              │')
    console.log('    └──────────────────────────────────────────────────────────────┘')
    console.log('')

    // This test documents the behavior, not a code assertion
    assert.ok(true, 'timing analysis documented')
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. Create & Approve Sick Leave — via leaveService (March 2026)
// ═══════════════════════════════════════════════════════════════

describe('Service: Create & Approve Sick Leave (3 days)', () => {
  let sickRequest = null
  let balanceBefore = null

  it('gets balance before request', async () => {
    balanceBefore = await leaveService.calculateSickLeaveBalance(EMPLOYEE_ID)
    console.log('    Sick balance before: ' + balanceBefore.available + ' days')
    assert.ok(balanceBefore.available >= 3, 'need at least 3 days available for this test')
  })

  it('creates a 3-day sick leave request', async () => {
    sickRequest = await leaveService.createLeaveRequest(EMPLOYEE_ID, ORG_ID, {
      leaveTypeCode: 'sick_leave',
      startDate: '2026-03-16',
      endDate: '2026-03-18',
      reason: 'Service layer test — 3 day sick leave'
    })

    createdLeaveRequestIds.push(sickRequest.id)

    console.log('    Request created: ' + sickRequest.id)
    console.log('    Total days: ' + sickRequest.total_days)
    console.log('    Paid: ' + sickRequest.paid_days + ', Unpaid: ' + sickRequest.unpaid_days)
    console.log('    Status: ' + sickRequest.status)
    console.log('    Medical cert required: ' + sickRequest.medical_certificate_required)

    assert.equal(sickRequest.status, 'pending')
    assert.equal(parseFloat(sickRequest.total_days), 3)
    assert.equal(parseFloat(sickRequest.paid_days), 3, 'all 3 should be paid (within balance)')
    assert.equal(parseFloat(sickRequest.unpaid_days), 0)
    assert.equal(sickRequest.medical_certificate_required, false, '3 days does not require med cert')
  })

  it('approves the sick leave request', async () => {
    const approved = await leaveService.approveLeaveRequest(sickRequest.id, ORG_ID, APPROVER_ID)

    console.log('    Approved: ' + approved.status + ' at ' + approved.approved_at)

    assert.equal(approved.status, 'approved')
    assert.ok(approved.approved_at)
    assert.equal(approved.approved_by, APPROVER_ID)
  })

  it('balance decreased after approval', async () => {
    const balanceAfter = await leaveService.calculateSickLeaveBalance(EMPLOYEE_ID)

    console.log('    Sick balance after: ' + balanceAfter.available + ' days (was ' + balanceBefore.available + ')')

    assert.equal(balanceAfter.available, balanceBefore.available - 3)
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. Create & Approve Home Leave — via leaveService
// ═══════════════════════════════════════════════════════════════

describe('Service: Create & Approve Home Leave (2 days)', () => {
  let homeRequest = null
  let balanceBefore = null

  it('gets balance before request', async () => {
    balanceBefore = await leaveService.calculateHomeLeaveBalance(EMPLOYEE_ID)
    console.log('    Home balance before: ' + balanceBefore.available + ' days')
    assert.ok(balanceBefore.available >= 2, 'need at least 2 days available for this test')
  })

  it('creates a 2-day home leave request', async () => {
    homeRequest = await leaveService.createLeaveRequest(EMPLOYEE_ID, ORG_ID, {
      leaveTypeCode: 'home_leave',
      startDate: '2026-03-19',
      endDate: '2026-03-20',
      reason: 'Service layer test — 2 day home leave'
    })

    createdLeaveRequestIds.push(homeRequest.id)

    console.log('    Request created: ' + homeRequest.id)
    console.log('    Total days: ' + homeRequest.total_days)
    console.log('    Paid: ' + homeRequest.paid_days + ', Unpaid: ' + homeRequest.unpaid_days)

    assert.equal(homeRequest.status, 'pending')
    assert.equal(parseFloat(homeRequest.total_days), 2)
    assert.equal(parseFloat(homeRequest.paid_days), 2, 'all 2 should be paid')
    assert.equal(parseFloat(homeRequest.unpaid_days), 0)
  })

  it('approves the home leave request', async () => {
    const approved = await leaveService.approveLeaveRequest(homeRequest.id, ORG_ID, APPROVER_ID)
    assert.equal(approved.status, 'approved')
    console.log('    Approved at ' + approved.approved_at)
  })

  it('balance decreased after approval', async () => {
    const balanceAfter = await leaveService.calculateHomeLeaveBalance(EMPLOYEE_ID)
    console.log('    Home balance after: ' + balanceAfter.available + ' days (was ' + balanceBefore.available + ')')
    assert.ok(balanceAfter.available <= balanceBefore.available - 2)
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. Create & Approve Maternity Leave — via leaveService
// ═══════════════════════════════════════════════════════════════

describe('Service: Create Maternity Leave (98 days)', () => {
  let maternityRequest = null

  it('creates maternity leave request', async () => {
    maternityRequest = await leaveService.createMaternityLeaveRequest(EMPLOYEE_ID, ORG_ID, {
      expectedDeliveryDate: '2026-04-15',
      leaveStartDate: '2026-03-22',
      coverWithAccumulated: false
    })

    createdLeaveRequestIds.push(maternityRequest.id)

    console.log('    Request created: ' + maternityRequest.id)
    console.log('    Total days: ' + maternityRequest.total_days)
    console.log('    Paid: ' + maternityRequest.paid_days + ' (first 60 days)')
    console.log('    Unpaid: ' + maternityRequest.unpaid_days + ' (remaining 38 days)')
    console.log('    Pre-delivery days: ' + maternityRequest.preDeliveryDays)
    console.log('    Start: ' + maternityRequest.start_date)
    console.log('    End: ' + maternityRequest.end_date)

    assert.equal(maternityRequest.status, 'pending')
    assert.equal(parseFloat(maternityRequest.total_days), 98)
    assert.equal(parseFloat(maternityRequest.paid_days), 60)
    assert.equal(parseFloat(maternityRequest.unpaid_days), 38)
    assert.ok(maternityRequest.preDeliveryDays >= 14, 'must be >= 14 days before delivery')
  })

  it('approves the maternity leave request', async () => {
    const approved = await leaveService.approveLeaveRequest(maternityRequest.id, ORG_ID, APPROVER_ID)
    assert.equal(approved.status, 'approved')
    console.log('    Maternity leave approved')
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. Payroll Day-Count — via payrollDayCountService
//    Period: March 2026 (all 3 leaves overlap this month)
// ═══════════════════════════════════════════════════════════════

describe('Service: Payroll Day-Count for March 2026', () => {
  it('calculates payable days with all 3 leave types', async () => {
    const dayCount = await payrollDayCountService.calculatePayableDays(
      EMPLOYEE_ID,
      '2026-03-01',
      '2026-03-31'
    )

    console.log('')
    console.log('    ╔══════════════════════════════════════════════════════╗')
    console.log('    ║     PAYROLL DAY-COUNT — MARCH 2026                  ║')
    console.log('    ║     Employee: Sam Thapa (sam@inergyx.us)            ║')
    console.log('    ╠══════════════════════════════════════════════════════╣')
    console.log('    ║  Calendar days:          ' + String(dayCount.calendarDays).padStart(6) + '                    ║')
    console.log('    ║  Weekly off days:        ' + String(dayCount.weeklyOffDays).padStart(6) + '                    ║')
    console.log('    ║  Public holidays:        ' + String(dayCount.publicHolidayDays).padStart(6) + '                    ║')
    console.log('    ║  Expected working days:  ' + String(dayCount.expectedWorkingDays).padStart(6) + '                    ║')
    console.log('    ║  ──────────────────────────────────────────────     ║')
    console.log('    ║  Paid leave days:        ' + String(dayCount.paidLeaveDays).padStart(6) + '                    ║')
    console.log('    ║  Unpaid leave days:      ' + String(dayCount.unpaidLeaveDays).padStart(6) + '                    ║')
    console.log('    ║  Deduction days:         ' + String(dayCount.deductionDays).padStart(6) + '                    ║')
    console.log('    ║  PAYABLE DAYS:           ' + String(dayCount.payableDays).padStart(6) + '                    ║')
    console.log('    ╚══════════════════════════════════════════════════════╝')

    if (dayCount.publicHolidays && dayCount.publicHolidays.length > 0) {
      console.log('    Public holidays:')
      dayCount.publicHolidays.forEach(h => console.log('      - ' + h.date + ': ' + h.name))
    }

    // Assertions
    assert.equal(dayCount.calendarDays, 31, 'March has 31 days')
    assert.ok(dayCount.weeklyOffDays >= 4, 'at least 4 Saturdays')
    assert.ok(dayCount.payableDays <= 31, 'payable cannot exceed calendar')
    assert.ok(dayCount.payableDays >= 0, 'payable cannot be negative')
    assert.equal(dayCount.deductionDays, dayCount.unpaidLeaveDays, 'deductions = unpaid leave')

    // The sick (3 days) and home (2 days) are paid — no deduction
    // Maternity: Mar 22-31 = ~10 days overlap, all within first 60 paid days — no deduction
    // So deduction should only come from unpaid portions (if any)
    console.log('')
    console.log('    Analysis:')
    console.log('    - Sick leave (Mar 16-18): 3 days PAID — no deduction')
    console.log('    - Home leave (Mar 19-20): 2 days PAID — no deduction')
    console.log('    - Maternity (Mar 22-31): ~8 working days, within first 60 paid days')
    console.log('    - Unpaid deduction days: ' + dayCount.unpaidLeaveDays)
  })

  it('calculates salary breakdown', async () => {
    const dayCount = await payrollDayCountService.calculatePayableDays(
      EMPLOYEE_ID,
      '2026-03-01',
      '2026-03-31'
    )

    const monthlyCTC = 1000000 / 12  // annual 1,000,000 / 12
    const dailyRate = monthlyCTC / dayCount.calendarDays
    const grossPay = Math.round(dailyRate * dayCount.payableDays)
    const leaveDeduction = Math.round(dailyRate * dayCount.deductionDays)
    const basicSalary = Math.round(grossPay * 0.60)
    const employerSSF = Math.round(basicSalary * 0.20)
    const employeeSSF = Math.round(basicSalary * 0.11)
    const netPay = grossPay - employeeSSF

    console.log('')
    console.log('    ╔══════════════════════════════════════════════════════╗')
    console.log('    ║     PAYSLIP — SAM THAPA — MARCH 2026               ║')
    console.log('    ╠══════════════════════════════════════════════════════╣')
    console.log('    ║  Monthly CTC:        NPR ' + Math.round(monthlyCTC).toLocaleString().padStart(10) + '             ║')
    console.log('    ║  Payable days:        ' + String(dayCount.payableDays).padStart(3) + ' / ' + dayCount.calendarDays + '                      ║')
    console.log('    ║  Daily rate:          NPR ' + dailyRate.toFixed(2).padStart(10) + '             ║')
    console.log('    ║  ──────────────────────────────────────────────     ║')
    console.log('    ║  Gross pay:           NPR ' + grossPay.toLocaleString().padStart(10) + '             ║')
    console.log('    ║  Leave deduction:    -NPR ' + leaveDeduction.toLocaleString().padStart(10) + '             ║')
    console.log('    ║  Basic salary (60%):  NPR ' + basicSalary.toLocaleString().padStart(10) + '             ║')
    console.log('    ║  Employer SSF (20%):  NPR ' + employerSSF.toLocaleString().padStart(10) + '             ║')
    console.log('    ║  Employee SSF (11%): -NPR ' + employeeSSF.toLocaleString().padStart(10) + '             ║')
    console.log('    ║  ──────────────────────────────────────────────     ║')
    console.log('    ║  NET PAY:             NPR ' + netPay.toLocaleString().padStart(10) + '             ║')
    console.log('    ║  EMPLOYER COST:       NPR ' + (grossPay + employerSSF).toLocaleString().padStart(10) + '             ║')
    console.log('    ╚══════════════════════════════════════════════════════╝')
    console.log('')

    assert.ok(grossPay > 0, 'gross pay must be positive')
    assert.ok(netPay > 0, 'net pay must be positive')
    assert.ok(netPay <= grossPay, 'net pay cannot exceed gross')
    assert.equal(grossPay + leaveDeduction, Math.round(monthlyCTC), 'gross + deduction = full CTC')
  })
})

// ═══════════════════════════════════════════════════════════════
// 8. Sample Invoice — generated from payroll day-count + EOR config
// ═══════════════════════════════════════════════════════════════

describe('Service: Sample Billing Invoice for March 2026', () => {
  it('generates a full invoice with line items', async () => {
    // Fetch EOR config
    const { data: config } = await supabase
      .from('eor_cost_config')
      .select('*')
      .eq('country_code', 'NPL')
      .eq('is_active', true)
      .single()

    assert.ok(config, 'EOR config must exist for NPL')

    // Fetch org details
    const { data: org } = await supabase
      .from('organizations')
      .select('name, billing_email, email, payment_type, stripe_customer_id')
      .eq('id', ORG_ID)
      .single()

    assert.ok(org, 'Organization must exist')

    // Fetch employee details
    const { data: member } = await supabase
      .from('organization_members')
      .select('id, salary_amount, salary_currency, job_title, department, profile:profiles!organization_members_profile_id_fkey(full_name, email)')
      .eq('id', EMPLOYEE_ID)
      .single()

    // Calculate payroll day-count
    const dayCount = await payrollDayCountService.calculatePayableDays(
      EMPLOYEE_ID, '2026-03-01', '2026-03-31'
    )

    const exchangeRate = parseFloat(config.exchange_rate)
    const employerSsfRate = parseFloat(config.employer_ssf_rate)
    const employeeSsfRate = parseFloat(config.employee_ssf_rate)
    const platformFeeCents = config.platform_fee_amount
    const periodsPerYear = config.periods_per_year

    const annualSalary = parseFloat(member.salary_amount)
    const fullMonthlyGross = Math.round((annualSalary / periodsPerYear) * 100) // paisa

    // Prorate for unpaid leave
    let monthlyGross = fullMonthlyGross
    if (dayCount.deductionDays > 0 && dayCount.calendarDays > 0) {
      const dailyRate = Math.round(fullMonthlyGross / dayCount.calendarDays)
      monthlyGross = dailyRate * dayCount.payableDays
    }

    const employerSsf = Math.round(monthlyGross * employerSsfRate)
    const employeeSsf = Math.round(monthlyGross * employeeSsfRate)
    const totalCostLocal = monthlyGross + employerSsf
    const costUsdCents = Math.round(totalCostLocal * exchangeRate)
    const totalAmountCents = costUsdCents + platformFeeCents

    // Invoice metadata
    const invoiceDate = '2026-03-28'
    const dueDate = '2026-04-01'
    const periodStart = '2026-03-01'
    const periodEnd = '2026-03-31'
    const employeeName = member.profile?.full_name || 'Sam Thapa'
    const employeeEmail = member.profile?.email || 'sam@inergyx.us'

    // Format helpers
    const npr = (paisa) => 'NPR ' + (paisa / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const usd = (cents) => '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    console.log('')
    console.log('    ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓')
    console.log('    ┃                                                                    ┃')
    console.log('    ┃   T A L Y N                              INVOICE                   ┃')
    console.log('    ┃                                                                    ┃')
    console.log('    ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫')
    console.log('    ┃  Invoice No:    INV-2026-XXXX (sample)                             ┃')
    console.log('    ┃  Issue Date:    ' + invoiceDate + '                                          ┃')
    console.log('    ┃  Due Date:      ' + dueDate + '                                          ┃')
    console.log('    ┃  Period:        ' + periodStart + ' to ' + periodEnd + '                          ┃')
    console.log('    ┃  Status:        PENDING                                            ┃')
    console.log('    ┃                                                                    ┃')
    console.log('    ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫')
    console.log('    ┃  BILL TO                                                           ┃')
    console.log('    ┃  Organization:  ' + org.name.padEnd(50) + '  ┃')
    console.log('    ┃  Email:         ' + (org.billing_email || org.email).padEnd(50) + '  ┃')
    console.log('    ┃  Payment:       ' + org.payment_type.padEnd(50) + '  ┃')
    console.log('    ┃  Stripe ID:     ' + (org.stripe_customer_id || 'N/A').padEnd(50) + '  ┃')
    console.log('    ┃                                                                    ┃')
    console.log('    ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫')
    console.log('    ┃  EMPLOYEE LINE ITEM                                                ┃')
    console.log('    ┃  ────────────────────────────────────────────────────────────       ┃')
    console.log('    ┃  Name:          ' + employeeName.padEnd(50) + '  ┃')
    console.log('    ┃  Email:         ' + employeeEmail.padEnd(50) + '  ┃')
    console.log('    ┃  Job Title:     ' + (member.job_title || 'N/A').padEnd(50) + '  ┃')
    console.log('    ┃  Annual Salary: ' + ('NPR ' + annualSalary.toLocaleString()).padEnd(50) + '  ┃')
    console.log('    ┃                                                                    ┃')
    console.log('    ┃  ATTENDANCE & LEAVE                                                ┃')
    console.log('    ┃  ────────────────────────────────────────────────────────────       ┃')
    console.log('    ┃  Calendar days:        ' + String(dayCount.calendarDays).padStart(5) + '                                     ┃')
    console.log('    ┃  Weekly offs:           ' + String(dayCount.weeklyOffDays).padStart(5) + '                                     ┃')
    console.log('    ┃  Public holidays:       ' + String(dayCount.publicHolidayDays).padStart(5) + '                                     ┃')
    console.log('    ┃  Working days:          ' + String(dayCount.expectedWorkingDays).padStart(5) + '                                     ┃')
    console.log('    ┃  Paid leave days:       ' + String(dayCount.paidLeaveDays).padStart(5) + '                                     ┃')
    console.log('    ┃  Unpaid leave days:     ' + String(dayCount.unpaidLeaveDays).padStart(5) + '                                     ┃')
    console.log('    ┃  Payable days:          ' + String(dayCount.payableDays).padStart(5) + ' / ' + dayCount.calendarDays + '                                ┃')
    console.log('    ┃                                                                    ┃')
    console.log('    ┃  COST BREAKDOWN (LOCAL CURRENCY)                                   ┃')
    console.log('    ┃  ────────────────────────────────────────────────────────────       ┃')
    console.log('    ┃  Full monthly gross:    ' + npr(fullMonthlyGross).padStart(20) + '                        ┃')
    if (dayCount.deductionDays > 0) {
    console.log('    ┃  Prorated gross:        ' + npr(monthlyGross).padStart(20) + '  (' + dayCount.payableDays + '/' + dayCount.calendarDays + ' days)       ┃')
    }
    console.log('    ┃  Employer SSF (20%):    ' + npr(employerSsf).padStart(20) + '                        ┃')
    console.log('    ┃  Employee SSF (11%):    ' + npr(employeeSsf).padStart(20) + '  (deducted from pay)   ┃')
    console.log('    ┃  Total cost (local):    ' + npr(totalCostLocal).padStart(20) + '                        ┃')
    console.log('    ┃                                                                    ┃')
    console.log('    ┃  USD CONVERSION                                                    ┃')
    console.log('    ┃  ────────────────────────────────────────────────────────────       ┃')
    console.log('    ┃  Exchange rate:         1 NPR = ' + exchangeRate + ' USD                          ┃')
    console.log('    ┃  Payroll cost (USD):    ' + usd(costUsdCents).padStart(20) + '                        ┃')
    console.log('    ┃  Platform fee:          ' + usd(platformFeeCents).padStart(20) + '                        ┃')
    console.log('    ┃                         ─────────────────────                      ┃')
    console.log('    ┃  TOTAL DUE:             ' + usd(totalAmountCents).padStart(20) + '                        ┃')
    console.log('    ┃                                                                    ┃')
    console.log('    ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫')
    console.log('    ┃  CONFIG SNAPSHOT                                                   ┃')
    console.log('    ┃  Country:       ' + (config.country_name + ' (' + config.country_code + ')').padEnd(50) + '  ┃')
    console.log('    ┃  Employer SSF:  ' + (parseFloat(config.employer_ssf_rate) * 100 + '%').padEnd(50) + '  ┃')
    console.log('    ┃  Employee SSF:  ' + (parseFloat(config.employee_ssf_rate) * 100 + '%').padEnd(50) + '  ┃')
    console.log('    ┃  Platform fee:  ' + usd(config.platform_fee_amount).padEnd(50) + '  ┃')
    console.log('    ┃  FX rate:       ' + String(config.exchange_rate).padEnd(50) + '  ┃')
    console.log('    ┃  Effective:     ' + config.effective_from.padEnd(50) + '  ┃')
    console.log('    ┃                                                                    ┃')
    console.log('    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛')
    console.log('')

    // Assertions
    assert.ok(config.exchange_rate, 'exchange rate must be set')
    assert.ok(totalAmountCents > 0, 'total invoice amount must be positive')
    assert.ok(costUsdCents > 0, 'USD payroll cost must be positive')
    assert.ok(employerSsf > 0, 'employer SSF must be positive')
    assert.ok(monthlyGross > 0, 'monthly gross must be positive')
    assert.ok(monthlyGross <= fullMonthlyGross, 'prorated cannot exceed full month')

    // Verify the math
    assert.equal(totalCostLocal, monthlyGross + employerSsf, 'total local = gross + employer SSF')
    assert.equal(totalAmountCents, costUsdCents + platformFeeCents, 'total USD = payroll USD + platform fee')
  })
})

// ═══════════════════════════════════════════════════════════════
// 9. Combined Balance Summary — via leaveService
// ═══════════════════════════════════════════════════════════════

describe('Service: Combined Leave Balance Summary', () => {
  it('returns all balances in one call', async () => {
    const summary = await leaveService.getLeaveBalanceSummary(EMPLOYEE_ID)

    console.log('    ┌──────────────────────────────────────────┐')
    console.log('    │  LEAVE BALANCE SUMMARY — Sam Thapa       │')
    console.log('    ├──────────────────────────────────────────┤')
    console.log('    │  Fiscal Year: ' + summary.fiscalYear.padStart(25) + '  │')
    console.log('    │                                          │')
    console.log('    │  Sick Leave:                             │')
    console.log('    │    Carry-forward: ' + String(summary.sickLeave.carryForward).padStart(20) + '  │')
    console.log('    │    Accrued:       ' + String(summary.sickLeave.currentYearAccrued).padStart(20) + '  │')
    console.log('    │    Taken:         ' + String(summary.sickLeave.taken).padStart(20) + '  │')
    console.log('    │    Available:     ' + String(summary.sickLeave.available).padStart(20) + '  │')
    console.log('    │                                          │')
    console.log('    │  Home Leave:                             │')
    console.log('    │    Accrued:       ' + String(summary.homeLeave.currentYearAccrued).padStart(20) + '  │')
    console.log('    │    Taken:         ' + String(summary.homeLeave.taken).padStart(20) + '  │')
    console.log('    │    Available:     ' + String(summary.homeLeave.available).padStart(20) + '  │')
    console.log('    └──────────────────────────────────────────┘')

    assert.ok(summary.sickLeave)
    assert.ok(summary.homeLeave)
    assert.ok(summary.fiscalYear)
  })
})
