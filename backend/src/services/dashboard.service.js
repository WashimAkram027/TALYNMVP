import { supabase } from '../config/supabase.js'

/**
 * Dashboard Service
 * Handles dashboard statistics and data aggregation
 */
export const dashboardService = {
  /**
   * Get employer dashboard statistics
   */
  async getEmployerStats(organizationId) {
    // Get member statistics with quote data (excluding owner)
    const { data: members, error: membersError } = await supabase
      .from('organization_members')
      .select(`
        status, salary_amount, salary_currency, member_role, quote_id,
        quote:eor_quotes!organization_members_quote_id_fkey(
          total_monthly_cost_local, platform_fee_amount, platform_fee_currency, salary_currency
        )
      `)
      .eq('organization_id', organizationId)
      .neq('member_role', 'owner') // Exclude owner from stats
      .neq('member_role', 'authorized_user')

    if (membersError) throw membersError

    const memberStats = {
      total: members.length,
      active: members.filter(m => m.status === 'active').length,
      invited: members.filter(m => m.status === 'invited').length,
      onboarding: members.filter(m => m.status === 'onboarding').length
    }

    // Fetch exchange rate from EOR config
    const exchangeRate = await this._getExchangeRate()

    // Calculate total monthly payroll in USD from quote data for active members
    const activeMembers = members.filter(m => m.status === 'active')
    let totalMonthlyUsd = 0
    let membersWithQuotes = 0
    for (const m of activeMembers) {
      if (m.quote?.total_monthly_cost_local) {
        const localCostNpr = m.quote.total_monthly_cost_local / 100 // paisa → NPR
        const localCostUsd = localCostNpr * exchangeRate              // NPR → USD
        const platformFeeUsd = (m.quote.platform_fee_amount || 0) / 100 // cents → USD
        totalMonthlyUsd += localCostUsd + platformFeeUsd
        membersWithQuotes++
      }
    }
    totalMonthlyUsd = Math.round(totalMonthlyUsd * 100) / 100 // round to 2 decimals

    // Get pipeline stats (applications by stage) - if table exists
    let pipelineStats = {
      total: 0,
      interview: 0,
      assessment: 0,
      offerSent: 0
    }

    try {
      const { data: applications, error: appError } = await supabase
        .from('applications')
        .select('stage')
        .eq('organization_id', organizationId)

      if (!appError && applications) {
        pipelineStats = {
          total: applications.length,
          interview: applications.filter(a => a.stage === 'interview').length,
          assessment: applications.filter(a => a.stage === 'assessment').length,
          offerSent: applications.filter(a => a.stage === 'offer_sent' || a.stage === 'offer').length
        }
      }
    } catch (e) {
      // Applications table may not exist yet, use defaults
    }

    // Get compliance score - if table exists
    let complianceScore = 100
    let complianceAlerts = []

    try {
      const { data: complianceItems, error: compError } = await supabase
        .from('compliance_items')
        .select('status, severity')
        .eq('organization_id', organizationId)

      if (!compError && complianceItems && complianceItems.length > 0) {
        const completedItems = complianceItems.filter(i => i.status === 'completed' || i.status === 'compliant')
        complianceScore = Math.round((completedItems.length / complianceItems.length) * 100)
      }

      // Get compliance alerts
      const { data: alerts } = await supabase
        .from('compliance_alerts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5)

      if (alerts) {
        complianceAlerts = alerts
      }
    } catch (e) {
      // Compliance tables may not exist yet
    }

    // Calculate next payroll due date (26th of month)
    const now = new Date()
    let payrollDate = new Date(now.getFullYear(), now.getMonth(), 26)
    if (now.getDate() >= 26) {
      payrollDate = new Date(now.getFullYear(), now.getMonth() + 1, 26)
    }
    const daysUntilPayroll = Math.max(0, Math.ceil((payrollDate - now) / (1000 * 60 * 60 * 24)))

    // Determine payroll card state by checking current month's payroll runs
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().split('T')[0]
    let payrollState = 'expected'
    let lastRun = null

    try {
      const { data: currentRuns } = await supabase
        .from('payroll_runs')
        .select('id, status, pay_period_start, pay_period_end, processed_at, created_at')
        .eq('organization_id', organizationId)
        .gte('pay_period_start', currentMonthStart)
        .order('created_at', { ascending: false })
        .limit(1)

      if (currentRuns?.length > 0) {
        payrollState = 'last_payroll'
        lastRun = {
          id: currentRuns[0].id,
          status: currentRuns[0].status,
          payPeriodStart: currentRuns[0].pay_period_start,
          payPeriodEnd: currentRuns[0].pay_period_end,
          createdAt: currentRuns[0].created_at
        }
      } else if (membersWithQuotes > 0) {
        payrollState = 'upcoming'
      }
    } catch (e) {
      // payroll_runs table may not exist yet, keep 'expected' state
    }

    // Get employer notifications
    const notifications = await this.getEmployerNotifications(organizationId)

    return {
      members: memberStats,
      payroll: {
        state: payrollState,
        totalMonthlyUsd,
        currency: 'USD',
        dueInDays: daysUntilPayroll,
        dueDate: payrollDate.toISOString().split('T')[0],
        lastRun,
        memberCount: membersWithQuotes
      },
      pipeline: pipelineStats,
      compliance: {
        score: complianceScore,
        alerts: complianceAlerts
      },
      notifications
    }
  },

  /**
   * Get NPR→USD exchange rate from active EOR config.
   * Returns how many USD per 1 NPR (e.g., 0.0075 means 1 NPR = $0.0075).
   */
  async _getExchangeRate() {
    try {
      const { data: config } = await supabase
        .from('eor_cost_config')
        .select('exchange_rate')
        .eq('is_active', true)
        .limit(1)
        .single()
      return parseFloat(config?.exchange_rate) || 0.0075 // fallback default
    } catch {
      return 0.0075
    }
  },

  /**
   * Get employer notifications — actionable items for the employer dashboard.
   * Returns an array of notification objects with type, icon, title,
   * description, action URL, and optional metadata.
   */
  async getEmployerNotifications(orgId) {
    const notifications = []

    // 1. Members with change requests (quote_dispute_note set)
    try {
      const { data: disputeMembers } = await supabase
        .from('organization_members')
        .select('id, first_name, last_name, invitation_email, quote_dispute_note')
        .eq('organization_id', orgId)
        .not('quote_dispute_note', 'is', null)

      if (disputeMembers?.length) {
        for (const m of disputeMembers) {
          const name = `${m.first_name || ''}`.trim() || m.invitation_email
          notifications.push({
            type: 'offer_review',
            icon: 'flag',
            title: 'Offer change requested',
            description: `${name} requested changes to their offer`,
            action: `/people-info?id=${m.id}&action=review-changes`,
            memberId: m.id
          })
        }
      }
    } catch (e) {
      console.error('[DashboardService] Error fetching dispute members:', e)
    }

    // 2. Pending leave requests (leave_requests is the active table used by the UI)
    try {
      const { count: pendingTimeOff } = await supabase
        .from('leave_requests')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'pending')

      if (pendingTimeOff > 0) {
        notifications.push({
          type: 'time_off',
          icon: 'event_busy',
          title: 'Pending time-off requests',
          description: `${pendingTimeOff} time-off request${pendingTimeOff > 1 ? 's' : ''} awaiting approval`,
          action: '/time-off',
          count: pendingTimeOff
        })
      }
    } catch (e) {
      console.error('[DashboardService] Error fetching pending time-off:', e)
    }

    // 3. Draft / pending-approval payroll runs
    try {
      const { count: draftPayroll } = await supabase
        .from('payroll_runs')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .in('status', ['draft', 'pending_approval'])

      if (draftPayroll > 0) {
        notifications.push({
          type: 'payroll',
          icon: 'payments',
          title: 'Payroll action needed',
          description: `${draftPayroll} payroll run${draftPayroll > 1 ? 's' : ''} pending`,
          action: '/payroll',
          count: draftPayroll
        })
      }
    } catch (e) {
      console.error('[DashboardService] Error fetching draft payroll:', e)
    }

    return notifications
  },

  /**
   * Get team overview for dashboard table
   */
  async getTeamOverview(organizationId, limit = 5) {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        id,
        first_name,
        last_name,
        invitation_email,
        status,
        member_role,
        job_title,
        department,
        salary_amount,
        salary_currency,
        pay_frequency,
        start_date,
        quote_id,
        quote:eor_quotes!organization_members_quote_id_fkey(
          total_monthly_cost_local, platform_fee_amount, platform_fee_currency, salary_currency
        ),
        profile:profiles!organization_members_profile_id_fkey(id, full_name, first_name, last_name, email, avatar_url)
      `)
      .eq('organization_id', organizationId)
      .in('status', ['active', 'invited', 'onboarding'])
      .neq('member_role', 'owner') // Exclude owner from team list
      .neq('member_role', 'authorized_user')
      .order('joined_at', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) throw error

    // Fetch exchange rate for NPR→USD conversion
    const exchangeRate = await this._getExchangeRate()

    // Format the response for frontend
    return data.map(member => {
      let payroll = 'Not set'
      if (member.quote?.total_monthly_cost_local) {
        const localCostNpr = member.quote.total_monthly_cost_local / 100
        const localCostUsd = localCostNpr * exchangeRate
        const platformFeeUsd = (member.quote.platform_fee_amount || 0) / 100
        const totalUsd = Math.round(localCostUsd + platformFeeUsd)
        payroll = `$${totalUsd.toLocaleString()}/mo`
      }

      return {
        id: member.id,
        name: member.profile?.full_name
          || `${member.profile?.first_name || ''} ${member.profile?.last_name || ''}`.trim()
          || `${member.first_name || ''} ${member.last_name || ''}`.trim()
          || member.invitation_email
          || 'Unknown',
        email: member.profile?.email || member.invitation_email,
        avatar: member.profile?.avatar_url,
        department: member.department || 'Not specified',
        role: member.job_title || member.member_role || 'Team Member',
        status: member.status,
        startDate: member.start_date,
        payroll
      }
    })
  },

  /**
   * Get employee dashboard statistics
   * Includes pendingOnboardingTasks for the dashboard todo checklist.
   */
  async getEmployeeStats(profileId, organizationId = null) {
    // Get profile data for onboarding task checks
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, pending_bank_details, onboarding_completed')
      .eq('id', profileId)
      .single()

    // Get membership info if in an organization
    let membership = null
    let memberId = null
    if (organizationId) {
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('*, organization:organizations!organization_members_organization_id_fkey(name, industry)')
        .eq('profile_id', profileId)
        .eq('organization_id', organizationId)
        .single()

      membership = memberData
      memberId = memberData?.id || null
    }

    // Get time off balance - if table exists
    let timeOffBalance = {
      available: 15, // Default value
      used: 0,
      pending: 0
    }

    try {
      const { data: balances } = await supabase
        .from('time_off_balances')
        .select('balance, used, policy:time_off_policies(name)')
        .eq('profile_id', profileId)
        .eq('year', new Date().getFullYear())

      if (balances && balances.length > 0) {
        const totalBalance = balances.reduce((sum, b) => sum + (b.balance || 0), 0)
        const totalUsed = balances.reduce((sum, b) => sum + (b.used || 0), 0)
        timeOffBalance = {
          available: totalBalance - totalUsed,
          used: totalUsed,
          pending: 0
        }
      }
    } catch (e) {
      // Time off tables may not exist yet
    }

    // Get upcoming time off requests
    let upcomingTimeOff = []
    try {
      const { data: requests } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('profile_id', profileId)
        .eq('status', 'approved')
        .gte('start_date', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: true })
        .limit(3)

      if (requests) {
        upcomingTimeOff = requests
      }
    } catch (e) {
      // Time off requests table may not exist yet
    }

    // Get benefits coverage status - if table exists
    let benefitsCoverage = {
      status: 'Active',
      plans: []
    }

    try {
      const { data: enrollments } = await supabase
        .from('benefit_enrollments')
        .select('*, plan:benefit_plans(name, type)')
        .eq('profile_id', profileId)
        .eq('status', 'active')

      if (enrollments && enrollments.length > 0) {
        benefitsCoverage = {
          status: 'Active',
          plans: enrollments.map(e => e.plan?.name).filter(Boolean)
        }
      }
    } catch (e) {
      // Benefits tables may not exist yet
    }

    // Calculate next payday (end of month)
    const now = new Date()
    const nextPayday = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Check pending onboarding tasks (document upload + banking details)
    let pendingOnboardingTasks = null
    if (profileData?.onboarding_completed) {
      let docQuery = supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('category', 'identity')

      if (memberId) {
        docQuery = docQuery.eq('member_id', memberId)
      } else {
        docQuery = docQuery.eq('uploaded_by', profileId)
      }

      const { count: docCount } = await docQuery

      const documentsUploaded = (docCount || 0) > 0
      const bankingDetailsAdded = !!profileData.pending_bank_details

      // Only include if there are incomplete tasks
      if (!documentsUploaded || !bankingDetailsAdded) {
        pendingOnboardingTasks = {
          documents: { completed: documentsUploaded },
          banking: { completed: bankingDetailsAdded },
          allComplete: false
        }
      }
    }

    return {
      timeOff: timeOffBalance,
      upcomingTimeOff,
      nextPayday: {
        date: nextPayday.toISOString().split('T')[0],
        formatted: nextPayday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      },
      benefits: benefitsCoverage,
      membership,
      pendingOnboardingTasks
    }
  },

  /**
   * Get upcoming holidays for an organization
   */
  async getHolidays(organizationId, limit = 6) {
    const today = new Date().toISOString().split('T')[0]

    try {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .or(`organization_id.eq.${organizationId},is_global.eq.true`)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(limit)

      if (error) throw error

      // Format holidays for frontend
      return (data || []).map(h => ({
        id: h.id,
        name: h.name,
        date: new Date(h.date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        }),
        rawDate: h.date,
        paid: h.is_paid !== false
      }))
    } catch (e) {
      // Return sample holidays if table doesn't exist
      return [
        { name: 'Independence Day', date: 'Friday, July 4', paid: true },
        { name: 'Labor Day', date: 'Monday, September 1', paid: true },
        { name: 'Thanksgiving', date: 'Thursday, November 27', paid: true }
      ]
    }
  },

  /**
   * Get upcoming Nepal public holidays (from MOHA gazette data).
   * Returns holidays from today onwards, optionally filtered by fiscal year.
   */
  async getNepalPublicHolidays(organizationId, limit = 10, fiscalYear = null) {
    try {
      const today = new Date().toISOString().split('T')[0]

      let query = supabase
        .from('public_holidays')
        .select('id, date_ad, bs_year, bs_month, bs_day, name, name_ne, holiday_category, fiscal_year')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .in('holiday_category', ['national', 'women_only'])
        .gte('date_ad', today)
        .order('date_ad', { ascending: true })

      if (fiscalYear) query = query.eq('fiscal_year', fiscalYear)
      if (limit) query = query.limit(limit)

      const { data, error } = await query
      if (error) throw error

      return (data || []).map(h => ({
        id: h.id,
        name: h.name,
        nameNe: h.name_ne,
        date: new Date(h.date_ad).toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        }),
        rawDate: h.date_ad,
        bsDate: `${h.bs_year}-${String(h.bs_month).padStart(2, '0')}-${String(h.bs_day).padStart(2, '0')}`,
        category: h.holiday_category,
        fiscalYear: h.fiscal_year,
        paid: true
      }))
    } catch {
      return []
    }
  },

  /**
   * Get announcements for an organization
   */
  async getAnnouncements(organizationId, limit = 3) {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('organization_id', organizationId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      // Format announcements for frontend
      return (data || []).map(a => ({
        id: a.id,
        title: a.title,
        content: a.content,
        date: new Date(a.created_at).toLocaleDateString('en-US'),
        isPinned: a.is_pinned
      }))
    } catch (e) {
      // Return sample announcements if table doesn't exist
      return [
        {
          title: 'Welcome to Talyn!',
          date: new Date().toLocaleDateString('en-US'),
          content: 'We are excited to have you on our platform. Check out your dashboard for an overview of your workspace.'
        }
      ]
    }
  }
}
