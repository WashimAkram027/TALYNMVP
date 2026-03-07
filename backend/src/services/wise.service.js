import { wiseApi } from '../config/wise.js'
import { env } from '../config/env.js'
import { supabase } from '../config/supabase.js'
import { BadRequestError, NotFoundError } from '../utils/errors.js'

/**
 * Wise API Service
 * Wraps Wise (TransferWise) API for international payouts (USD → NPR)
 */
export const wiseService = {
  /**
   * Create a Wise recipient (bank account) for an employee.
   * Stores in wise_recipients table.
   */
  async createRecipient(bankDetails, memberId, orgId) {
    if (!wiseApi) throw new BadRequestError('Wise is not configured')

    const { accountHolderName, bankCode, accountNumber, bankName, currency } = bankDetails

    // Deactivate any existing active recipient for this member
    const { data: existing } = await supabase
      .from('wise_recipients')
      .select('id')
      .eq('member_id', memberId)
      .eq('organization_id', orgId)
      .eq('status', 'active')

    if (existing && existing.length > 0) {
      const existingIds = existing.map(r => r.id)
      await supabase
        .from('wise_recipients')
        .update({ status: 'inactive' })
        .in('id', existingIds)
    }

    // Create recipient on Wise
    const { data: recipient } = await wiseApi.post('/v1/accounts', {
      profile: env.wiseProfileId,
      accountHolderName,
      currency: currency || 'NPR',
      type: 'nepal',
      details: {
        bankCode,
        accountNumber
      }
    })

    // Store in our DB
    const { data: stored, error: storeError } = await supabase
      .from('wise_recipients')
      .insert({
        organization_id: orgId,
        member_id: memberId,
        wise_account_id: String(recipient.id),
        account_holder_name: accountHolderName,
        bank_name: bankName || null,
        bank_code: bankCode,
        account_number_last4: accountNumber.slice(-4),
        currency: currency || 'NPR',
        status: 'active'
      })
      .select()
      .single()

    if (storeError) {
      console.error('Failed to store wise recipient:', storeError)
      throw new BadRequestError('Failed to save bank details')
    }

    // Update member with wise_recipient_id
    await supabase
      .from('organization_members')
      .update({ wise_recipient_id: stored.id })
      .eq('id', memberId)
      .eq('organization_id', orgId)

    return stored
  },

  /**
   * Get the Wise recipient for a member.
   */
  async getRecipientByMemberId(memberId, orgId) {
    const { data, error } = await supabase
      .from('wise_recipients')
      .select('*')
      .eq('member_id', memberId)
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new BadRequestError('Failed to fetch recipient')
    return data
  },

  /**
   * Create a Wise quote for USD → NPR conversion.
   * @param {number} sourceAmountCents — amount in USD cents
   * @returns quote object with exchange rate info
   */
  async createQuote(sourceAmountCents) {
    if (!wiseApi) throw new BadRequestError('Wise is not configured')

    const sourceAmount = sourceAmountCents / 100

    const { data: quote } = await wiseApi.post(`/v3/profiles/${env.wiseProfileId}/quotes`, {
      sourceCurrency: 'USD',
      targetCurrency: 'NPR',
      sourceAmount,
      payOut: 'BANK_TRANSFER'
    })

    return quote
  },

  /**
   * Create a Wise transfer using a quote and recipient.
   * @param {string} quoteId — Wise quote UUID
   * @param {number} recipientId — Wise recipient account ID
   * @param {string} customerTransactionId — idempotency key
   */
  async createTransfer(quoteId, recipientId, customerTransactionId) {
    if (!wiseApi) throw new BadRequestError('Wise is not configured')

    const { data: transfer } = await wiseApi.post('/v1/transfers', {
      targetAccount: recipientId,
      quoteUuid: quoteId,
      customerTransactionId,
      details: {
        reference: 'Payroll payment via Talyn'
      }
    })

    return transfer
  },

  /**
   * Fund a Wise transfer (initiate the actual payment).
   * @param {number} transferId — Wise transfer ID
   */
  async fundTransfer(transferId) {
    if (!wiseApi) throw new BadRequestError('Wise is not configured')

    const { data: funding } = await wiseApi.post(
      `/v3/profiles/${env.wiseProfileId}/transfers/${transferId}/payments`,
      { type: 'BALANCE' }
    )

    return funding
  }
}
