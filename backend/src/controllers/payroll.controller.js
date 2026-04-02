import { payrollService } from '../services/payroll.service.js'
import { paymentsService } from '../services/payments.service.js'
import { invoiceGenerationService } from '../services/invoiceGeneration.service.js'
import { notificationService } from '../services/notification.service.js'
import { supabase } from '../config/supabase.js'
import {
  successResponse,
  createdResponse,
  errorResponse,
  notFoundResponse,
  badRequestResponse
} from '../utils/response.js'

/**
 * Payroll Controller
 * Handles HTTP requests for payroll operations
 */
export const payrollController = {
  /**
   * GET /api/payroll/runs
   * Get all payroll runs for the organization
   */
  async getRuns(req, res) {
    try {
      const filters = {
        status: req.query.status,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate
      }

      const runs = await payrollService.getPayrollRuns(req.user.organizationId, filters)
      return successResponse(res, runs)
    } catch (error) {
      console.error('[PayrollController] GetRuns error:', error)
      return errorResponse(res, 'Failed to get payroll runs', 500, error)
    }
  },

  /**
   * GET /api/payroll/runs/:id
   * Get a single payroll run with items
   */
  async getRun(req, res) {
    try {
      const { id } = req.params
      const run = await payrollService.getPayrollRun(id, req.user.organizationId)
      return successResponse(res, run)
    } catch (error) {
      console.error('[PayrollController] GetRun error:', error)
      if (error.message === 'Payroll run not found') {
        return notFoundResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to get payroll run', 500, error)
    }
  },

  /**
   * POST /api/payroll/runs
   * Create a new payroll run
   */
  async createRun(req, res) {
    try {
      const { payPeriodStart, payPeriodEnd, payDate } = req.body

      if (!payPeriodStart || !payPeriodEnd || !payDate) {
        return badRequestResponse(res, 'Pay period start, end, and pay date are required')
      }

      const run = await payrollService.createPayrollRun(
        req.user.organizationId,
        payPeriodStart,
        payPeriodEnd,
        payDate
      )

      return createdResponse(res, run, 'Payroll run created successfully')
    } catch (error) {
      console.error('[PayrollController] CreateRun error:', error)
      return errorResponse(res, 'Failed to create payroll run', 500, error)
    }
  },

  /**
   * PUT /api/payroll/runs/:id/status
   * Update payroll run status
   */
  async updateRunStatus(req, res) {
    try {
      const { id } = req.params
      const { status } = req.body

      if (!status) {
        return badRequestResponse(res, 'Status is required')
      }

      // Route "processing" through Stripe ACH pull instead of direct status update
      if (status === 'processing') {
        // Check if this run is linked to a billing invoice — if so, payment must
        // go through the invoice approval flow, not direct payroll processing.
        const { data: run } = await supabase
          .from('payroll_runs')
          .select('invoice_id')
          .eq('id', id)
          .eq('organization_id', req.user.organizationId)
          .single()

        if (run?.invoice_id) {
          return badRequestResponse(res, 'This payroll run is linked to a billing invoice. Please approve the invoice from the Billing page to initiate payment.')
        }

        // Legacy path (standalone runs without an invoice)
        const result = await paymentsService.processPayrollRun(id, req.user.organizationId)
        return successResponse(res, result, 'Payroll run submitted for ACH processing')
      }

      const run = await payrollService.updatePayrollRunStatus(id, req.user.organizationId, status)
      return successResponse(res, run, 'Payroll run status updated')
    } catch (error) {
      console.error('[PayrollController] UpdateRunStatus error:', error)
      if (error.message === 'Payroll run not found') {
        return notFoundResponse(res, error.message)
      }
      if (error.message?.includes('draft status') || error.message === 'Invalid status') {
        return badRequestResponse(res, error.message)
      }
      return errorResponse(res, error.message || 'Failed to update payroll run status', 500, error)
    }
  },

  /**
   * PUT /api/payroll/items/:id
   * Update a payroll item
   */
  async updateItem(req, res) {
    try {
      const { id } = req.params
      const item = await payrollService.updatePayrollItem(id, req.user.organizationId, req.body)
      return successResponse(res, item, 'Payroll item updated')
    } catch (error) {
      console.error('[PayrollController] UpdateItem error:', error)
      if (error.message === 'Payroll item not found') {
        return notFoundResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to update payroll item', 500, error)
    }
  },

  /**
   * GET /api/payroll/upcoming
   * Get upcoming payroll for the organization
   */
  async getUpcoming(req, res) {
    try {
      const upcoming = await payrollService.getUpcomingPayroll(req.user.organizationId)
      return successResponse(res, upcoming)
    } catch (error) {
      console.error('[PayrollController] GetUpcoming error:', error)
      return errorResponse(res, 'Failed to get upcoming payroll', 500, error)
    }
  },

  /**
   * GET /api/payroll/member/:memberId/history
   * Get payroll history for a specific member
   */
  async getMemberHistory(req, res) {
    try {
      const { memberId } = req.params
      const limit = parseInt(req.query.limit) || 12

      const history = await payrollService.getEmployeePayrollHistory(
        memberId,
        req.user.organizationId,
        limit
      )

      return successResponse(res, history)
    } catch (error) {
      console.error('[PayrollController] GetMemberHistory error:', error)
      if (error.message === 'Member not found') {
        return notFoundResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to get member payroll history', 500, error)
    }
  },

  /**
   * DELETE /api/payroll/runs/:id
   * Delete a payroll run (only if draft)
   */
  async deleteRun(req, res) {
    try {
      const { id } = req.params
      await payrollService.deletePayrollRun(id, req.user.organizationId)
      return successResponse(res, null, 'Payroll run deleted successfully')
    } catch (error) {
      console.error('[PayrollController] DeleteRun error:', error)
      if (error.message === 'Payroll run not found') {
        return notFoundResponse(res, error.message)
      }
      if (error.message === 'Can only delete draft payroll runs') {
        return badRequestResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to delete payroll run', 500, error)
    }
  },

  /**
   * GET /api/payroll/runs/:runId/payslips/:memberId/pdf
   * Download payslip PDF — employer can access any, employee only their own
   */
  async downloadPayslipPdf(req, res) {
    try {
      const { runId, memberId } = req.params

      // Auth: employees can only access their own payslip
      if (req.user.role === 'candidate') {
        const { data: membership } = await supabase
          .from('organization_members')
          .select('id')
          .eq('profile_id', req.user.id)
          .eq('organization_id', req.user.organizationId)
          .single()
        if (!membership || membership.id !== memberId) {
          return errorResponse(res, 'You can only access your own payslip', 403)
        }
      }

      const { pdfBuffer, memberName } = await invoiceGenerationService.generatePayslipPdf(
        runId, memberId, req.user.organizationId
      )

      const safeName = (memberName || memberId).replace(/[^a-zA-Z0-9_\- ]/g, '_')
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename="payslip-${safeName}.pdf"`)
      return res.send(pdfBuffer)
    } catch (error) {
      console.error('[PayrollController] DownloadPayslipPdf error:', error)
      if (error.statusCode === 404) return notFoundResponse(res, 'Payslip not found')
      return errorResponse(res, 'Failed to generate payslip PDF', 500)
    }
  },

  /**
   * GET /api/payroll/runs/:runId/employee-invoice/:memberId/pdf
   * Download per-employee invoice PDF showing employer's cost breakdown for one employee
   */
  async downloadPerEmployeeInvoicePdf(req, res) {
    try {
      const { runId, memberId } = req.params
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(runId) || !uuidRegex.test(memberId)) {
        return badRequestResponse(res, 'Invalid run or member ID format')
      }

      // Auth: employees can only access their own
      if (req.user.role === 'candidate') {
        const { data: membership } = await supabase
          .from('organization_members')
          .select('id')
          .eq('profile_id', req.user.id)
          .eq('organization_id', req.user.organizationId)
          .single()
        if (!membership || membership.id !== memberId) {
          return errorResponse(res, 'You can only access your own invoice', 403)
        }
      }

      const { pdfBuffer, memberName } = await invoiceGenerationService.generatePerEmployeeInvoicePdf(
        runId, memberId, req.user.organizationId
      )

      const safeName = (memberName || memberId).replace(/[^a-zA-Z0-9_\- ]/g, '_')
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename="employee-invoice-${safeName}.pdf"`)
      return res.send(pdfBuffer)
    } catch (error) {
      console.error('[PayrollController] DownloadPerEmployeeInvoicePdf error:', error)
      if (error.statusCode === 404) return notFoundResponse(res, 'Per-employee invoice not found')
      if (error.statusCode === 400) return badRequestResponse(res, 'Unable to generate per-employee invoice')
      return errorResponse(res, 'Failed to generate per-employee invoice PDF', 500)
    }
  },

  /**
   * GET /api/payroll/runs/:runId/payslips/:memberId
   * Get payslip data as JSON — employer can access any, employee only their own
   */
  async getPayslipData(req, res) {
    try {
      const { runId, memberId } = req.params

      // Auth: employees can only access their own payslip
      if (req.user.role === 'candidate') {
        const { data: membership } = await supabase
          .from('organization_members')
          .select('id')
          .eq('profile_id', req.user.id)
          .eq('organization_id', req.user.organizationId)
          .single()
        if (!membership || membership.id !== memberId) {
          return errorResponse(res, 'You can only access your own payslip', 403)
        }
      }

      const data = await invoiceGenerationService.getPayslipData(
        runId, memberId, req.user.organizationId
      )

      return successResponse(res, data)
    } catch (error) {
      console.error('[PayrollController] GetPayslipData error:', error)
      if (error.statusCode === 404) return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to get payslip data', 500, error)
    }
  },

  /**
   * POST /api/payroll/runs/:runId/items/:memberId/review-request
   * Employer flags an issue with an employee's pay calculation — sends notification to admins
   */
  async submitReviewRequest(req, res) {
    try {
      const { runId, memberId } = req.params
      const { issueType, description } = req.body

      const allowedIssueTypes = ['incorrect_salary', 'wrong_leave', 'missing_allowance', 'ssf_error', 'other']
      if (!issueType || !allowedIssueTypes.includes(issueType)) {
        return badRequestResponse(res, 'Valid issue type is required')
      }
      if (!description?.trim() || description.trim().length > 2000) {
        return badRequestResponse(res, 'Description is required (max 2000 characters)')
      }

      // Verify run belongs to org
      const { data: run, error: runErr } = await supabase
        .from('payroll_runs')
        .select('id, organization_id, pay_period_start, pay_period_end')
        .eq('id', runId)
        .eq('organization_id', req.user.organizationId)
        .single()

      if (runErr || !run) return notFoundResponse(res, 'Payroll run not found')

      // Verify member exists in the run's items
      const { data: item, error: itemErr } = await supabase
        .from('payroll_items')
        .select('member_id, review_status, review_notes, member:organization_members!payroll_items_member_id_fkey(first_name, last_name)')
        .eq('payroll_run_id', runId)
        .eq('member_id', memberId)
        .single()

      if (itemErr || !item) return notFoundResponse(res, 'Employee not found in this payroll run')

      const memberName = `${item.member?.first_name || ''} ${item.member?.last_name || ''}`.trim() || 'Unknown'
      const employerName = req.user.profile?.full_name || req.user.email || 'Employer'
      const period = `${run.pay_period_start} to ${run.pay_period_end}`

      // Reject if there's already a pending review for this item
      if (item.review_status === 'pending' || item.review_status === 'in_progress') {
        return badRequestResponse(res, 'A review is already in progress for this employee')
      }

      // Persist review request on the payroll item (max 5 review entries)
      const existingNotes = item.review_notes || []
      const requestEntries = existingNotes.filter(n => n.type)
      if (requestEntries.length >= 5) {
        return badRequestResponse(res, 'Maximum review requests reached for this item')
      }
      const reviewEntry = {
        type: issueType,
        description: description.trim(),
        submitted_by: req.user.id,
        submitted_by_name: employerName,
        submitted_at: new Date().toISOString()
      }

      await supabase
        .from('payroll_items')
        .update({
          review_status: 'pending',
          review_notes: [...existingNotes, reviewEntry]
        })
        .eq('payroll_run_id', runId)
        .eq('member_id', memberId)

      // Notify admin users (in-app + email)
      const { data: admins } = await supabase
        .from('admin_roles')
        .select('profile_id, user:profiles!admin_roles_profile_id_fkey(email)')
        .in('role', ['super_admin', 'finance_admin'])

      for (const admin of admins || []) {
        await notificationService.create({
          recipientId: admin.profile_id,
          organizationId: req.user.organizationId,
          type: 'payroll_review_requested',
          title: 'Payroll review requested',
          message: `${employerName} flagged an issue with ${memberName}'s pay for ${period}`,
          actionUrl: '/payroll-runs',
          metadata: {
            payroll_run_id: runId,
            member_id: memberId,
            member_name: memberName,
            issue_type: issueType,
            description,
            period
          }
        })

        // Send email (non-blocking)
        if (admin.user?.email) {
          const { emailService } = await import('../services/email.service.js')
          emailService.sendPayrollReviewRequestEmail(
            admin.user.email, req.user.organization?.name || 'Organization',
            memberName, issueType, description.trim(), period
          ).catch(err => console.error('[PayrollController] Review email failed:', err.message))
        }
      }

      return successResponse(res, { success: true, message: 'Review request submitted' })
    } catch (error) {
      console.error('[PayrollController] SubmitReviewRequest error:', error)
      return errorResponse(res, 'Failed to submit review request', 500, error)
    }
  }
}
