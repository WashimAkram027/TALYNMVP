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

          // Bank details are retrieved from the Stripe PaymentMethod API
          // inside handleSetupIntentSucceeded, not from the webhook payload,
          // because the webhook payload may not include them reliably.
          await paymentsService.handleSetupIntentSucceeded(
            setupIntent.id, pmId
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
          // Micro-deposit verification pending — update status
          const setupIntent = event.data.object
          await supabase
            .from('payment_methods')
            .update({
              status: 'verifying_microdeposits',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_setup_intent_id', setupIntent.id)

          console.log(`SetupIntent ${setupIntent.id} requires action (micro-deposit verification)`)
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

            // Also update the payment transaction
            await supabase
              .from('payment_transactions')
              .update({ status: 'processing' })
              .eq('stripe_payment_intent_id', pi.id)

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
                    const { env } = await import('../config/env.js')
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
              // Email failures should not cause the webhook to fail
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
              // Email failures should not cause the webhook to fail
            }
          }
          break
        }

        // ─── Dispute events (ACH reversal) ───
        case 'charge.dispute.created': {
          const dispute = event.data.object
          const paymentIntentId = dispute.payment_intent

          if (paymentIntentId) {
            const { data: run } = await supabase
              .from('payroll_runs')
              .select('id, organization_id, pay_period_start, pay_period_end, total_pull_amount_cents')
              .eq('stripe_payment_intent_id', paymentIntentId)
              .single()

            if (run) {
              await paymentsService.handleChargeDisputeCreated(dispute, run.id, run.organization_id)
              console.log(`Dispute ${dispute.id} processed for payroll run ${run.id}`)

              // Send notification emails (non-fatal)
              try {
                const { emailService } = await import('./email.service.js')
                const { data: org } = await supabase
                  .from('organizations')
                  .select('owner_id, name')
                  .eq('id', run.organization_id)
                  .single()

                const amount = `$${((run.total_pull_amount_cents || 0) / 100).toFixed(2)}`
                const period = `${run.pay_period_start} to ${run.pay_period_end}`
                const reason = dispute.reason || 'unknown'

                if (org) {
                  // Employer notification
                  const { data: owner } = await supabase
                    .from('profiles')
                    .select('email, first_name')
                    .eq('id', org.owner_id)
                    .single()

                  if (owner) {
                    await emailService.sendPayrollDisputedEmail(owner.email, owner.first_name, amount, period, reason)
                  }

                  // Admin notification
                  try {
                    const { env } = await import('../config/env.js')
                    await emailService.sendAdminPayrollDisputedEmail(
                      env.adminEmail, org.name || 'Unknown', amount, period, run.id, reason, dispute.id
                    )
                  } catch (adminErr) {
                    console.error('Failed to send admin dispute notification:', adminErr)
                  }
                }
              } catch (emailErr) {
                console.error('Failed to send dispute email:', emailErr)
                // Email failures should not cause the webhook to fail
              }
            } else {
              console.warn(`Dispute ${dispute.id}: no payroll run found for PI ${paymentIntentId}`)
            }
          }
          break
        }

        // ─── Refund events ───
        case 'charge.refunded': {
          const charge = event.data.object
          const paymentIntentId = charge.payment_intent

          if (paymentIntentId) {
            const { data: run } = await supabase
              .from('payroll_runs')
              .select('id, organization_id, pay_period_start, pay_period_end, total_pull_amount_cents')
              .eq('stripe_payment_intent_id', paymentIntentId)
              .single()

            if (run) {
              await paymentsService.handleChargeRefunded(charge, run.id, run.organization_id)
              console.log(`Refund on charge ${charge.id} processed for payroll run ${run.id}`)

              // Send notification emails (non-fatal)
              try {
                const { emailService } = await import('./email.service.js')
                const { data: org } = await supabase
                  .from('organizations')
                  .select('owner_id, name')
                  .eq('id', run.organization_id)
                  .single()

                const refundedAmount = `$${((charge.amount_refunded || 0) / 100).toFixed(2)}`
                const period = `${run.pay_period_start} to ${run.pay_period_end}`

                if (org) {
                  const { data: owner } = await supabase
                    .from('profiles')
                    .select('email, first_name')
                    .eq('id', org.owner_id)
                    .single()

                  if (owner) {
                    await emailService.sendPayrollRefundedEmail(owner.email, owner.first_name, refundedAmount, period)
                  }

                  try {
                    const { env } = await import('../config/env.js')
                    await emailService.sendAdminPayrollRefundedEmail(
                      env.adminEmail, org.name || 'Unknown', refundedAmount, period, run.id, charge.id
                    )
                  } catch (adminErr) {
                    console.error('Failed to send admin refund notification:', adminErr)
                  }
                }
              } catch (emailErr) {
                console.error('Failed to send refund email:', emailErr)
              }
            } else {
              console.warn(`Refund on charge ${charge.id}: no payroll run found for PI ${paymentIntentId}`)
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
  }
}
