import { supabase } from '../config/supabase.js'
import { wiseService } from './wise.service.js'
import { BadRequestError } from '../utils/errors.js'
import crypto from 'crypto'

/**
 * Wise Payout Orchestration Service
 * Coordinates creating quotes, transfers, and funding for payroll items.
 */
export const wisePayout = {
  /**
   * Initiate payouts for all items in a funded payroll run.
   * Partial-failure tolerant — processes each item independently.
   */
  async initiatePayouts(runId, orgId) {
    // Fetch all payroll items for this run
    const { data: items, error: itemsError } = await supabase
      .from('payroll_items')
      .select(`
        id, member_id, net_pay, currency,
        member:organization_members!payroll_items_member_id_fkey(
          id, wise_recipient_id,
          wise_recipient:wise_recipients!organization_members_wise_recipient_id_fkey(wise_account_id)
        )
      `)
      .eq('payroll_run_id', runId)

    if (itemsError) {
      console.error('Failed to fetch payroll items for payout:', itemsError)
      return
    }

    const results = { success: 0, failed: 0, skipped: 0, errors: [] }

    for (const item of items) {
      try {
        // Check if member has a Wise recipient
        const wiseAccountId = item.member?.wise_recipient?.wise_account_id
        if (!wiseAccountId) {
          console.warn(`Member ${item.member_id} has no Wise recipient, skipping payout`)
          await supabase
            .from('payroll_items')
            .update({ transfer_status: 'failed', transfer_error: 'No bank details on file' })
            .eq('id', item.id)
          results.skipped++
          continue
        }

        // Convert net_pay (USD) to cents for the quote
        const amountCents = Math.round((item.net_pay || 0) * 100)
        if (amountCents <= 0) {
          results.skipped++
          continue
        }

        // 1. Create quote
        const quote = await wiseService.createQuote(amountCents)

        // 2. Create transfer
        const idempotencyKey = `payroll-${runId}-item-${item.id}`
        const transfer = await wiseService.createTransfer(
          quote.id,
          parseInt(wiseAccountId),
          idempotencyKey
        )

        // 3. Fund transfer
        await wiseService.fundTransfer(transfer.id)

        // 4. Store wise_transfers record
        const { error: insertError } = await supabase
          .from('wise_transfers')
          .insert({
            organization_id: orgId,
            payroll_item_id: item.id,
            payroll_run_id: runId,
            member_id: item.member_id,
            wise_transfer_id: String(transfer.id),
            wise_quote_id: quote.id,
            source_amount: item.net_pay,
            source_currency: 'USD',
            target_amount: quote.paymentOptions?.[0]?.targetAmount || quote.targetAmount || null,
            target_currency: 'NPR',
            exchange_rate: quote.rate || null,
            status: 'processing',
            idempotency_key: idempotencyKey
          })

        if (insertError) {
          console.error('Failed to insert wise_transfers row:', insertError)
        }

        // 5. Update payroll item
        await supabase
          .from('payroll_items')
          .update({
            transfer_status: 'processing',
            wise_transfer_id: String(transfer.id),
            exchange_rate: quote.rate || null,
            target_amount_npr: quote.paymentOptions?.[0]?.targetAmount || quote.targetAmount || null
          })
          .eq('id', item.id)

        results.success++
      } catch (err) {
        console.error(`Payout failed for item ${item.id}:`, err)
        results.failed++
        results.errors.push({ itemId: item.id, error: err.message })

        // Mark item as failed
        await supabase
          .from('payroll_items')
          .update({
            transfer_status: 'failed',
            transfer_error: err.message
          })
          .eq('id', item.id)
      }
    }

    console.log(`Payout results for run ${runId}:`, results)
    return results
  },

  /**
   * Retry a single failed/bounced transfer with a new idempotency key.
   */
  async retryTransfer(payrollItemId, orgId) {
    // Fetch the item
    const { data: item, error: itemError } = await supabase
      .from('payroll_items')
      .select(`
        id, member_id, net_pay, payroll_run_id, transfer_status,
        member:organization_members!payroll_items_member_id_fkey(
          id, wise_recipient_id,
          wise_recipient:wise_recipients!organization_members_wise_recipient_id_fkey(wise_account_id)
        )
      `)
      .eq('id', payrollItemId)
      .single()

    if (itemError || !item) throw new BadRequestError('Payroll item not found')

    // Verify org ownership via the run
    const { data: run } = await supabase
      .from('payroll_runs')
      .select('organization_id')
      .eq('id', item.payroll_run_id)
      .single()

    if (!run || run.organization_id !== orgId) {
      throw new BadRequestError('Payroll item not found')
    }

    if (!['failed', 'bounced_back'].includes(item.transfer_status)) {
      throw new BadRequestError('Can only retry failed or bounced transfers')
    }

    const wiseAccountId = item.member?.wise_recipient?.wise_account_id
    if (!wiseAccountId) throw new BadRequestError('Employee has no bank details on file')

    const amountCents = Math.round((item.net_pay || 0) * 100)
    if (amountCents <= 0) throw new BadRequestError('Invalid amount')

    // New idempotency key for the retry
    const retryKey = `payroll-${item.payroll_run_id}-item-${item.id}-retry-${crypto.randomUUID()}`

    // 1. Quote
    const quote = await wiseService.createQuote(amountCents)

    // 2. Transfer
    const transfer = await wiseService.createTransfer(
      quote.id,
      parseInt(wiseAccountId),
      retryKey
    )

    // 3. Fund
    await wiseService.fundTransfer(transfer.id)

    // 4. Update wise_transfers
    await supabase
      .from('wise_transfers')
      .insert({
        organization_id: orgId,
        payroll_item_id: item.id,
        payroll_run_id: item.payroll_run_id,
        member_id: item.member_id,
        wise_transfer_id: String(transfer.id),
        wise_quote_id: quote.id,
        source_amount: item.net_pay,
        source_currency: 'USD',
        target_amount: quote.paymentOptions?.[0]?.targetAmount || quote.targetAmount || null,
        target_currency: 'NPR',
        exchange_rate: quote.rate || null,
        status: 'processing',
        idempotency_key: retryKey
      })

    // 5. Update payroll item
    await supabase
      .from('payroll_items')
      .update({
        transfer_status: 'processing',
        wise_transfer_id: String(transfer.id),
        exchange_rate: quote.rate || null,
        target_amount_npr: quote.paymentOptions?.[0]?.targetAmount || quote.targetAmount || null,
        transfer_error: null
      })
      .eq('id', item.id)

    return { transferId: transfer.id, status: 'processing' }
  }
}
