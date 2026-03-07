import { supabase } from '../config/supabase.js'
import { paymentsService } from './payments.service.js'

export const webhooksService = {
  /**
   * Process a Stripe webhook event with idempotency.
   * Inserts into webhook_events table — skips if already processed.
   */
  async processStripeEvent(event) {
    const eventId = event.id
    const eventType = event.type

    // Idempotency check: insert into webhook_events, skip on conflict
    const { data: inserted, error: insertError } = await supabase
      .from('webhook_events')
      .insert({
        provider: 'stripe',
        event_id: eventId,
        event_type: eventType,
        status: 'processing',
        payload: event.data?.object || {},
        attempts: 1
      })
      .select('id')
      .single()

    if (insertError) {
      // Unique constraint violation = already processed
      if (insertError.code === '23505') {
        console.log(`Webhook event ${eventId} already processed, skipping`)
        return { skipped: true }
      }
      console.error('Failed to insert webhook event:', insertError)
      throw insertError
    }

    const webhookEventId = inserted.id

    try {
      // Dispatch based on event type
      switch (eventType) {
        case 'setup_intent.succeeded': {
          const setupIntent = event.data.object
          const pmId = setupIntent.payment_method
          let bankName = null
          let lastFour = null

          // Extract bank details from the setup intent's payment method details
          if (setupIntent.payment_method_options?.us_bank_account) {
            // These might be on the payment method object itself
          }
          if (setupIntent.latest_attempt?.payment_method_details?.us_bank_account) {
            const bankDetails = setupIntent.latest_attempt.payment_method_details.us_bank_account
            bankName = bankDetails.bank_name
            lastFour = bankDetails.last4
          }

          await paymentsService.handleSetupIntentSucceeded(
            setupIntent.id, pmId, bankName, lastFour
          )
          break
        }

        case 'setup_intent.setup_failed': {
          const setupIntent = event.data.object
          const errorMsg = setupIntent.last_setup_error?.message || 'Setup failed'
          await paymentsService.handleSetupIntentFailed(setupIntent.id, errorMsg)
          break
        }

        case 'setup_intent.requires_action': {
          // Micro-deposit verification pending — log only
          console.log(`SetupIntent ${event.data.object.id} requires action (micro-deposit verification)`)
          break
        }

        // ─── PaymentIntent events (ACH Pull) ───
        case 'payment_intent.processing': {
          const pi = event.data.object
          const runId = pi.metadata?.payroll_run_id
          if (runId) {
            await supabase
              .from('payroll_runs')
              .update({ payment_status: 'ach_processing' })
              .eq('id', runId)
            console.log(`PaymentIntent ${pi.id} processing for run ${runId}`)
          }
          break
        }

        case 'payment_intent.succeeded': {
          const pi = event.data.object
          const runId = pi.metadata?.payroll_run_id
          if (runId) {
            await paymentsService.handlePaymentIntentSucceeded(pi.id, runId)

            // Send funded emails to employer and admin
            try {
              const { emailService } = await import('./email.service.js')
              const { env } = await import('../config/env.js')
              const { data: run } = await supabase
                .from('payroll_runs')
                .select('organization_id, pay_period_start, pay_period_end, total_pull_amount_cents')
                .eq('id', runId)
                .single()

              if (run) {
                const { data: org } = await supabase
                  .from('organizations')
                  .select('owner_id, name')
                  .eq('id', run.organization_id)
                  .single()

                const amount = `$${((run.total_pull_amount_cents || 0) / 100).toFixed(2)}`
                const period = `${run.pay_period_start} to ${run.pay_period_end}`

                if (org) {
                  // Employer notification
                  const { data: owner } = await supabase
                    .from('profiles')
                    .select('email, first_name')
                    .eq('id', org.owner_id)
                    .single()

                  if (owner) {
                    await emailService.sendPayrollFundedEmail(owner.email, owner.first_name, amount, period)
                  }

                  // Admin notification — funds ready for distribution
                  try {
                    await emailService.sendAdminPayrollFundedEmail(
                      env.adminEmail, org.name || 'Unknown', amount, period, runId
                    )
                  } catch (adminErr) {
                    console.error('Failed to send admin funded notification:', adminErr)
                  }
                }
              }
            } catch (emailErr) {
              console.error('Failed to send funded email:', emailErr)
            }
          }
          break
        }

        case 'payment_intent.payment_failed': {
          const pi = event.data.object
          const runId = pi.metadata?.payroll_run_id
          const errorMsg = pi.last_payment_error?.message || 'Payment failed'
          if (runId) {
            await paymentsService.handlePaymentIntentFailed(pi.id, runId, errorMsg)

            // Send failure email to employer
            try {
              const { emailService } = await import('./email.service.js')
              const { data: run } = await supabase
                .from('payroll_runs')
                .select('organization_id, pay_period_start, pay_period_end, total_pull_amount_cents')
                .eq('id', runId)
                .single()

              if (run) {
                const { data: org } = await supabase
                  .from('organizations')
                  .select('owner_id')
                  .eq('id', run.organization_id)
                  .single()

                if (org) {
                  const { data: owner } = await supabase
                    .from('profiles')
                    .select('email, first_name')
                    .eq('id', org.owner_id)
                    .single()

                  if (owner) {
                    const amount = `$${((run.total_pull_amount_cents || 0) / 100).toFixed(2)}`
                    const period = `${run.pay_period_start} to ${run.pay_period_end}`
                    await emailService.sendPayrollFailedEmail(owner.email, owner.first_name, amount, period, errorMsg)
                  }
                }
              }
            } catch (emailErr) {
              console.error('Failed to send failure email:', emailErr)
            }
          }
          break
        }

        default:
          console.log(`Unhandled Stripe event type: ${eventType}`)
      }

      // Mark as completed
      await supabase
        .from('webhook_events')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', webhookEventId)

      return { processed: true }
    } catch (error) {
      // Mark as failed
      await supabase
        .from('webhook_events')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('id', webhookEventId)

      throw error
    }
  },

  /**
   * Process a Wise webhook event with idempotency.
   * Handles transfer state changes for payouts.
   */
  async processWiseEvent(event) {
    const eventId = event.delivery_id || event.event_id || `wise-${Date.now()}`
    const eventType = event.event_type

    // Idempotency check
    const { data: inserted, error: insertError } = await supabase
      .from('webhook_events')
      .insert({
        provider: 'wise',
        event_id: eventId,
        event_type: eventType,
        status: 'processing',
        payload: event.data || {},
        attempts: 1
      })
      .select('id')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        console.log(`Wise webhook event ${eventId} already processed, skipping`)
        return { skipped: true }
      }
      console.error('Failed to insert wise webhook event:', insertError)
      throw insertError
    }

    const webhookEventId = inserted.id

    try {
      switch (eventType) {
        case 'transfers#state-change': {
          const transferData = event.data?.resource || event.data
          const wiseTransferId = String(transferData?.id || transferData?.transfer_id)
          const currentState = transferData?.current_state || transferData?.state

          if (!wiseTransferId) {
            console.warn('Wise transfer state change without transfer ID')
            break
          }

          // Map Wise states → our transfer_status enum
          let transferStatus
          let isTerminal = false

          switch (currentState) {
            case 'outgoing_payment_sent':
              transferStatus = 'completed'
              isTerminal = true
              break
            case 'bounced_back':
              transferStatus = 'bounced_back'
              isTerminal = true
              break
            case 'cancelled':
            case 'funds_refunded':
              transferStatus = 'failed'
              isTerminal = true
              break
            case 'processing':
            case 'funds_converted':
              transferStatus = 'processing'
              break
            default:
              console.log(`Unhandled Wise transfer state: ${currentState}`)
              transferStatus = currentState
          }

          // Update wise_transfers table
          const updateData = { status: transferStatus }
          if (transferStatus === 'completed') {
            updateData.completed_at = new Date().toISOString()
          }
          if (['bounced_back', 'failed'].includes(transferStatus)) {
            updateData.error_message = transferData?.error_message || `Transfer ${currentState}`
          }

          await supabase
            .from('wise_transfers')
            .update(updateData)
            .eq('wise_transfer_id', wiseTransferId)

          // Update the corresponding payroll_item
          const { data: wiseTransfer } = await supabase
            .from('wise_transfers')
            .select('payroll_item_id, payroll_run_id, member_id, target_amount, source_amount')
            .eq('wise_transfer_id', wiseTransferId)
            .single()

          if (wiseTransfer?.payroll_item_id) {
            const itemUpdate = { transfer_status: transferStatus }
            if (transferStatus === 'completed') {
              itemUpdate.payout_completed_at = new Date().toISOString()
            }
            if (['bounced_back', 'failed'].includes(transferStatus)) {
              itemUpdate.transfer_error = transferData?.error_message || `Transfer ${currentState}`
            }

            await supabase
              .from('payroll_items')
              .update(itemUpdate)
              .eq('id', wiseTransfer.payroll_item_id)

            // Send emails on terminal states
            if (isTerminal) {
              try {
                const { emailService } = await import('./email.service.js')
                const { data: item } = await supabase
                  .from('payroll_items')
                  .select(`
                    member:organization_members!payroll_items_member_id_fkey(
                      profile:profiles!organization_members_profile_id_fkey(email, first_name)
                    )
                  `)
                  .eq('id', wiseTransfer.payroll_item_id)
                  .single()

                const { data: run } = await supabase
                  .from('payroll_runs')
                  .select('pay_period_start, pay_period_end')
                  .eq('id', wiseTransfer.payroll_run_id)
                  .single()

                const employeeEmail = item?.member?.profile?.email
                const employeeName = item?.member?.profile?.first_name
                const period = run ? `${run.pay_period_start} to ${run.pay_period_end}` : 'recent period'

                if (employeeEmail) {
                  if (transferStatus === 'completed') {
                    const amountNPR = wiseTransfer.target_amount ? `NPR ${wiseTransfer.target_amount.toLocaleString()}` : 'your payment'
                    await emailService.sendTransferCompletedEmail(employeeEmail, employeeName, amountNPR, period)
                  } else {
                    const amountUSD = wiseTransfer.source_amount ? `$${wiseTransfer.source_amount.toFixed(2)}` : 'your payment'
                    const reason = transferData?.error_message || `Transfer ${currentState}`
                    await emailService.sendTransferFailedEmail(employeeEmail, employeeName, amountUSD, period, reason)
                  }
                }
              } catch (emailErr) {
                console.error('Failed to send transfer email:', emailErr)
              }
            }

            // Check if all items in the run are terminal → mark run completed
            if (isTerminal && wiseTransfer.payroll_run_id) {
              await this._checkRunCompletion(wiseTransfer.payroll_run_id)
            }
          }
          break
        }

        default:
          console.log(`Unhandled Wise event type: ${eventType}`)
      }

      // Mark as completed
      await supabase
        .from('webhook_events')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', webhookEventId)

      return { processed: true }
    } catch (error) {
      await supabase
        .from('webhook_events')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('id', webhookEventId)

      throw error
    }
  },

  /**
   * Check if all items in a payroll run have reached terminal state.
   * If so, mark the run as completed and send summary email to employer.
   */
  async _checkRunCompletion(runId) {
    const { data: items } = await supabase
      .from('payroll_items')
      .select('transfer_status')
      .eq('payroll_run_id', runId)

    if (!items || items.length === 0) return

    const terminalStatuses = ['completed', 'failed', 'bounced_back']
    const allTerminal = items.every(item => terminalStatuses.includes(item.transfer_status))

    if (!allTerminal) return

    // Mark run as completed
    await supabase
      .from('payroll_runs')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', runId)

    // Send summary email to employer
    try {
      const { emailService } = await import('./email.service.js')
      const { data: run } = await supabase
        .from('payroll_runs')
        .select('organization_id, pay_period_start, pay_period_end')
        .eq('id', runId)
        .single()

      if (run) {
        const { data: org } = await supabase
          .from('organizations')
          .select('owner_id')
          .eq('id', run.organization_id)
          .single()

        if (org) {
          const { data: owner } = await supabase
            .from('profiles')
            .select('email, first_name')
            .eq('id', org.owner_id)
            .single()

          if (owner) {
            const successCount = items.filter(i => i.transfer_status === 'completed').length
            const period = `${run.pay_period_start} to ${run.pay_period_end}`
            await emailService.sendPayrollCompleteEmail(owner.email, owner.first_name, successCount, items.length, period)
          }
        }
      }
    } catch (emailErr) {
      console.error('Failed to send payroll complete email:', emailErr)
    }
  }
}
