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
    // Get member statistics (excluding owner)
    const { data: members, error: membersError } = await supabase
      .from('organization_members')
      .select('status, salary_amount, salary_currency, member_role')
      .eq('organization_id', organizationId)
      .neq('member_role', 'owner') // Exclude owner from stats

    if (membersError) throw membersError

    const memberStats = {
      total: members.length,
      active: members.filter(m => m.status === 'active').length,
      invited: members.filter(m => m.status === 'invited').length,
      offboarded: members.filter(m => m.status === 'offboarded').length
    }

    // Calculate total monthly payroll for active members
    const activeMembers = members.filter(m => m.status === 'active')
    const totalPayroll = activeMembers.reduce((sum, m) => {
      return sum + (m.salary_amount || 0)
    }, 0)

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

    // Calculate next payroll due date (assuming end of month)
    const now = new Date()
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const daysUntilPayroll = Math.ceil((lastDayOfMonth - now) / (1000 * 60 * 60 * 24))

    return {
      members: memberStats,
      payroll: {
        upcomingAmount: totalPayroll,
        currency: 'USD',
        dueInDays: daysUntilPayroll,
        dueDate: lastDayOfMonth.toISOString().split('T')[0]
      },
      pipeline: pipelineStats,
      compliance: {
        score: complianceScore,
        alerts: complianceAlerts
      }
    }
  },

  /**
   * Get team overview for dashboard table
   */
  async getTeamOverview(organizationId, limit = 5) {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        id,
        status,
        member_role,
        job_title,
        department,
        salary_amount,
        salary_currency,
        pay_frequency,
        profile:profiles!organization_members_profile_id_fkey(id, full_name, first_name, last_name, email, avatar_url)
      `)
      .eq('organization_id', organizationId)
      .in('status', ['active', 'invited'])
      .neq('member_role', 'owner') // Exclude owner from team list
      .order('joined_at', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) throw error

    // Format the response for frontend
    return data.map(member => ({
      id: member.id,
      name: member.profile?.full_name || `${member.profile?.first_name || ''} ${member.profile?.last_name || ''}`.trim() || 'Unknown',
      email: member.profile?.email,
      avatar: member.profile?.avatar_url,
      department: member.department || 'Not specified',
      role: member.job_title || member.member_role || 'Team Member',
      status: member.status,
      payroll: member.salary_amount
        ? `$${member.salary_amount.toLocaleString()}/${member.pay_frequency === 'monthly' ? 'mo' : member.pay_frequency}`
        : 'Not set'
    }))
  },

  /**
   * Get employee dashboard statistics
   */
  async getEmployeeStats(profileId, organizationId = null) {
    // Get membership info if in an organization
    let membership = null
    if (organizationId) {
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('*')
        .eq('profile_id', profileId)
        .eq('organization_id', organizationId)
        .single()

      membership = memberData
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

    return {
      timeOff: timeOffBalance,
      upcomingTimeOff,
      nextPayday: {
        date: nextPayday.toISOString().split('T')[0],
        formatted: nextPayday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      },
      benefits: benefitsCoverage,
      membership
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
