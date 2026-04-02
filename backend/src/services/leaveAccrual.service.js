import { supabase } from '../config/supabase.js'
import { adToBs, getCurrentFiscalYear, getDaysInBsMonth } from '../utils/nepaliDate.js'

/**
 * Leave Accrual Service
 * Handles monthly leave accrual (cron-triggered) and fiscal year rollover.
 * Nepal Labour Act 2074: Sick leave §44, Home leave §43.
 */
export const leaveAccrualService = {
  /**
   * Run monthly leave accrual. Called daily; only acts on BS month day 1.
   * Accrues sick leave (1 day/month) and home leave (1.5 days/month) for all active employees.
   * Idempotent via leave_processing_log.
   *
   * @param {boolean} force — bypass date check (for manual admin trigger)
   * @returns {{ processed: boolean, sickLeave: object, homeLeave: object }}
   */
  async runMonthlyAccrual(force = false) {
    const todayAd = new Date()
    const todayBs = adToBs(todayAd)

    // Only run on BS month day 1 (unless forced)
    if (!force && todayBs.day !== 1) {
      return { processed: false, reason: `BS day is ${todayBs.day}, not 1` }
    }

    const sickResult = await this._accrueLeaveType('sick_leave', 1.0, todayAd, todayBs)
    const homeResult = await this._accrueLeaveType('home_leave', 1.5, todayAd, todayBs)

    return { processed: true, sickLeave: sickResult, homeLeave: homeResult }
  },

  /**
   * Run fiscal year rollover. Called daily; only acts on Shrawan 1 (BS month 4, day 1).
   * - Lapses home leave balances (no carry-forward)
   * - Carries forward sick leave balances (capped at 45)
   * - Creates new FY balance rows
   */
  async runFiscalYearRollover(force = false) {
    const todayAd = new Date()
    const todayBs = adToBs(todayAd)

    // Only run on Shrawan 1 (month 4, day 1)
    if (!force && (todayBs.month !== 4 || todayBs.day !== 1)) {
      return { processed: false, reason: `BS date is ${todayBs.year}-${todayBs.month}-${todayBs.day}, not Shrawan 1` }
    }

    const newFy = getCurrentFiscalYear(todayAd)

    // Get previous FY identifier
    const prevFyYear = newFy.fyStartBs.year - 1
    const prevFy = `${prevFyYear}/${String(prevFyYear + 1).slice(-2)}`

    // Get all active employees across all orgs
    const { data: members, error: membersError } = await supabase
      .from('organization_members')
      .select('id, organization_id')
      .eq('status', 'active')
      .neq('member_role', 'owner')
      .neq('member_role', 'authorized_user')

    if (membersError) throw membersError

    let homeLapsed = 0
    let sickCarried = 0

    for (const member of (members || [])) {
      // ── Home leave: lapse remaining balance ──
      const { data: homeBalance } = await supabase
        .from('leave_balances')
        .select('id, available')
        .eq('employee_id', member.id)
        .eq('leave_type_code', 'home_leave')
        .eq('fiscal_year', prevFy)
        .single()

      if (homeBalance && parseFloat(homeBalance.available) > 0) {
        // Record lapse
        await supabase.from('leave_lapses').insert({
          employee_id: member.id,
          organization_id: member.organization_id,
          leave_type_code: 'home_leave',
          lapsed_days: parseFloat(homeBalance.available),
          fiscal_year: prevFy,
          lapse_date: todayAd.toISOString().split('T')[0],
          reason: 'Fiscal year rollover — home leave does not carry forward (Labour Act §43)'
        })

        // Update old balance
        await supabase
          .from('leave_balances')
          .update({ lapsed: parseFloat(homeBalance.available), available: 0, last_updated_at: new Date().toISOString() })
          .eq('id', homeBalance.id)

        homeLapsed++
      }

      // Create new FY home leave balance (starts at 0)
      await supabase.from('leave_balances').upsert({
        employee_id: member.id,
        organization_id: member.organization_id,
        leave_type_code: 'home_leave',
        fiscal_year: newFy.bsFiscalYear,
        carry_forward: 0,
        accrued: 0,
        taken: 0,
        lapsed: 0,
        available: 0
      }, { onConflict: 'employee_id,leave_type_code,fiscal_year' })

      // ── Sick leave: carry forward (capped at 45) ──
      const { data: sickBalance } = await supabase
        .from('leave_balances')
        .select('id, available')
        .eq('employee_id', member.id)
        .eq('leave_type_code', 'sick_leave')
        .eq('fiscal_year', prevFy)
        .single()

      const sickCarryForward = Math.min(parseFloat(sickBalance?.available || 0), 45)

      await supabase.from('leave_balances').upsert({
        employee_id: member.id,
        organization_id: member.organization_id,
        leave_type_code: 'sick_leave',
        fiscal_year: newFy.bsFiscalYear,
        carry_forward: sickCarryForward,
        accrued: 0,
        taken: 0,
        lapsed: 0,
        available: sickCarryForward
      }, { onConflict: 'employee_id,leave_type_code,fiscal_year' })

      if (sickCarryForward > 0) sickCarried++
    }

    return {
      processed: true,
      newFiscalYear: newFy.bsFiscalYear,
      previousFiscalYear: prevFy,
      employeesProcessed: (members || []).length,
      homeLeaveLapsed: homeLapsed,
      sickLeaveCarriedForward: sickCarried
    }
  },

  // ─── Private ────────────────────────────────────────────────

  async _accrueLeaveType(leaveTypeCode, amount, todayAd, todayBs) {
    const bsKey = `${todayBs.year}-${todayBs.month}`

    // Idempotency check
    const { data: existing } = await supabase
      .from('leave_processing_log')
      .select('id')
      .eq('leave_type_code', leaveTypeCode)
      .eq('bs_year', todayBs.year)
      .eq('bs_month', todayBs.month)
      .single()

    if (existing) {
      return { skipped: true, reason: `Already processed ${leaveTypeCode} for BS ${bsKey}` }
    }

    const fy = getCurrentFiscalYear(todayAd)

    // Get all active employees across all orgs
    const { data: members, error } = await supabase
      .from('organization_members')
      .select('id, organization_id, joined_at')
      .eq('status', 'active')
      .neq('member_role', 'owner')
      .neq('member_role', 'authorized_user')

    if (error) throw error

    let processed = 0

    for (const member of (members || [])) {
      if (!member.joined_at) continue

      // Home leave: 20-day eligibility check
      if (leaveTypeCode === 'home_leave') {
        const daysSinceJoining = Math.round(
          (todayAd.getTime() - new Date(member.joined_at).getTime()) / 86400000
        )
        if (daysSinceJoining < 20) continue
      }

      // Check caps
      const cap = leaveTypeCode === 'sick_leave' ? 45 : 18

      // Get current balance for cap check
      const { data: balance } = await supabase
        .from('leave_balances')
        .select('accrued, carry_forward, taken, available')
        .eq('employee_id', member.id)
        .eq('leave_type_code', leaveTypeCode)
        .eq('fiscal_year', fy.bsFiscalYear)
        .single()

      const currentTotal = leaveTypeCode === 'sick_leave'
        ? parseFloat(balance?.carry_forward || 0) + parseFloat(balance?.accrued || 0) - parseFloat(balance?.taken || 0)
        : parseFloat(balance?.accrued || 0) - parseFloat(balance?.taken || 0)

      if (currentTotal >= cap) continue

      const actualAccrual = Math.min(amount, cap - currentTotal)
      if (actualAccrual <= 0) continue

      // Insert accrual record (idempotent via unique constraint)
      const { error: accrualError } = await supabase
        .from('leave_accruals')
        .insert({
          employee_id: member.id,
          organization_id: member.organization_id,
          leave_type_code: leaveTypeCode,
          accrual_amount: actualAccrual,
          bs_year: todayBs.year,
          bs_month: todayBs.month,
          accrual_date_ad: todayAd.toISOString().split('T')[0],
          fiscal_year: fy.bsFiscalYear
        })

      if (accrualError && accrualError.code === '23505') continue // duplicate, skip
      if (accrualError) throw accrualError

      // Upsert balance
      const newAccrued = parseFloat(balance?.accrued || 0) + actualAccrual
      const newAvailable = parseFloat(balance?.carry_forward || 0) + newAccrued - parseFloat(balance?.taken || 0)

      await supabase.from('leave_balances').upsert({
        employee_id: member.id,
        organization_id: member.organization_id,
        leave_type_code: leaveTypeCode,
        fiscal_year: fy.bsFiscalYear,
        carry_forward: parseFloat(balance?.carry_forward || 0),
        accrued: newAccrued,
        taken: parseFloat(balance?.taken || 0),
        lapsed: 0,
        available: Math.max(newAvailable, 0)
      }, { onConflict: 'employee_id,leave_type_code,fiscal_year' })

      processed++
    }

    // Log processing
    await supabase.from('leave_processing_log').insert({
      leave_type_code: leaveTypeCode,
      bs_year: todayBs.year,
      bs_month: todayBs.month,
      employees_processed: processed
    })

    return { processed: true, employeesProcessed: processed, bsMonth: bsKey }
  }
}
