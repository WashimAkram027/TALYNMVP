import { useState, useEffect } from 'react'
import { complianceService } from '../services/complianceService'
import { useAuthStore } from '../store/authStore'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
]

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'document', label: 'Document' },
  { value: 'training', label: 'Training' },
  { value: 'certification', label: 'Certification' },
  { value: 'policy', label: 'Policy' },
  { value: 'other', label: 'Other' }
]

const SEVERITY_STYLES = {
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30',
    icon: 'text-blue-500',
    iconName: 'info'
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/30',
    icon: 'text-yellow-600',
    iconName: 'warning'
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30',
    icon: 'text-red-500',
    iconName: 'error'
  }
}

const getStatusBadge = (status) => {
  const styles = {
    pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    submitted: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    approved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
  }
  const dots = {
    pending: 'bg-yellow-500',
    submitted: 'bg-blue-500',
    approved: 'bg-green-500',
    rejected: 'bg-red-500'
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status] || dots.pending}`}></span>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending'}
    </span>
  )
}

const isPastDue = (dueDate) => {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

export default function Compliance() {
  const { profile } = useAuthStore()
  const [items, setItems] = useState([])
  const [alerts, setAlerts] = useState([])
  const [score, setScore] = useState(null)
  const [dueSoon, setDueSoon] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [requiredFilter, setRequiredFilter] = useState('')

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const filters = {}
      if (statusFilter) filters.status = statusFilter
      if (typeFilter) filters.itemType = typeFilter
      if (requiredFilter !== '') filters.isRequired = requiredFilter === 'true'

      const [itemsData, alertsData, scoreData, dueSoonData] = await Promise.all([
        complianceService.getComplianceItems(null, filters).catch(() => []),
        complianceService.getAlerts(null).catch(() => []),
        complianceService.getComplianceScore(null).catch(() => null),
        complianceService.getItemsDueSoon(null, 30).catch(() => [])
      ])

      setItems(itemsData || [])
      setAlerts(alertsData || [])
      setScore(scoreData)
      setDueSoon(dueSoonData || [])
    } catch (err) {
      console.error('Failed to fetch compliance data:', err)
      setError(err.message || 'Failed to load compliance data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData()
    }, 300)
    return () => clearTimeout(timer)
  }, [statusFilter, typeFilter, requiredFilter])

  const handleMarkAlertRead = async (alertId) => {
    try {
      await complianceService.markAlertRead(alertId)
      setAlerts(prev => prev.filter(a => a.id !== alertId))
    } catch (err) {
      console.error('Failed to mark alert read:', err)
    }
  }

  const handleDismissAlert = async (alertId) => {
    try {
      await complianceService.dismissAlert(alertId)
      setAlerts(prev => prev.filter(a => a.id !== alertId))
    } catch (err) {
      console.error('Failed to dismiss alert:', err)
    }
  }

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Delete compliance item "${item.name}"? This cannot be undone.`)) return
    try {
      setActionLoading(true)
      await complianceService.deleteComplianceItem(item.id)
      await fetchData()
    } catch (err) {
      alert(err.message || 'Failed to delete item')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setShowModal(true)
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-subtext-light dark:text-subtext-dark">Loading compliance data...</p>
        </div>
      </div>
    )
  }

  if (error && items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <span className="material-icons-outlined text-red-500 text-4xl mb-4">error_outline</span>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => fetchData()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Compliance</h1>
            <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">
              Track compliance items, alerts, and organizational requirements
            </p>
          </div>
          {/* Compliance Score Badge */}
          {score !== null && (
            <div className={`h-16 w-16 rounded-full border-4 flex items-center justify-center font-bold text-lg ${
              score >= 80 ? 'border-green-500 text-green-600 dark:text-green-400' :
              score >= 50 ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400' :
              'border-red-500 text-red-600 dark:text-red-400'
            }`}>
              {score}%
            </div>
          )}
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowModal(true) }}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium shadow-md shadow-blue-500/20 transition flex items-center gap-2"
        >
          <span className="material-icons-outlined text-lg">add</span>
          Add Item
        </button>
      </div>

      {/* Alerts Panel */}
      {alerts.length > 0 && (
        <div className="mb-8 space-y-3">
          <h2 className="text-sm font-semibold text-subtext-light dark:text-subtext-dark uppercase tracking-wide flex items-center gap-2">
            <span className="material-icons-outlined text-lg">gpp_maybe</span>
            Active Alerts ({alerts.length})
          </h2>
          {alerts.map(alert => {
            const severity = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info
            return (
              <div key={alert.id} className={`p-4 rounded-lg border flex gap-3 items-start ${severity.bg}`}>
                <span className={`material-icons-outlined text-lg mt-0.5 ${severity.icon}`}>
                  {severity.iconName}
                </span>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-text-light dark:text-text-dark">{alert.title}</h4>
                  <p className="text-xs text-subtext-light dark:text-subtext-dark mt-1">{alert.message}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMarkAlertRead(alert.id)}
                    className="p-1 text-subtext-light dark:text-subtext-dark hover:text-primary rounded transition"
                    title="Mark as read"
                  >
                    <span className="material-icons-outlined text-base">check_circle</span>
                  </button>
                  <button
                    onClick={() => handleDismissAlert(alert.id)}
                    className="p-1 text-subtext-light dark:text-subtext-dark hover:text-red-500 rounded transition"
                    title="Dismiss"
                  >
                    <span className="material-icons-outlined text-base">close</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Due Soon Section */}
      {dueSoon.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-subtext-light dark:text-subtext-dark uppercase tracking-wide flex items-center gap-2 mb-3">
            <span className="material-icons-outlined text-lg text-yellow-500">schedule</span>
            Due Within 30 Days ({dueSoon.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dueSoon.slice(0, 6).map(item => (
              <div
                key={item.id}
                className={`bg-surface-light dark:bg-surface-dark p-4 rounded-xl border shadow-sm ${
                  isPastDue(item.due_date)
                    ? 'border-red-300 dark:border-red-800'
                    : 'border-border-light dark:border-border-dark'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-light dark:text-text-dark">{item.name}</p>
                    <p className="text-xs text-subtext-light dark:text-subtext-dark mt-1">{item.item_type}</p>
                  </div>
                  {item.is_required && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                      Required
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-xs ${isPastDue(item.due_date) ? 'text-red-600 dark:text-red-400 font-medium' : 'text-subtext-light dark:text-subtext-dark'}`}>
                    {isPastDue(item.due_date) ? 'OVERDUE: ' : 'Due: '}
                    {new Date(item.due_date).toLocaleDateString()}
                  </span>
                  {getStatusBadge(item.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-border-dark shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2 text-subtext-light dark:text-subtext-dark">
            <span className="material-icons-outlined text-lg">filter_list</span>
            <span className="text-sm font-medium">Filters:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-44 border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full md:w-44 border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={requiredFilter}
            onChange={(e) => setRequiredFilter(e.target.value)}
            className="w-full md:w-44 border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Items</option>
            <option value="true">Required Only</option>
            <option value="false">Optional Only</option>
          </select>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Required</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark text-sm">
              {items.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <span className="material-icons-outlined text-gray-400 text-4xl mb-2">verified_user</span>
                      <p className="text-subtext-light dark:text-subtext-dark">No compliance items found</p>
                      <button
                        onClick={() => { setEditingItem(null); setShowModal(true) }}
                        className="text-primary text-sm mt-2 hover:underline"
                      >
                        Add your first compliance item
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition ${
                      isPastDue(item.due_date) && item.status !== 'approved' ? 'bg-red-50/50 dark:bg-red-900/5' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-text-light dark:text-text-dark">{item.name}</div>
                      {item.description && (
                        <p className="text-xs text-subtext-light dark:text-subtext-dark truncate max-w-[200px]">{item.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-text-light dark:text-text-dark capitalize">{item.item_type || '-'}</td>
                    <td className="px-6 py-4 text-text-light dark:text-text-dark">{item.member_name || '-'}</td>
                    <td className="px-6 py-4">
                      {item.due_date ? (
                        <span className={isPastDue(item.due_date) && item.status !== 'approved' ? 'text-red-600 dark:text-red-400 font-medium' : 'text-text-light dark:text-text-dark'}>
                          {new Date(item.due_date).toLocaleDateString()}
                          {isPastDue(item.due_date) && item.status !== 'approved' && (
                            <span className="material-icons-outlined text-xs ml-1 align-middle">warning</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-subtext-light dark:text-subtext-dark">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {item.is_required ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                          <span className="material-icons-outlined text-xs">shield</span>
                          Required
                        </span>
                      ) : (
                        <span className="text-xs text-subtext-light dark:text-subtext-dark">Optional</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-subtext-light dark:text-subtext-dark hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                          title="Edit"
                        >
                          <span className="material-icons-outlined text-base">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          disabled={actionLoading}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                          title="Delete"
                        >
                          <span className="material-icons-outlined text-base">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <ComplianceItemModal
          item={editingItem}
          onClose={() => { setShowModal(false); setEditingItem(null) }}
          onSuccess={() => {
            setShowModal(false)
            setEditingItem(null)
            fetchData()
          }}
        />
      )}
    </div>
  )
}

function ComplianceItemModal({ item, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    itemType: item?.item_type || 'document',
    memberId: item?.member_id || '',
    dueDate: item?.due_date ? item.due_date.split('T')[0] : '',
    isRequired: item?.is_required ?? true,
    status: item?.status || 'pending'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }
    if (!formData.itemType) {
      setError('Item type is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const payload = {
        name: formData.name,
        description: formData.description || null,
        itemType: formData.itemType,
        memberId: formData.memberId || null,
        dueDate: formData.dueDate || null,
        isRequired: formData.isRequired,
        status: formData.status
      }

      if (item) {
        await complianceService.updateComplianceItem(item.id, payload)
      } else {
        await complianceService.createComplianceItem(payload)
      }
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to save compliance item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">
              {item ? 'Edit Compliance Item' : 'Add Compliance Item'}
            </h2>
            <p className="text-sm text-subtext-light dark:text-subtext-dark">
              {item ? 'Update the item details' : 'Track a new compliance requirement'}
            </p>
          </div>
          <button onClick={onClose} className="text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Employment Contract"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              placeholder="Describe what's required..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Type *</label>
              <select
                value={formData.itemType}
                onChange={(e) => setFormData({ ...formData, itemType: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="document">Document</option>
                <option value="training">Training</option>
                <option value="certification">Certification</option>
                <option value="policy">Policy</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="pending">Pending</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Member ID (Optional)</label>
            <input
              type="text"
              value={formData.memberId}
              onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Associate with a specific member"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Due Date</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isRequired: !formData.isRequired })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.isRequired ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.isRequired ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
            <span className="text-sm text-text-light dark:text-text-dark">Required item</span>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <span className="material-icons-outlined text-lg">check</span>
                {item ? 'Save Changes' : 'Add Item'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
