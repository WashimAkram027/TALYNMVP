import { useState, useEffect } from 'react'
import { invoicesService } from '../services/invoicesService'
import { useAuthStore } from '../store/authStore'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' }
]

const STATUS_STYLES = {
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}

export default function Invoices() {
  const { profile } = useAuthStore()
  const isEmployer = profile?.role === 'employer'

  const [invoices, setInvoices] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      setError(null)
      const filters = {}
      if (search) filters.search = search
      if (statusFilter) filters.status = statusFilter
      const data = await invoicesService.getInvoices(null, filters)
      setInvoices(data || [])
    } catch (err) {
      console.error('Failed to fetch invoices:', err)
      setError(err.message || 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const data = await invoicesService.getInvoiceStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to fetch invoice stats:', err)
    }
  }

  useEffect(() => {
    fetchInvoices()
    fetchStats()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices()
    }, 300)
    return () => clearTimeout(timer)
  }, [search, statusFilter])

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return
    try {
      setActionLoading(true)
      await invoicesService.deleteInvoice(id)
      await fetchInvoices()
      await fetchStats()
    } catch (err) {
      alert(err.message || 'Failed to delete invoice')
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkPaid = async (id) => {
    try {
      setActionLoading(true)
      await invoicesService.updateInvoice(id, { status: 'paid' })
      await fetchInvoices()
      await fetchStats()
    } catch (err) {
      alert(err.message || 'Failed to update invoice')
    } finally {
      setActionLoading(false)
    }
  }

  const openEditModal = (invoice) => {
    setEditingInvoice(invoice)
    setShowModal(true)
  }

  const openCreateModal = () => {
    setEditingInvoice(null)
    setShowModal(true)
  }

  const formatCurrency = (amount, currency = 'NPR') => {
    return `${currency} ${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-subtext-light dark:text-subtext-dark">Loading invoices...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <span className="material-icons-outlined text-red-500 text-4xl mb-4">error_outline</span>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Invoices</h1>
          <p className="text-subtext-light dark:text-subtext-dark">Manage billing and invoices</p>
        </div>
        {isEmployer && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition"
          >
            <span className="material-icons-outlined text-sm mr-1 align-middle">add</span>
            Create Invoice
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-4 rounded-xl">
            <p className="text-xs text-subtext-light dark:text-subtext-dark uppercase font-semibold">Total Invoices</p>
            <p className="text-2xl font-bold text-text-light dark:text-text-dark mt-1">{stats.total_count || 0}</p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-4 rounded-xl">
            <p className="text-xs text-subtext-light dark:text-subtext-dark uppercase font-semibold">Total Amount</p>
            <p className="text-2xl font-bold text-text-light dark:text-text-dark mt-1">{formatCurrency(stats.total_amount)}</p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-4 rounded-xl">
            <p className="text-xs text-subtext-light dark:text-subtext-dark uppercase font-semibold">Paid</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.paid_count || 0}</p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-4 rounded-xl">
            <p className="text-xs text-subtext-light dark:text-subtext-dark uppercase font-semibold">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending_count || 0}</p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-4 rounded-xl">
            <p className="text-xs text-subtext-light dark:text-subtext-dark uppercase font-semibold">Overdue</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.overdue_count || 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-4 rounded-xl mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-subtext-light dark:text-subtext-dark text-lg">search</span>
            <input
              type="text"
              placeholder="Search by client or invoice number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg pl-10 pr-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {invoices.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-8 text-center">
          <span className="material-icons-outlined text-4xl text-subtext-light dark:text-subtext-dark mb-2">receipt_long</span>
          <p className="text-subtext-light dark:text-subtext-dark">No invoices found</p>
          {isEmployer && (
            <button onClick={openCreateModal} className="mt-4 text-primary hover:underline">Create your first invoice</button>
          )}
        </div>
      ) : (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-border-light dark:divide-border-dark">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Client</th>
                <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Amount</th>
                <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Due Date</th>
                <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Status</th>
                {isEmployer && (
                  <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-light dark:text-text-dark">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-text-light dark:text-text-dark">{invoice.client_name}</div>
                    {invoice.client_email && (
                      <div className="text-xs text-subtext-light dark:text-subtext-dark">{invoice.client_email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-light dark:text-text-dark">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-subtext-light dark:text-subtext-dark">
                    {invoice.due_date ? new Date(invoice.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[invoice.status] || STATUS_STYLES.draft}`}>
                      {invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1)}
                    </span>
                  </td>
                  {isEmployer && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        {(invoice.status === 'pending' || invoice.status === 'overdue') && (
                          <button
                            onClick={() => handleMarkPaid(invoice.id)}
                            disabled={actionLoading}
                            className="text-green-600 hover:text-green-800 text-xs font-medium"
                          >
                            Mark Paid
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(invoice)}
                          disabled={actionLoading}
                          className="text-primary hover:text-primary-hover"
                        >
                          <span className="material-icons-outlined text-lg">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          disabled={actionLoading}
                          className="text-red-500 hover:text-red-700"
                        >
                          <span className="material-icons-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <InvoiceModal
          invoice={editingInvoice}
          onClose={() => { setShowModal(false); setEditingInvoice(null) }}
          onSuccess={() => { setShowModal(false); setEditingInvoice(null); fetchInvoices(); fetchStats() }}
        />
      )}
    </div>
  )
}

function InvoiceModal({ invoice, onClose, onSuccess }) {
  const isEdit = !!invoice
  const [formData, setFormData] = useState({
    invoice_number: invoice?.invoice_number || '',
    client_name: invoice?.client_name || '',
    client_email: invoice?.client_email || '',
    amount: invoice?.amount || '',
    currency: invoice?.currency || 'NPR',
    due_date: invoice?.due_date || '',
    status: invoice?.status || 'draft',
    notes: invoice?.notes || '',
    items: invoice?.items || []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isEdit && !formData.invoice_number) {
      invoicesService.generateInvoiceNumber().then(num => {
        setFormData(prev => ({ ...prev, invoice_number: num }))
      }).catch(() => {})
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.client_name || !formData.amount || !formData.due_date) {
      setError('Client name, amount, and due date are required')
      return
    }
    try {
      setLoading(true)
      setError(null)
      if (isEdit) {
        await invoicesService.updateInvoice(invoice.id, formData)
      } else {
        await invoicesService.createInvoice(formData)
      }
      onSuccess()
    } catch (err) {
      setError(err.message || `Failed to ${isEdit ? 'update' : 'create'} invoice`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center sticky top-0 bg-surface-light dark:bg-surface-dark">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{isEdit ? 'Edit Invoice' : 'Create Invoice'}</h2>
          <button onClick={onClose} className="text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Invoice Number</label>
            <input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="INV-001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Client Name *</label>
            <input
              type="text"
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Client name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Client Email</label>
            <input
              type="email"
              value={formData.client_email}
              onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="client@example.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Amount *</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="NPR">NPR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Due Date *</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-y"
              placeholder="Optional notes..."
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 text-text-light dark:text-text-dark transition">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition">
              {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Invoice')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
