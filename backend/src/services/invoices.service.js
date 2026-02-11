import { supabase } from '../config/supabase.js'
import { BadRequestError, NotFoundError } from '../utils/errors.js'

export const invoicesService = {
  async getInvoices(orgId, filters = {}) {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        member:organization_members!invoices_member_id_fkey(
          profile:profiles!organization_members_profile_id_fkey(full_name, email)
        ),
        created_by_profile:profiles!invoices_created_by_fkey(full_name)
      `)
      .eq('organization_id', orgId)
      .order('issue_date', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.fromDate) query = query.gte('issue_date', filters.fromDate)
    if (filters.toDate) query = query.lte('issue_date', filters.toDate)
    if (filters.search) {
      query = query.or(`invoice_number.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) throw new BadRequestError(error.message)
    return data
  },

  async getInvoice(invoiceId, orgId) {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        member:organization_members!invoices_member_id_fkey(
          profile:profiles!organization_members_profile_id_fkey(full_name, email, phone)
        ),
        created_by_profile:profiles!invoices_created_by_fkey(full_name),
        organization:organizations!invoices_organization_id_fkey(name, email, phone, address_line1, address_line2, city, state, postal_code, country, logo_url)
      `)
      .eq('id', invoiceId)
      .eq('organization_id', orgId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundError('Invoice not found')
      throw new BadRequestError(error.message)
    }
    return data
  },

  async generateInvoiceNumber(orgId) {
    try {
      const { data, error } = await supabase.rpc('generate_invoice_number', { p_org_id: orgId })
      if (error) throw error
      return data
    } catch {
      // Fallback: generate based on count
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
      return `INV-${String((count || 0) + 1).padStart(5, '0')}`
    }
  },

  async createInvoice(orgId, invoice, createdBy) {
    if (!invoice.invoice_number) {
      invoice.invoice_number = await this.generateInvoiceNumber(orgId)
    }

    const { data, error } = await supabase
      .from('invoices')
      .insert({ ...invoice, organization_id: orgId, created_by: createdBy })
      .select()
      .single()

    if (error) throw new BadRequestError(error.message)
    return data
  },

  async updateInvoice(invoiceId, orgId, updates) {
    if (updates.status === 'paid' && !updates.paid_at) {
      updates.paid_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', invoiceId)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundError('Invoice not found')
      throw new BadRequestError(error.message)
    }
    return data
  },

  async deleteInvoice(invoiceId, orgId) {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId)
      .eq('organization_id', orgId)

    if (error) throw new BadRequestError(error.message)
    return { success: true }
  },

  async getInvoiceStats(orgId) {
    const { data, error } = await supabase
      .from('invoices')
      .select('status, total_amount')
      .eq('organization_id', orgId)

    if (error) throw new BadRequestError(error.message)

    const stats = {
      total: data.length,
      totalAmount: data.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0),
      byStatus: {}
    }

    data.forEach(inv => {
      if (!stats.byStatus[inv.status]) {
        stats.byStatus[inv.status] = { count: 0, amount: 0 }
      }
      stats.byStatus[inv.status].count++
      stats.byStatus[inv.status].amount += Number(inv.total_amount || 0)
    })

    return stats
  },

  async getOverdueInvoices(orgId) {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        member:organization_members!invoices_member_id_fkey(
          profile:profiles!organization_members_profile_id_fkey(full_name, email)
        )
      `)
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .lt('due_date', today)
      .order('due_date', { ascending: true })

    if (error) throw new BadRequestError(error.message)
    return data
  },

  async updateOverdueStatus(orgId) {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('invoices')
      .update({ status: 'overdue' })
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .lt('due_date', today)
      .select()

    if (error) throw new BadRequestError(error.message)
    return data
  }
}
