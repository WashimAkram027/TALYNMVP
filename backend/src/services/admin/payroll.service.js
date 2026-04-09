import { supabase } from '../../config/supabase.js'
import { NotFoundError, BadRequestError } from '../../utils/errors.js'
import { auditLogService } from './auditLog.service.js'
import { notificationService } from '../notification.service.js'

export const adminPayrollService = {
  /**
   * List payroll runs across all organizations
   */
  async listPayrollRuns({ page = 1, limit = 20, status, orgId, sortBy = 'created_at', sortOrder = 'desc' }) {
    let query = supabase
      .from('payroll_runs')
      .select('*, organization:organizations!payroll_runs_organization_id_fkey(id, name)', { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (orgId) query = query.eq('organization_id', orgId)

    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }
  },

  /**
   * Get payroll run detail with items and linked invoice data (for employer view)
   */
  async getPayrollRunDetail(runId) {
    const { data: run, error } = await supabase
      .from('payroll_runs')
      .select('*, organization:organizations!payroll_runs_organization_id_fkey(id, name, email)')
      .eq('id', runId)
      .single()

    if (error || !run) throw new NotFoundError('Payroll run not found')

    // Get payroll items with review fields
    const { data: items } = await supabase
      .from('payroll_items')
      .select(`
        *,
        member:organization_members!payroll_items_member_id_fkey(
          id, job_title, start_date, pan_number, ssf_number, bank_account_number, bank_name, salary_amount, salary_currency,
          profile:profiles!organization_members_profile_id_fkey(id, email, first_name, last_name, full_name)
        )
      `)
      .eq('payroll_run_id', runId)
      .order('created_at', { ascending: true })

    // Fetch linked invoice data for the employer view (USD amounts)
    let invoice = null
    if (run.invoice_id) {
      const { data: inv } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, total_amount_cents, subtotal_local_cents, platform_fee_cents, exchange_rate, line_items, config_snapshot, employee_count')
        .eq('id', run.invoice_id)
        .single()
      invoice = inv
    }

    return { ...run, items: items || [], invoice }
  },

  /**
   * Approve a pending payroll run
   */
  async approvePayrollRun(runId, adminId, notes, ip) {
    const { data: run, error: fetchError } = await supabase
      .from('payroll_runs')
      .select('id, status, organization_id')
      .eq('id', runId)
      .single()

    if (fetchError || !run) throw new NotFoundError('Payroll run not found')
    if (run.status !== 'pending_approval') throw new BadRequestError('Payroll run is not pending approval')

    const { error } = await supabase
      .from('payroll_runs')
      .update({
        status: 'processing',
        approved_by: adminId,
        approved_at: new Date().toISOString()
      })
      .eq('id', runId)

    if (error) throw error

    await auditLogService.log(adminId, 'payroll_approved', 'payroll_run', runId, { notes }, ip)

    // Update pay_date to actual approval date
    await supabase
      .from('payroll_runs')
      .update({ pay_date: new Date().toISOString().split('T')[0] })
      .eq('id', runId)

    // In-app notification for employer (non-blocking)
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('owner_id, name')
        .eq('id', run.organization_id)
        .single()
      if (org?.owner_id) {
        await notificationService.create({
          recipientId: org.owner_id,
          organizationId: run.organization_id,
          type: 'payroll_processing',
          title: 'Payroll approved for processing',
          message: 'Your payroll run has been approved and is being processed',
          actionUrl: '/payroll',
          metadata: { payroll_run_id: runId }
        })
      }

      // Notify each employee that their payslip is ready
      const { data: items } = await supabase
        .from('payroll_items')
        .select('member_id, member:organization_members!payroll_items_member_id_fkey(profile_id)')
        .eq('payroll_run_id', runId)
      for (const item of items || []) {
        if (item.member?.profile_id) {
          await notificationService.create({
            recipientId: item.member.profile_id,
            organizationId: run.organization_id,
            type: 'payslip_ready',
            title: 'Payslip ready',
            message: 'Your payslip is now available for review',
            actionUrl: '/dashboard-employee',
            metadata: { payroll_run_id: runId }
          })
        }
      }
    } catch (notifErr) {
      console.error('[AdminPayrollService] Notification failed:', notifErr)
    }

    return { success: true }
  },

  /**
   * Reject a pending payroll run
   */
  async rejectPayrollRun(runId, adminId, notes, ip) {
    const { data: run, error: fetchError } = await supabase
      .from('payroll_runs')
      .select('id, status')
      .eq('id', runId)
      .single()

    if (fetchError || !run) throw new NotFoundError('Payroll run not found')
    if (run.status !== 'pending_approval') throw new BadRequestError('Payroll run is not pending approval')

    const { error } = await supabase
      .from('payroll_runs')
      .update({
        status: 'cancelled',
        notes: notes || 'Rejected by admin'
      })
      .eq('id', runId)

    if (error) throw error

    await auditLogService.log(adminId, 'payroll_rejected', 'payroll_run', runId, { notes }, ip)
    return { success: true }
  },

  /**
   * Update a single payroll item (employee earnings).
   * Also syncs the linked invoice if one exists and is still editable.
   */
  async updatePayrollItem(itemId, updates, adminId, ip) {
    const allowedFields = ['base_salary', 'bonuses', 'deductions', 'tax_amount',
      'dearness_allowance', 'other_allowance', 'festival_allowance', 'leave_encashments', 'other_payments']
    const filteredUpdates = {}
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = Number(updates[key]) || 0
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      throw new BadRequestError('No valid fields to update')
    }

    // Verify item exists and get its payroll run
    const { data: item, error: fetchError } = await supabase
      .from('payroll_items')
      .select('id, payroll_run_id, member_id')
      .eq('id', itemId)
      .single()

    if (fetchError || !item) throw new NotFoundError('Payroll item not found')

    // Verify the parent run is editable
    const { data: run } = await supabase
      .from('payroll_runs')
      .select('id, status, invoice_id')
      .eq('id', item.payroll_run_id)
      .single()

    if (!run) throw new NotFoundError('Payroll run not found')
    if (!['draft', 'pending_approval'].includes(run.status)) {
      throw new BadRequestError('Payroll run is not editable (status: ' + run.status + ')')
    }

    // Update the payroll item
    const { data: updated, error } = await supabase
      .from('payroll_items')
      .update({ ...filteredUpdates, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error

    // Recalculate parent run total_amount
    const { data: allItems } = await supabase
      .from('payroll_items')
      .select('net_amount')
      .eq('payroll_run_id', item.payroll_run_id)

    const newTotal = (allItems || []).reduce((sum, i) => sum + Number(i.net_amount || 0), 0)

    await supabase
      .from('payroll_runs')
      .update({ total_amount: newTotal, updated_at: new Date().toISOString() })
      .eq('id', item.payroll_run_id)

    // Sync linked invoice if it exists and is still editable
    if (run.invoice_id) {
      await this._syncInvoiceFromPayroll(run.invoice_id, item.payroll_run_id)
    }

    await auditLogService.log(adminId, 'payroll_item_updated', 'payroll_item', itemId, {
      payroll_run_id: item.payroll_run_id,
      member_id: item.member_id,
      changes: filteredUpdates
    }, ip)

    return updated
  },

  /**
   * Resolve a payroll review request.
   * Updates the payroll item's review_status and notifies the employer.
   */
  async resolveReviewRequest(itemId, adminId, resolutionNotes, ip) {
    // Fetch the item with review data
    const { data: item, error: fetchError } = await supabase
      .from('payroll_items')
      .select(`
        id, payroll_run_id, member_id, review_status, review_notes,
        member:organization_members!payroll_items_member_id_fkey(
          first_name, last_name,
          profile:profiles!organization_members_profile_id_fkey(full_name)
        )
      `)
      .eq('id', itemId)
      .single()

    if (fetchError || !item) throw new NotFoundError('Payroll item not found')
    if (!item.review_status || item.review_status === 'resolved') {
      throw new BadRequestError('No pending review to resolve')
    }

    const memberName = item.member?.profile?.full_name
      || `${item.member?.first_name || ''} ${item.member?.last_name || ''}`.trim()
      || 'Unknown'

    // Append resolution to review_notes
    const existingNotes = item.review_notes || []
    const resolutionEntry = {
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
      resolution_notes: resolutionNotes || 'Resolved by admin'
    }

    await supabase
      .from('payroll_items')
      .update({
        review_status: 'resolved',
        review_notes: [...existingNotes, resolutionEntry]
      })
      .eq('id', itemId)

    // Get payroll run for period info and org
    const { data: run } = await supabase
      .from('payroll_runs')
      .select('organization_id, pay_period_start, pay_period_end')
      .eq('id', item.payroll_run_id)
      .single()

    const period = run ? `${run.pay_period_start} to ${run.pay_period_end}` : 'Unknown'

    // Notify employer (in-app + email)
    if (run) {
      const { data: org } = await supabase
        .from('organizations')
        .select('owner_id, name, billing_email, email')
        .eq('id', run.organization_id)
        .single()

      if (org?.owner_id) {
        await notificationService.create({
          recipientId: org.owner_id,
          organizationId: run.organization_id,
          type: 'payroll_review_resolved',
          title: 'Payroll review resolved',
          message: `Review for ${memberName}'s payroll has been resolved${resolutionNotes ? ': ' + resolutionNotes.slice(0, 200) : ''}`,
          actionUrl: '/payroll',
          metadata: { payroll_run_id: item.payroll_run_id, member_id: item.member_id, member_name: memberName }
        })

        // Send email (non-blocking)
        const employerEmail = org.billing_email || org.email
        if (employerEmail) {
          try {
            const { emailService } = await import('../email.service.js')
            await emailService.sendReviewResolvedEmail(employerEmail, org.name, memberName, period, resolutionNotes)
          } catch (emailErr) {
            console.error('[AdminPayrollService] Review resolved email failed:', emailErr.message)
          }
        }
      }
    }

    await auditLogService.log(adminId, 'payroll_review_resolved', 'payroll_item', itemId, {
      payroll_run_id: item.payroll_run_id,
      member_id: item.member_id,
      member_name: memberName,
      resolution_notes: resolutionNotes
    }, ip)

    return { success: true }
  },

  /**
   * Employer-view edit: update salary/day fields, recalculate from scratch, sync invoice.
   * Used by admins editing the employer-facing payroll view.
   */
  async employerEditPayrollItem(itemId, updates, adminId, ip) {
    const allowedFields = ['salary_amount', 'payable_days', 'paid_leave_days', 'unpaid_leave_days']
    const filteredUpdates = {}
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        const num = Number(updates[key])
        if (isNaN(num)) throw new BadRequestError(`${key} must be a valid number`)
        filteredUpdates[key] = num
      }
    }
    const resolveReview = updates.resolve_review === true

    if (Object.keys(filteredUpdates).length === 0) {
      throw new BadRequestError('No valid fields to update')
    }

    if (filteredUpdates.salary_amount !== undefined && (filteredUpdates.salary_amount <= 0 || filteredUpdates.salary_amount > 100_000_000)) {
      throw new BadRequestError('Annual salary must be between 1 and 100,000,000')
    }
    if (filteredUpdates.payable_days !== undefined && filteredUpdates.payable_days < 0) {
      throw new BadRequestError('Payable days cannot be negative')
    }
    if (filteredUpdates.paid_leave_days !== undefined && filteredUpdates.paid_leave_days < 0) {
      throw new BadRequestError('Paid leave days cannot be negative')
    }
    if (filteredUpdates.unpaid_leave_days !== undefined && filteredUpdates.unpaid_leave_days < 0) {
      throw new BadRequestError('Unpaid leave days cannot be negative')
    }

    // Fetch item with member data
    const { data: item, error: fetchError } = await supabase
      .from('payroll_items')
      .select(`
        *,
        member:organization_members!payroll_items_member_id_fkey(
          id, salary_amount, salary_currency
        )
      `)
      .eq('id', itemId)
      .single()

    if (fetchError || !item) throw new NotFoundError('Payroll item not found')

    // Verify parent run is editable
    const { data: run } = await supabase
      .from('payroll_runs')
      .select('id, status, invoice_id')
      .eq('id', item.payroll_run_id)
      .single()

    if (!run) throw new NotFoundError('Payroll run not found')
    if (!['draft', 'pending_approval'].includes(run.status)) {
      throw new BadRequestError('Payroll run is not editable (status: ' + run.status + ')')
    }

    // Validate payable_days <= calendar_days
    const calendarDays = item.calendar_days || 30
    const payableDays = filteredUpdates.payable_days !== undefined ? filteredUpdates.payable_days : item.payable_days
    if (payableDays > calendarDays) {
      throw new BadRequestError('Payable days cannot exceed calendar days (' + calendarDays + ')')
    }

    // Determine effective values
    const annualSalary = filteredUpdates.salary_amount !== undefined ? filteredUpdates.salary_amount : item.member.salary_amount
    const paidLeaveDays = filteredUpdates.paid_leave_days !== undefined ? filteredUpdates.paid_leave_days : item.paid_leave_days
    const unpaidLeaveDays = filteredUpdates.unpaid_leave_days !== undefined ? filteredUpdates.unpaid_leave_days : item.unpaid_leave_days

    // Load config: prefer invoice config_snapshot, fall back to live config
    let config = null
    if (run.invoice_id) {
      const { data: inv } = await supabase
        .from('invoices')
        .select('config_snapshot')
        .eq('id', run.invoice_id)
        .single()
      config = inv?.config_snapshot || null
    }
    if (!config?.exchange_rate) {
      const { quoteService } = await import('../quote.service.js')
      config = await quoteService.getCostConfig('NPL')
    }

    const basicSalaryRatio = parseFloat(config.basic_salary_ratio ?? 0.6)
    const employerSsfRate = parseFloat(config.employer_ssf_rate)
    const employeeSsfRate = parseFloat(config.employee_ssf_rate)
    const exchangeRate = parseFloat(config.exchange_rate)
    const periodsPerYear = config.periods_per_year || 12

    if (isNaN(employerSsfRate) || employerSsfRate < 0 || employerSsfRate > 0.5) {
      throw new BadRequestError('Employer SSF rate is outside safe bounds')
    }
    if (isNaN(employeeSsfRate) || employeeSsfRate < 0 || employeeSsfRate > 0.5) {
      throw new BadRequestError('Employee SSF rate is outside safe bounds')
    }
    if (isNaN(exchangeRate) || exchangeRate < 0.001 || exchangeRate > 0.05) {
      throw new BadRequestError('Exchange rate is outside safe bounds')
    }

    // Recalculate (same formula as regeneratePayrollRun)
    const fullMonthlyGrossLocal = Math.round((annualSalary / periodsPerYear) * 100) // paisa
    const deductionDays = calendarDays - payableDays

    let monthlyGrossLocal = fullMonthlyGrossLocal
    if (deductionDays > 0 && calendarDays > 0) {
      const dailyRate = Math.round(fullMonthlyGrossLocal / calendarDays)
      monthlyGrossLocal = dailyRate * payableDays
    }

    const basicSalaryLocal = Math.round(monthlyGrossLocal * basicSalaryRatio)
    const employerSsfLocal = Math.round(basicSalaryLocal * employerSsfRate)
    const employeeSsfLocal = Math.round(basicSalaryLocal * employeeSsfRate)

    // Update organization_members.salary_amount if salary changed
    if (filteredUpdates.salary_amount !== undefined && filteredUpdates.salary_amount !== item.member.salary_amount) {
      await supabase
        .from('organization_members')
        .update({ salary_amount: filteredUpdates.salary_amount, updated_at: new Date().toISOString() })
        .eq('id', item.member_id)
    }

    // Update payroll item with recalculated fields
    const itemUpdate = {
      base_salary: monthlyGrossLocal / 100,
      gross_salary: fullMonthlyGrossLocal / 100,
      employer_ssf: employerSsfLocal / 100,
      employee_ssf: employeeSsfLocal / 100,
      leave_deduction: (fullMonthlyGrossLocal - monthlyGrossLocal) / 100,
      deductions: employeeSsfLocal / 100,
      payable_days: payableDays,
      deduction_days: deductionDays,
      paid_leave_days: paidLeaveDays,
      unpaid_leave_days: unpaidLeaveDays,
      updated_at: new Date().toISOString()
    }

    const { data: updated, error: updateError } = await supabase
      .from('payroll_items')
      .update(itemUpdate)
      .eq('id', itemId)
      .select()
      .single()

    if (updateError) throw updateError

    // Resolve review if requested
    if (resolveReview && item.review_status === 'pending') {
      const existingNotes = item.review_notes || []
      await supabase
        .from('payroll_items')
        .update({
          review_status: 'resolved',
          review_notes: [...existingNotes, {
            resolved_by: adminId,
            resolved_at: new Date().toISOString(),
            resolution_notes: 'Resolved via employer edit'
          }]
        })
        .eq('id', itemId)
    }

    // Recalculate parent run total
    const { data: allItems } = await supabase
      .from('payroll_items')
      .select('net_amount')
      .eq('payroll_run_id', item.payroll_run_id)

    const newTotal = (allItems || []).reduce((sum, i) => sum + Number(i.net_amount || 0), 0)
    await supabase
      .from('payroll_runs')
      .update({ total_amount: newTotal, updated_at: new Date().toISOString() })
      .eq('id', item.payroll_run_id)

    // Sync linked invoice
    if (run.invoice_id) {
      await this._syncInvoiceFromPayroll(run.invoice_id, item.payroll_run_id)
    }

    await auditLogService.log(adminId, 'payroll_item_employer_edited', 'payroll_item', itemId, {
      payroll_run_id: item.payroll_run_id,
      member_id: item.member_id,
      changes: filteredUpdates,
      salary_changed: filteredUpdates.salary_amount !== undefined,
      review_resolved: !!(resolveReview && item.review_status === 'pending')
    }, ip)

    return updated
  },

  /**
   * Sync a linked invoice's line_items and totals from current payroll items.
   * Called after admin edits a payroll item.
   */
  async _syncInvoiceFromPayroll(invoiceId, payrollRunId) {
    try {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('id, status, config_snapshot, line_items')
        .eq('id', invoiceId)
        .single()

      if (!invoice) return
      // Only sync if invoice is still editable
      if (!['pending', 'approved'].includes(invoice.status)) return

      const config = invoice.config_snapshot || {}
      const exchangeRate = parseFloat(config.exchange_rate) || 0
      if (exchangeRate === 0) {
        console.warn('[AdminPayrollService] Invoice sync skipped: exchange rate is 0')
        return
      }
      const basicSalaryRatio = parseFloat(config.basic_salary_ratio ?? 0.6)
      const platformFeePerEmployee = config.platform_fee_amount || 0
      const periodsPerYear = config.periods_per_year || 12

      // Fetch all current payroll items for this run
      const { data: items } = await supabase
        .from('payroll_items')
        .select(`
          member_id, base_salary, gross_salary, employer_ssf, employee_ssf, deductions,
          payable_days, calendar_days, deduction_days, paid_leave_days, unpaid_leave_days,
          member:organization_members!payroll_items_member_id_fkey(
            job_title, department, employment_type, salary_currency, salary_amount,
            profile:profiles!organization_members_profile_id_fkey(full_name, email)
          )
        `)
        .eq('payroll_run_id', payrollRunId)

      if (!items || items.length === 0) return

      // Rebuild line_items from payroll items
      const lineItems = items.map(item => {
        const monthlyGrossLocal = Math.round((item.base_salary || 0) * 100) // NPR → paisa
        const fullMonthlyGrossLocal = Math.round((item.gross_salary || 0) * 100)
        const basicSalaryLocal = Math.round(monthlyGrossLocal * basicSalaryRatio)
        const employerSsfLocal = Math.round((item.employer_ssf || 0) * 100)
        const employeeSsfLocal = Math.round((item.employee_ssf || 0) * 100)
        const severanceLocal = Math.round(basicSalaryLocal / periodsPerYear)
        const totalCostLocal = monthlyGrossLocal + employerSsfLocal + severanceLocal

        const totalCostNpr = totalCostLocal / 100
        const totalCostUsd = totalCostNpr * exchangeRate
        const costUsdCents = Math.round(totalCostUsd * 100)

        return {
          member_id: item.member_id,
          member_name: item.member?.profile?.full_name || 'Unknown',
          member_email: item.member?.profile?.email || null,
          job_title: item.member?.job_title || null,
          department: item.member?.department || null,
          employment_type: item.member?.employment_type || 'full_time',
          salary_currency: item.member?.salary_currency || 'NPR',
          annual_salary: item.member?.salary_amount || 0,
          full_monthly_gross_local: fullMonthlyGrossLocal,
          monthly_gross_local: monthlyGrossLocal,
          basic_salary_local: basicSalaryLocal,
          employer_ssf_local: employerSsfLocal,
          employee_ssf_local: employeeSsfLocal,
          severance_local: severanceLocal,
          total_cost_local: totalCostLocal,
          cost_usd_cents: costUsdCents,
          platform_fee_cents: platformFeePerEmployee,
          payable_days: item.payable_days,
          calendar_days: item.calendar_days,
          deduction_days: item.deduction_days || 0,
          paid_leave_days: item.paid_leave_days || 0,
          unpaid_leave_days: item.unpaid_leave_days || 0
        }
      })

      const subtotalLocalCents = lineItems.reduce((s, i) => s + i.total_cost_local, 0)
      const subtotalUsdCents = lineItems.reduce((s, i) => s + i.cost_usd_cents, 0)
      const totalPlatformFee = platformFeePerEmployee * lineItems.length
      const totalAmountCents = subtotalUsdCents + totalPlatformFee

      // Atomic: only update if invoice is still in an editable status (prevents TOCTOU race)
      await supabase
        .from('invoices')
        .update({
          line_items: lineItems,
          subtotal_local_cents: subtotalLocalCents,
          platform_fee_cents: totalPlatformFee,
          total_amount_cents: totalAmountCents,
          amount: totalAmountCents / 100,
          employee_count: lineItems.length,
          pdf_url: null, // Clear cached PDF so it regenerates with updated data
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
        .in('status', ['pending', 'approved'])

      // Clear cached per-employee invoice PDFs so they regenerate with updated data
      const { data: run } = await supabase
        .from('payroll_runs')
        .select('organization_id')
        .eq('id', payrollRunId)
        .single()
      if (run) {
        const filesToRemove = items.map(item => `employee-invoices/${run.organization_id}/${payrollRunId}-${item.member_id}.pdf`)
        await supabase.storage.from('documents').remove(filesToRemove)
      }

      console.log(`[AdminPayrollService] Invoice ${invoiceId} synced from payroll items`)
    } catch (err) {
      console.error('[AdminPayrollService] Invoice sync failed:', err.message)
    }
  },

  /**
   * Regenerate a payroll run — recalculates all items from current employee data + leave records.
   * Deletes old items, recalculates, inserts new ones, and syncs the linked invoice.
   */
  async regeneratePayrollRun(runId, adminId, ip) {
    // Fetch run with org
    const { data: run, error: runErr } = await supabase
      .from('payroll_runs')
      .select('id, status, organization_id, pay_period_start, pay_period_end, invoice_id')
      .eq('id', runId)
      .single()

    if (runErr || !run) throw new NotFoundError('Payroll run not found')
    if (!['draft', 'pending_approval'].includes(run.status)) {
      throw new BadRequestError('Payroll run is not editable (status: ' + run.status + ')')
    }

    const { organization_id: orgId, pay_period_start: periodStart, pay_period_end: periodEnd } = run

    // Fetch active members
    const { data: members, error: membersErr } = await supabase
      .from('organization_members')
      .select(`
        id, first_name, last_name, invitation_email, job_title, department,
        salary_amount, salary_currency, employment_type, start_date,
        profile:profiles!organization_members_profile_id_fkey(full_name, email)
      `)
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .neq('member_role', 'owner')
      .neq('member_role', 'authorized_user')

    if (membersErr) throw membersErr
    if (!members || members.length === 0) {
      throw new BadRequestError('No active employees found for this organization')
    }

    // Fetch EOR config
    const { quoteService } = await import('../quote.service.js')
    const config = await quoteService.getCostConfig('NPL')

    if (!config?.exchange_rate) {
      throw new BadRequestError('Exchange rate not set in EOR config')
    }

    const exchangeRate = parseFloat(config.exchange_rate)
    if (isNaN(exchangeRate) || exchangeRate < 0.001 || exchangeRate > 0.05) {
      throw new BadRequestError(`Exchange rate ${config.exchange_rate} is outside safe bounds`)
    }
    const basicSalaryRatio = parseFloat(config.basic_salary_ratio ?? 0.6)
    const employerSsfRate = parseFloat(config.employer_ssf_rate)
    const employeeSsfRate = parseFloat(config.employee_ssf_rate)
    const platformFeePerEmployee = config.platform_fee_amount
    const periodsPerYear = config.periods_per_year || 12

    // Build line items with day-count adjustment
    const lineItems = await Promise.all(members.map(async (member) => {
      const annualSalary = member.salary_amount || 0
      const fullMonthlyGrossLocal = Math.round((annualSalary / periodsPerYear) * 100)

      let dayCount = null
      let monthlyGrossLocal = fullMonthlyGrossLocal
      try {
        const { payrollDayCountService } = await import('../payrollDayCount.service.js')
        dayCount = await payrollDayCountService.calculatePayableDays(member.id, periodStart, periodEnd)

        if (dayCount.deductionDays > 0 && dayCount.calendarDays > 0) {
          const dailyRate = Math.round(fullMonthlyGrossLocal / dayCount.calendarDays)
          monthlyGrossLocal = dailyRate * dayCount.payableDays
        }
      } catch {
        dayCount = null
      }

      const basicSalaryLocal = Math.round(monthlyGrossLocal * basicSalaryRatio)
      const employerSsfLocal = Math.round(basicSalaryLocal * employerSsfRate)
      const employeeSsfLocal = Math.round(basicSalaryLocal * employeeSsfRate)
      const severanceLocal = Math.round(basicSalaryLocal / periodsPerYear)
      const totalCostLocal = monthlyGrossLocal + employerSsfLocal + severanceLocal
      const totalCostNpr = totalCostLocal / 100
      const totalCostUsd = totalCostNpr * exchangeRate
      const costUsdCents = Math.round(totalCostUsd * 100)

      return {
        member_id: member.id,
        member_name: member.profile?.full_name
          || `${member.first_name || ''} ${member.last_name || ''}`.trim()
          || member.invitation_email || 'Unknown',
        member_email: member.profile?.email || member.invitation_email || null,
        job_title: member.job_title || null,
        department: member.department || null,
        employment_type: member.employment_type || 'full_time',
        salary_currency: member.salary_currency || 'NPR',
        annual_salary: annualSalary,
        full_monthly_gross_local: fullMonthlyGrossLocal,
        monthly_gross_local: monthlyGrossLocal,
        basic_salary_local: basicSalaryLocal,
        employer_ssf_local: employerSsfLocal,
        employee_ssf_local: employeeSsfLocal,
        severance_local: severanceLocal,
        total_cost_local: totalCostLocal,
        cost_usd_cents: costUsdCents,
        platform_fee_cents: platformFeePerEmployee,
        payable_days: dayCount?.payableDays ?? null,
        calendar_days: dayCount?.calendarDays ?? null,
        deduction_days: dayCount?.deductionDays ?? 0,
        paid_leave_days: dayCount?.paidLeaveDays ?? 0,
        unpaid_leave_days: dayCount?.unpaidLeaveDays ?? 0
      }
    }))

    // Snapshot existing items to preserve admin manual edits
    const { data: existingItems } = await supabase
      .from('payroll_items')
      .select('id, member_id, payable_days, calendar_days, deduction_days, paid_leave_days, unpaid_leave_days, bonuses, dearness_allowance, other_allowance, festival_allowance, leave_encashments, other_payments, tax_amount, review_status, review_notes')
      .eq('payroll_run_id', runId)

    const existingMap = {}
    for (const ei of existingItems || []) {
      existingMap[ei.member_id] = ei
    }

    // Build recalculated items, preserving admin day count overrides + payout fields + review data
    const activeMemberIds = new Set(lineItems.map(i => i.member_id))
    const upsertItems = lineItems.map(item => {
      const existing = existingMap[item.member_id]

      // For existing items: preserve admin day count edits, recalculate salary from source
      // For new members: use freshly calculated day counts
      const useDays = existing
        ? { payable_days: existing.payable_days, calendar_days: existing.calendar_days ?? item.calendar_days, deduction_days: existing.deduction_days, paid_leave_days: existing.paid_leave_days, unpaid_leave_days: existing.unpaid_leave_days }
        : { payable_days: item.payable_days, calendar_days: item.calendar_days, deduction_days: item.deduction_days, paid_leave_days: item.paid_leave_days, unpaid_leave_days: item.unpaid_leave_days }

      // Recalculate salary fields using preserved day counts (so proration matches admin edits)
      let recalcBase = item.monthly_gross_local
      let recalcLeaveDeduction = item.full_monthly_gross_local - item.monthly_gross_local
      if (existing && existing.payable_days !== item.payable_days) {
        const calDays = useDays.calendar_days || item.calendar_days || 30
        const dedDays = Math.max(0, calDays - useDays.payable_days)
        if (dedDays > 0 && calDays > 0) {
          const dailyRate = Math.round(item.full_monthly_gross_local / calDays)
          recalcBase = dailyRate * useDays.payable_days
        } else {
          recalcBase = item.full_monthly_gross_local
        }
        recalcLeaveDeduction = item.full_monthly_gross_local - recalcBase
      }
      const recalcBasicSalary = Math.round(recalcBase * basicSalaryRatio)
      const recalcEmployerSsf = Math.round(recalcBasicSalary * employerSsfRate)
      const recalcEmployeeSsf = Math.round(recalcBasicSalary * employeeSsfRate)

      return {
        ...(existing?.id ? { id: existing.id } : {}),
        payroll_run_id: runId,
        member_id: item.member_id,
        base_salary: recalcBase / 100,
        gross_salary: item.full_monthly_gross_local / 100,
        employer_ssf: recalcEmployerSsf / 100,
        employee_ssf: recalcEmployeeSsf / 100,
        leave_deduction: recalcLeaveDeduction / 100,
        deductions: recalcEmployeeSsf / 100,
        payable_days: useDays.payable_days,
        calendar_days: useDays.calendar_days,
        deduction_days: useDays.deduction_days,
        paid_leave_days: useDays.paid_leave_days,
        unpaid_leave_days: useDays.unpaid_leave_days,
        // Preserve admin payout-view edits
        bonuses: existing?.bonuses || 0,
        dearness_allowance: existing?.dearness_allowance || 0,
        other_allowance: existing?.other_allowance || 0,
        festival_allowance: existing?.festival_allowance || 0,
        leave_encashments: existing?.leave_encashments || 0,
        other_payments: existing?.other_payments || 0,
        tax_amount: existing?.tax_amount || 0,
        // Preserve review data
        review_status: existing?.review_status || null,
        review_notes: existing?.review_notes || null,
        updated_at: new Date().toISOString()
      }
    })

    // Remove items for members no longer active
    const staleIds = (existingItems || [])
      .filter(ei => !activeMemberIds.has(ei.member_id))
      .map(ei => ei.id)
    if (staleIds.length > 0) {
      await supabase.from('payroll_items').delete().in('id', staleIds)
    }

    // Upsert: update existing items in place, insert new ones
    const toUpdate = upsertItems.filter(i => i.id)
    const toInsert = upsertItems.filter(i => !i.id)

    for (const item of toUpdate) {
      const { id, ...fields } = item
      await supabase.from('payroll_items').update(fields).eq('id', id)
    }
    if (toInsert.length > 0) {
      const { error: insertErr } = await supabase.from('payroll_items').insert(toInsert)
      if (insertErr) {
        console.error('[AdminPayrollService] Regenerate insert new members failed:', insertErr.message)
        throw new BadRequestError('Failed to insert items for new members. Please retry.')
      }
    }

    // Recalculate run total from current net_amount (includes preserved bonuses/allowances)
    const { data: allItems } = await supabase
      .from('payroll_items')
      .select('net_amount')
      .eq('payroll_run_id', runId)
    const newTotal = (allItems || []).reduce((sum, i) => sum + Number(i.net_amount || 0), 0)
    await supabase.from('payroll_runs')
      .update({ total_amount: newTotal, updated_at: new Date().toISOString() })
      .eq('id', runId)

    // Sync linked invoice
    if (run.invoice_id) {
      await this._syncInvoiceFromPayroll(run.invoice_id, runId)
    }

    await auditLogService.log(adminId, 'payroll_regenerated', 'payroll_run', runId, {
      employee_count: members.length,
      total_amount_npr: newTotal,
      preserved_existing: toUpdate.length,
      new_members: toInsert.length,
      removed_members: staleIds.length
    }, ip)

    return { success: true, employeeCount: members.length, totalNpr: newTotal }
  }
}
