import { supabase } from '../config/supabase.js'
import { BadRequestError, NotFoundError } from '../utils/errors.js'
import {
  adToBs, getCurrentFiscalYear, countBsMonthsElapsed,
  countWorkingDays, countConsecutiveCalendarDays, daysBetween
} from '../utils/nepaliDate.js'

/**
 * Nepal Leave Service
 * Implements Labour Act 2074 sick leave (§44) and home leave (§43) calculations.
 */
export const leaveService = {
  // ─── Balance Calculations ───────────────────────────────────

  /**
   * Calculate sick leave balance for an employee as of a given date.
   * Sick leave: 1 day/BS month, carries forward up to 45 days max, encashable.
   */
  async calculateSickLeaveBalance(employeeId, asOfDate = new Date()) {
    const member = await this._getEmployee(employeeId)
    const joinedAt = member.joined_at
    if (!joinedAt) throw new BadRequestError('Employee has no joining date')

    const fy = getCurrentFiscalYear(asOfDate)

    // Step 1: Carry-forward from prior years
    let carryForward = 0
    if (new Date(joinedAt) < fy.fyStartAd) {
      const { data } = await supabase
        .from('leave_balances')
        .select('available')
        .eq('employee_id', employeeId)
        .eq('leave_type_code', 'sick_leave')
        .lt('fiscal_year', fy.bsFiscalYear)
        .order('fiscal_year', { ascending: false })
        .limit(1)
        .single()

      carryForward = Math.min(parseFloat(data?.available || 0), 45)
    }

    // Step 2: Current year accrual
    const accrualStart = new Date(joinedAt) < fy.fyStartAd
      ? adToBs(fy.fyStartAd)
      : adToBs(joinedAt)
    const bsMonths = countBsMonthsElapsed(accrualStart, asOfDate)
    const accrued = Math.min(bsMonths, 12) // 1 day/month, cap 12/year

    // Step 3: Leave taken this fiscal year
    const taken = await this._getLeaveTakenInFy(employeeId, 'sick_leave', fy)

    // Step 4: Available (capped at 45)
    const raw = carryForward + accrued - taken
    const available = Math.min(Math.max(raw, 0), 45)

    return {
      leaveType: 'sick_leave',
      carryForward,
      currentYearAccrued: accrued,
      taken,
      available,
      totalAccumulated: Math.max(raw, 0),
      annualEntitlement: 12,
      maxAccumulation: 45,
      fiscalYear: fy.bsFiscalYear
    }
  },

  /**
   * Calculate home leave balance for an employee as of a given date.
   * Home leave: 1.5 days/BS month, no carry-forward, not encashable, 20-day eligibility.
   */
  async calculateHomeLeaveBalance(employeeId, asOfDate = new Date()) {
    const member = await this._getEmployee(employeeId)
    const joinedAt = member.joined_at
    if (!joinedAt) throw new BadRequestError('Employee has no joining date')

    const fy = getCurrentFiscalYear(asOfDate)

    // Home leave never carries forward
    const carryForward = 0

    // Check 20-day eligibility
    const daysSinceJoining = daysBetween(asOfDate, joinedAt)
    let accrued = 0

    if (daysSinceJoining >= 20) {
      const accrualStart = new Date(joinedAt) < fy.fyStartAd
        ? adToBs(fy.fyStartAd)
        : adToBs(joinedAt)
      const bsMonths = countBsMonthsElapsed(accrualStart, asOfDate)
      accrued = Math.min(bsMonths * 1.5, 18) // 1.5 days/month, cap 18/year
    }

    const taken = await this._getLeaveTakenInFy(employeeId, 'home_leave', fy)
    const available = Math.max(carryForward + accrued - taken, 0)

    return {
      leaveType: 'home_leave',
      carryForward,
      currentYearAccrued: accrued,
      taken,
      available,
      annualEntitlement: 18,
      maxAccumulation: null,
      fiscalYear: fy.bsFiscalYear,
      eligibleFromDate: new Date(new Date(joinedAt).getTime() + 20 * 86400000)
    }
  },

  /**
   * Get combined leave balance summary for an employee.
   */
  async getLeaveBalanceSummary(employeeId) {
    const [sickLeave, homeLeave] = await Promise.all([
      this.calculateSickLeaveBalance(employeeId),
      this.calculateHomeLeaveBalance(employeeId)
    ])

    return {
      sickLeave,
      homeLeave,
      fiscalYear: sickLeave.fiscalYear
    }
  },

  // ─── Leave Requests ─────────────────────────────────────────

  /**
   * Validate and create a leave request.
   */
  async createLeaveRequest(employeeId, orgId, data) {
    const { leaveTypeCode, startDate, endDate, reason } = data

    if (!['sick_leave', 'home_leave'].includes(leaveTypeCode)) {
      throw new BadRequestError('Invalid leave type. Must be sick_leave or home_leave.')
    }

    const member = await this._getEmployee(employeeId)
    const weeklyOff = member.weekly_off_day || 'Saturday'

    // Calculate working days
    const totalDays = countWorkingDays(startDate, endDate, weeklyOff)
    if (totalDays <= 0) throw new BadRequestError('Leave request must be for at least 1 working day')

    // Get balance
    const balance = leaveTypeCode === 'sick_leave'
      ? await this.calculateSickLeaveBalance(employeeId, new Date(startDate))
      : await this.calculateHomeLeaveBalance(employeeId, new Date(startDate))

    // Split paid vs unpaid
    const paidDays = Math.min(totalDays, balance.available)
    const unpaidDays = Math.max(totalDays - balance.available, 0)

    // Medical certificate check (sick leave > 3 consecutive days)
    const consecutiveDays = countConsecutiveCalendarDays(startDate, endDate)
    const medicalCertRequired = leaveTypeCode === 'sick_leave' && consecutiveDays > 3

    const fy = getCurrentFiscalYear(new Date(startDate))

    const { data: request, error } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: employeeId,
        organization_id: orgId,
        leave_type_code: leaveTypeCode,
        start_date: startDate,
        end_date: endDate,
        total_days: totalDays,
        paid_days: paidDays,
        unpaid_days: unpaidDays,
        reason,
        status: 'pending',
        medical_certificate_required: medicalCertRequired,
        fiscal_year: fy.bsFiscalYear
      })
      .select()
      .single()

    if (error) throw error

    return {
      ...request,
      warnings: medicalCertRequired
        ? ['Medical certificate from a recognized doctor is required for sick leave exceeding 3 consecutive days (Labour Act §44(2)).']
        : []
    }
  },

  /**
   * Approve a leave request and update the balance.
   */
  async approveLeaveRequest(requestId, orgId, approverId) {
    const { data: request, error: findError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', requestId)
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .single()

    if (findError || !request) throw new NotFoundError('Pending leave request not found')

    // Update request status
    const { data: updated, error: updateError } = await supabase
      .from('leave_requests')
      .update({
        status: 'approved',
        approved_by: approverId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) throw updateError

    // Update or create leave balance record
    await this._updateLeaveBalance(
      request.employee_id,
      request.organization_id,
      request.leave_type_code,
      request.fiscal_year,
      request.paid_days
    )

    return updated
  },

  /**
   * Reject a leave request.
   */
  async rejectLeaveRequest(requestId, orgId, reason) {
    const { data, error } = await supabase
      .from('leave_requests')
      .update({
        status: 'rejected',
        rejection_reason: reason || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .select()
      .single()

    if (error) throw new NotFoundError('Pending leave request not found')
    return data
  },

  /**
   * List leave requests with filters.
   */
  async listLeaveRequests(orgId, filters = {}) {
    let query = supabase
      .from('leave_requests')
      .select('*, employee:organization_members!leave_requests_employee_id_fkey(id, first_name, last_name, invitation_email, profile:profiles!organization_members_profile_id_fkey(full_name, email))')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (filters.employeeId) query = query.eq('employee_id', filters.employeeId)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.leaveTypeCode) query = query.eq('leave_type_code', filters.leaveTypeCode)

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  /**
   * Get approved leave requests overlapping a payroll period.
   * Used by payroll day-count service.
   */
  async getApprovedLeaveInPeriod(employeeId, periodStart, periodEnd) {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('status', 'approved')
      .lte('start_date', periodEnd)
      .gte('end_date', periodStart)

    if (error) throw error
    return data || []
  },

  // ─── Encashment ─────────────────────────────────────────────

  /**
   * Calculate sick leave encashment on termination.
   * Basic salary = 60% of CTC, daily rate = basic / 30.
   */
  async calculateEncashment(employeeId, terminationDate) {
    const balance = await this.calculateSickLeaveBalance(employeeId, new Date(terminationDate))
    const member = await this._getEmployee(employeeId)

    const monthlySalary = member.salary_amount || 0
    const monthlyBasic = monthlySalary * 0.60
    const dailyRate = monthlyBasic / 30

    const encashableDays = Math.min(Math.max(balance.totalAccumulated, 0), 45)
    const encashmentAmount = encashableDays * dailyRate

    return {
      sickLeave: {
        encashableDays,
        dailyRate: Math.round(dailyRate * 100) / 100,
        encashmentAmount: Math.round(encashmentAmount * 100) / 100,
        currency: member.salary_currency || 'NPR'
      },
      homeLeave: {
        encashable: false,
        reason: 'Home leave is not encashable under Labour Act §43'
      }
    }
  },

  // ─── Private Helpers ────────────────────────────────────────

  async _getEmployee(employeeId) {
    const { data, error } = await supabase
      .from('organization_members')
      .select('id, organization_id, joined_at, offboarded_at, salary_amount, salary_currency, weekly_off_day, status')
      .eq('id', employeeId)
      .single()

    if (error || !data) throw new NotFoundError('Employee not found')
    return data
  },

  async _getLeaveTakenInFy(employeeId, leaveTypeCode, fy) {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('paid_days')
      .eq('employee_id', employeeId)
      .eq('leave_type_code', leaveTypeCode)
      .eq('status', 'approved')
      .eq('fiscal_year', fy.bsFiscalYear)

    if (error) return 0
    return (data || []).reduce((sum, r) => sum + parseFloat(r.paid_days || 0), 0)
  },

  // ─── Event-Triggered Leave Types ─────────────────────────────

  /**
   * Create maternity leave request (§45).
   * 98 days total: 60 paid + 38 unpaid (optionally covered by accumulated leave).
   */
  async createMaternityLeaveRequest(employeeId, orgId, data) {
    const { expectedDeliveryDate, leaveStartDate, coverWithAccumulated = false } = data
    const member = await this._getEmployee(employeeId)

    if (member.gender && member.gender !== 'female') {
      throw new BadRequestError('Maternity leave is available to female employees.')
    }

    // Check no existing active maternity leave
    const { data: existing } = await supabase
      .from('leave_requests')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('leave_type_code', 'maternity_leave')
      .in('status', ['pending', 'approved'])
      .limit(1)

    if (existing && existing.length > 0) {
      throw new BadRequestError('An active maternity leave already exists for this employee.')
    }

    // Pre-delivery check: min 14 days before expected delivery
    const preDeliveryDays = daysBetween(expectedDeliveryDate, leaveStartDate)
    if (preDeliveryDays < 14) {
      throw new BadRequestError('Maternity leave must start at least 14 days before the expected delivery date.')
    }

    const totalDays = 98
    let paidDays = 60
    let unpaidDays = 38

    // Optionally cover unpaid portion with accumulated sick/home leave
    if (coverWithAccumulated) {
      const [sick, home] = await Promise.all([
        this.calculateSickLeaveBalance(employeeId, new Date(leaveStartDate)),
        this.calculateHomeLeaveBalance(employeeId, new Date(leaveStartDate))
      ])
      const coverable = Math.min(unpaidDays, sick.available + home.available)
      paidDays += coverable
      unpaidDays -= coverable
    }

    const leaveEndDate = new Date(new Date(leaveStartDate).getTime() + 97 * 86400000)
    const fy = getCurrentFiscalYear(new Date(leaveStartDate))

    const { data: request, error } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: employeeId,
        organization_id: orgId,
        leave_type_code: 'maternity_leave',
        start_date: leaveStartDate,
        end_date: leaveEndDate.toISOString().split('T')[0],
        total_days: totalDays,
        paid_days: paidDays,
        unpaid_days: unpaidDays,
        reason: `Maternity leave — expected delivery: ${expectedDeliveryDate}`,
        status: 'pending',
        fiscal_year: fy.bsFiscalYear
      })
      .select()
      .single()

    if (error) throw error

    // Create childbirth event record
    await supabase.from('childbirth_events').insert({
      employee_id: employeeId,
      organization_id: orgId,
      event_type: 'birth',
      expected_date: expectedDeliveryDate,
      leave_request_id: request.id
    })

    return { ...request, preDeliveryDays, requiredDocuments: ['birth_registration_certificate'] }
  },

  /**
   * Create paternity leave request (§45).
   * 15 days, fully paid.
   */
  async createPaternityLeaveRequest(employeeId, orgId, data) {
    const { childBirthDate, leaveStartDate } = data
    const member = await this._getEmployee(employeeId)

    if (member.gender && member.gender !== 'male') {
      throw new BadRequestError('Paternity leave is available to male employees.')
    }

    const daysSinceBirth = daysBetween(leaveStartDate, childBirthDate)
    if (daysSinceBirth > 30) {
      throw new BadRequestError('Paternity leave should be taken within 30 days of childbirth.')
    }

    // Check no duplicate for same birth event
    const { data: existing } = await supabase
      .from('childbirth_events')
      .select('id')
      .eq('employee_id', employeeId)
      .gte('expected_date', new Date(new Date(childBirthDate).getTime() - 30 * 86400000).toISOString().split('T')[0])
      .lte('expected_date', new Date(new Date(childBirthDate).getTime() + 30 * 86400000).toISOString().split('T')[0])
      .limit(1)

    if (existing && existing.length > 0) {
      throw new BadRequestError('Paternity leave has already been taken for this childbirth event.')
    }

    const leaveEndDate = new Date(new Date(leaveStartDate).getTime() + 14 * 86400000)
    const fy = getCurrentFiscalYear(new Date(leaveStartDate))

    const { data: request, error } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: employeeId,
        organization_id: orgId,
        leave_type_code: 'paternity_leave',
        start_date: leaveStartDate,
        end_date: leaveEndDate.toISOString().split('T')[0],
        total_days: 15,
        paid_days: 15,
        unpaid_days: 0,
        reason: `Paternity leave — child born: ${childBirthDate}`,
        status: 'pending',
        fiscal_year: fy.bsFiscalYear
      })
      .select()
      .single()

    if (error) throw error

    await supabase.from('childbirth_events').insert({
      employee_id: employeeId,
      organization_id: orgId,
      event_type: 'birth',
      event_date: childBirthDate,
      leave_request_id: request.id
    })

    return { ...request, requiredDocuments: ['birth_registration_certificate'] }
  },

  /**
   * Create mourning leave request (§46).
   * 13 days, fully paid per qualifying death event.
   */
  async createMourningLeaveRequest(employeeId, orgId, data) {
    const { deceasedName, relationship, deathDate, leaveStartDate } = data

    const allowed = ['parent', 'father', 'mother', 'spouse', 'child', 'son', 'daughter']
    if (!allowed.includes(relationship?.toLowerCase())) {
      throw new BadRequestError('Mourning leave is for immediate family: parents, spouse, or children.')
    }

    const daysSinceDeath = daysBetween(leaveStartDate, deathDate)
    if (daysSinceDeath > 7) {
      throw new BadRequestError('Mourning leave should commence within 7 days of the death.')
    }
    if (daysSinceDeath < 0) {
      throw new BadRequestError('Mourning leave cannot start before the date of death.')
    }

    const leaveEndDate = new Date(new Date(leaveStartDate).getTime() + 12 * 86400000)
    const fy = getCurrentFiscalYear(new Date(leaveStartDate))

    const { data: request, error } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: employeeId,
        organization_id: orgId,
        leave_type_code: 'mourning_leave',
        start_date: leaveStartDate,
        end_date: leaveEndDate.toISOString().split('T')[0],
        total_days: 13,
        paid_days: 13,
        unpaid_days: 0,
        reason: `Mourning leave — ${relationship}: ${deceasedName}`,
        status: 'pending',
        fiscal_year: fy.bsFiscalYear
      })
      .select()
      .single()

    if (error) throw error

    await supabase.from('mourning_events').insert({
      employee_id: employeeId,
      organization_id: orgId,
      deceased_name: deceasedName,
      relationship: relationship.toLowerCase(),
      death_date: deathDate,
      leave_request_id: request.id
    })

    return { ...request, requiredDocuments: ['death_certificate'] }
  },

  /**
   * Create special leave request (§47).
   * Entirely unpaid. 30 days/yr, 180-day lifetime cap.
   */
  async createSpecialLeaveRequest(employeeId, orgId, data) {
    const { startDate, endDate, reason } = data
    const member = await this._getEmployee(employeeId)
    const weeklyOff = member.weekly_off_day || 'Saturday'
    const requestedDays = countWorkingDays(startDate, endDate, weeklyOff)

    if (requestedDays <= 0) throw new BadRequestError('Must request at least 1 working day')

    const fy = getCurrentFiscalYear(new Date(startDate))

    // Check annual limit (30 days/yr)
    const { data: yearRequests } = await supabase
      .from('leave_requests')
      .select('total_days')
      .eq('employee_id', employeeId)
      .eq('leave_type_code', 'special_leave')
      .eq('fiscal_year', fy.bsFiscalYear)
      .in('status', ['approved', 'pending'])

    const yearUsed = (yearRequests || []).reduce((s, r) => s + parseFloat(r.total_days), 0)
    if (yearUsed + requestedDays > 30) {
      throw new BadRequestError(`Special leave cannot exceed 30 days/year. Used: ${yearUsed}, remaining: ${30 - yearUsed}.`)
    }

    // Check lifetime limit (180 days)
    const { data: lifetime } = await supabase
      .from('special_leave_lifetime')
      .select('total_days_used')
      .eq('employee_id', employeeId)
      .single()

    const lifetimeUsed = parseFloat(lifetime?.total_days_used || 0)
    if (lifetimeUsed + requestedDays > 180) {
      throw new BadRequestError(`Lifetime special leave cannot exceed 180 days. Used: ${lifetimeUsed}, remaining: ${180 - lifetimeUsed}.`)
    }

    const { data: request, error } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: employeeId,
        organization_id: orgId,
        leave_type_code: 'special_leave',
        start_date: startDate,
        end_date: endDate,
        total_days: requestedDays,
        paid_days: 0,
        unpaid_days: requestedDays,
        reason,
        status: 'pending',
        fiscal_year: fy.bsFiscalYear
      })
      .select()
      .single()

    if (error) throw error

    return {
      ...request,
      annualUsed: yearUsed + requestedDays,
      annualRemaining: 30 - (yearUsed + requestedDays),
      lifetimeUsed: lifetimeUsed + requestedDays,
      lifetimeRemaining: 180 - (lifetimeUsed + requestedDays)
    }
  },

  /**
   * Record compensatory work (§42).
   * Employee worked on a public holiday or weekly off → earns 1 day comp leave.
   */
  async recordCompensatoryWork(employeeId, orgId, data) {
    const { workDate, reason } = data
    const member = await this._getEmployee(employeeId)
    const weeklyOff = member.weekly_off_day || 'Saturday'

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const isWeeklyOff = dayNames[new Date(workDate).getDay()] === weeklyOff

    const { data: holiday } = await supabase
      .from('public_holidays')
      .select('name')
      .eq('date_ad', workDate)
      .limit(1)
      .single()

    const isPublicHoliday = !!holiday

    if (!isWeeklyOff && !isPublicHoliday) {
      throw new BadRequestError('The specified date is not a public holiday or weekly off day.')
    }

    const fy = getCurrentFiscalYear(new Date(workDate))
    const bs = adToBs(workDate)

    // Insert compensatory work record
    const { data: record, error } = await supabase
      .from('compensatory_work_records')
      .insert({
        employee_id: employeeId,
        organization_id: orgId,
        work_date: workDate,
        holiday_type: isPublicHoliday ? 'public_holiday' : 'weekly_off',
        holiday_name: holiday?.name || `${weeklyOff} (weekly off)`,
        compensatory_leave_earned: 1,
        status: 'earned',
        reason,
        fiscal_year: fy.bsFiscalYear
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') throw new BadRequestError('Compensatory work already recorded for this date.')
      throw error
    }

    // Add accrual record
    await supabase.from('leave_accruals').insert({
      employee_id: employeeId,
      organization_id: orgId,
      leave_type_code: 'compensatory_leave',
      accrual_amount: 1,
      bs_year: bs.year,
      bs_month: bs.month,
      accrual_date_ad: workDate,
      fiscal_year: fy.bsFiscalYear
    }).then(() => {}).catch(() => {}) // ignore duplicate

    return { ...record, alternativeOption: 'Employer may pay 1.5× overtime rate instead' }
  },

  /**
   * List public holidays for an organization.
   * Delegates to publicHolidayService for consistent filtering.
   */
  async listPublicHolidays(orgId, fiscalYear) {
    const { publicHolidayService } = await import('./publicHoliday.service.js')
    return publicHolidayService.listHolidays(orgId, { fiscalYear })
  },

  // ─── Private Helpers ────────────────────────────────────────

  async _updateLeaveBalance(employeeId, orgId, leaveTypeCode, fiscalYear, daysTaken) {
    // Upsert the balance record
    const { data: existing } = await supabase
      .from('leave_balances')
      .select('id, taken, available')
      .eq('employee_id', employeeId)
      .eq('leave_type_code', leaveTypeCode)
      .eq('fiscal_year', fiscalYear)
      .single()

    if (existing) {
      const newTaken = parseFloat(existing.taken) + parseFloat(daysTaken)
      const newAvailable = Math.max(parseFloat(existing.available) - parseFloat(daysTaken), 0)
      await supabase
        .from('leave_balances')
        .update({ taken: newTaken, available: newAvailable, last_updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('leave_balances')
        .insert({
          employee_id: employeeId,
          organization_id: orgId,
          leave_type_code: leaveTypeCode,
          fiscal_year: fiscalYear,
          carry_forward: 0,
          accrued: 0,
          taken: parseFloat(daysTaken),
          available: 0,
          last_updated_at: new Date().toISOString()
        })
    }
  }
}
