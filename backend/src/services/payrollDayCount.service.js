import { supabase } from '../config/supabase.js'
import { leaveService } from './leave.service.js'
import { publicHolidayService } from './publicHoliday.service.js'
import { countWorkingDays } from '../utils/nepaliDate.js'

/**
 * Payroll Day-Count Service
 * Calculates payable days for a payroll period by subtracting unpaid leave
 * and unauthorized absences from calendar days.
 *
 * Key rules:
 * - Paid leave does NOT reduce payable days (employee is paid from balance)
 * - Public holidays do NOT reduce payable days (paid days off)
 * - Only unpaid leave and unauthorized absences reduce pay
 * - Weekly offs and public holidays are tracked for reporting breakdown
 */
export const payrollDayCountService = {
  /**
   * Calculate payable days for an employee in a payroll period.
   *
   * @param {string} employeeId — organization_members.id
   * @param {string} periodStart — YYYY-MM-DD
   * @param {string} periodEnd — YYYY-MM-DD
   * @returns {object} Full day-count breakdown
   */
  async calculatePayableDays(employeeId, periodStart, periodEnd) {
    const start = new Date(periodStart)
    const end = new Date(periodEnd)
    const calendarDays = Math.round((end - start) / 86400000) + 1

    // Get employee details
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, weekly_off_day, gender')
      .eq('id', employeeId)
      .single()

    const weeklyOff = member?.weekly_off_day || 'Saturday'
    const orgId = member?.organization_id

    // Count weekly off days in the period
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const offDayIndex = dayNames.indexOf(weeklyOff)
    let weeklyOffDays = 0
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === offDayIndex) weeklyOffDays++
    }

    // Get public holidays in the period (filtered by employee gender)
    let publicHolidayDays = 0
    let publicHolidayList = []
    if (orgId) {
      try {
        const holidays = await publicHolidayService.getHolidaysForEmployee(employeeId, periodStart, periodEnd)
        publicHolidayList = holidays

        // Count holidays that don't fall on weekly off (avoid double-counting)
        for (const h of holidays) {
          const hDate = new Date(h.date_ad)
          if (hDate.getDay() !== offDayIndex) {
            publicHolidayDays++
          }
        }
      } catch {
        // If holiday service fails, continue without holiday data
      }
    }

    // Expected working days = calendar - weekly offs - public holidays
    const expectedWorkingDays = calendarDays - weeklyOffDays - publicHolidayDays

    // Get all approved leave requests overlapping this period
    const leaveRequests = await leaveService.getApprovedLeaveInPeriod(employeeId, periodStart, periodEnd)

    let totalPaidLeaveDays = 0
    let totalUnpaidLeaveDays = 0

    for (const request of leaveRequests) {
      const overlapStart = new Date(Math.max(new Date(request.start_date), start))
      const overlapEnd = new Date(Math.min(new Date(request.end_date), end))

      if (overlapStart > overlapEnd) continue

      const overlapWorkingDays = countWorkingDays(overlapStart, overlapEnd, weeklyOff)

      const requestTotal = parseFloat(request.total_days) || 1
      const paidRatio = parseFloat(request.paid_days) / requestTotal
      const paidPortion = Math.round(overlapWorkingDays * paidRatio * 10) / 10
      const unpaidPortion = Math.round((overlapWorkingDays - paidPortion) * 10) / 10

      totalPaidLeaveDays += paidPortion
      totalUnpaidLeaveDays += unpaidPortion
    }

    // Payable days = calendar days minus unpaid leave only
    // (paid leave, public holidays, and weekly offs do NOT reduce pay)
    const deductionDays = totalUnpaidLeaveDays
    const payableDays = Math.max(calendarDays - deductionDays, 0)

    return {
      calendarDays,
      weeklyOffDays,
      publicHolidayDays,
      expectedWorkingDays,
      paidLeaveDays: totalPaidLeaveDays,
      unpaidLeaveDays: totalUnpaidLeaveDays,
      deductionDays,
      payableDays,
      publicHolidays: publicHolidayList.map(h => ({ date: h.date_ad, name: h.name }))
    }
  }
}
