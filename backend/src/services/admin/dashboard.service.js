import { supabase } from '../../config/supabase.js'

export const adminDashboardService = {
  /**
   * Get cross-org dashboard metrics
   */
  async getMetrics() {
    const now = new Date()
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()

    // Run all queries in parallel
    const [
      orgCount,
      pendingVerifications,
      activeMembers,
      payrollRunsMtd,
      payrollVolumeMtd,
      failedWebhooks,
      totalUsers,
      emailsSentToday
    ] = await Promise.all([
      // Total organizations
      supabase.from('organizations').select('id', { count: 'exact', head: true }),
      // Pending entity verifications
      supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('entity_status', 'pending_review'),
      // Active members across all orgs
      supabase.from('organization_members').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      // Payroll runs this month
      supabase.from('payroll_runs').select('id', { count: 'exact', head: true }).gte('created_at', mtdStart),
      // Total payroll volume this month
      supabase.from('payroll_runs').select('total_amount').gte('created_at', mtdStart).in('status', ['completed', 'processing']),
      // Failed webhooks (table may not exist)
      (async () => { try { return await supabase.from('webhook_events').select('id', { count: 'exact', head: true }).eq('status', 'failed') } catch { return { count: 0 } } })(),
      // Total users (profiles count)
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      // Emails sent today (table may not exist)
      (async () => { try { return await supabase.from('email_logs').select('id', { count: 'exact', head: true }).gte('created_at', todayStart) } catch { return { count: 0 } } })()
    ])

    const totalVolume = (payrollVolumeMtd.data || []).reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0)

    return {
      totalOrgs: orgCount.count || 0,
      pendingVerifications: pendingVerifications.count || 0,
      activeMembers: activeMembers.count || 0,
      payrollRunsMtd: payrollRunsMtd.count || 0,
      payrollVolumeMtd: totalVolume,
      failedWebhooks: failedWebhooks.count || 0,
      totalUsers: totalUsers.count || 0,
      emailsSentToday: emailsSentToday.count || 0
    }
  },

  /**
   * Get action items / alerts
   */
  async getAlerts() {
    const alerts = []

    // Pending entity reviews
    const { data: pendingEntities } = await supabase
      .from('organizations')
      .select('id, name, entity_submitted_at')
      .eq('entity_status', 'pending_review')
      .order('entity_submitted_at', { ascending: true })
      .limit(10)

    if (pendingEntities?.length) {
      pendingEntities.forEach(org => {
        alerts.push({
          type: 'entity_review',
          severity: 'warning',
          title: `Entity review pending: ${org.name || 'Unnamed'}`,
          description: `Submitted ${org.entity_submitted_at ? new Date(org.entity_submitted_at).toLocaleDateString() : 'unknown'}`,
          link: `/organizations/${org.id}`,
          createdAt: org.entity_submitted_at
        })
      })
    }

    // Stuck payroll runs (processing for > 24h)
    const stuckThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: stuckRuns } = await supabase
      .from('payroll_runs')
      .select('id, organization_id, created_at')
      .eq('status', 'processing')
      .lt('updated_at', stuckThreshold)
      .limit(5)

    if (stuckRuns?.length) {
      stuckRuns.forEach(run => {
        alerts.push({
          type: 'stuck_payroll',
          severity: 'warning',
          title: `Stuck payroll run: ${run.id.slice(0, 8)}`,
          description: 'Processing for over 24 hours',
          link: `/payroll/${run.id}`,
          createdAt: run.created_at
        })
      })
    }

    // Failed ACH payments (payment_methods with failed status)
    try {
      const { data: failedPayments } = await supabase
        .from('payment_methods')
        .select('id, organization_id, bank_name, last_four')
        .eq('status', 'failed')
        .limit(10)

      if (failedPayments?.length) {
        failedPayments.forEach(pm => {
          alerts.push({
            type: 'ach_failed',
            severity: 'danger',
            title: `ACH payment failed: ${pm.bank_name || 'Bank'} ****${pm.last_four || '????'}`,
            description: 'Payment method verification or charge failed',
            link: `/organizations/${pm.organization_id}`,
            createdAt: null
          })
        })
      }
    } catch {
      // payment_methods table may not have expected columns
    }

    // Expiring quotes (eor_quotes expiring within 7 days)
    try {
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const nowISO = new Date().toISOString()
      const { data: expiringQuotes } = await supabase
        .from('eor_quotes')
        .select('id, quote_number, organization_id, valid_until, employee_first_name, employee_last_name')
        .eq('status', 'draft')
        .gt('valid_until', nowISO)
        .lte('valid_until', sevenDaysFromNow)
        .limit(10)

      if (expiringQuotes?.length) {
        expiringQuotes.forEach(q => {
          alerts.push({
            type: 'quote_expiring',
            severity: 'warning',
            title: `Quote expiring: ${q.quote_number || q.id.slice(0, 8)}`,
            description: `For ${q.employee_first_name || ''} ${q.employee_last_name || ''} — expires ${new Date(q.valid_until).toLocaleDateString()}`,
            link: `/organizations/${q.organization_id}`,
            createdAt: q.valid_until
          })
        })
      }
    } catch {
      // eor_quotes table may not exist
    }

    return alerts.sort((a, b) => {
      const severityOrder = { danger: 0, warning: 1, info: 2 }
      return (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2)
    })
  }
}
