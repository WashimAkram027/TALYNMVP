import { useState, useEffect } from 'react'
import { holidaysService } from '../services/holidaysService'
import { useAuthStore } from '../store/authStore'

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function Holidays() {
  const { profile } = useAuthStore()
  const isEmployer = profile?.role === 'employer'

  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showModal, setShowModal] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchHolidays = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await holidaysService.getHolidays(null, selectedYear)
      setHolidays(data || [])
    } catch (err) {
      console.error('Failed to fetch holidays:', err)
      setError(err.message || 'Failed to load holidays')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHolidays()
  }, [selectedYear])

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return
    try {
      setActionLoading(true)
      await holidaysService.deleteHoliday(id)
      await fetchHolidays()
    } catch (err) {
      alert(err.message || 'Failed to delete holiday')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCopyGlobal = async () => {
    try {
      setActionLoading(true)
      await holidaysService.copyGlobalHolidays(null, selectedYear)
      await fetchHolidays()
    } catch (err) {
      alert(err.message || 'Failed to copy global holidays')
    } finally {
      setActionLoading(false)
    }
  }

  const openEditModal = (holiday) => {
    setEditingHoliday(holiday)
    setShowModal(true)
  }

  const openCreateModal = () => {
    setEditingHoliday(null)
    setShowModal(true)
  }

  const today = new Date().toISOString().split('T')[0]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-subtext-light dark:text-subtext-dark">Loading holidays...</p>
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
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Holidays</h1>
          <p className="text-subtext-light dark:text-subtext-dark">Manage company holidays and observances</p>
        </div>
        {isEmployer && (
          <div className="flex gap-3">
            <button
              onClick={handleCopyGlobal}
              disabled={actionLoading}
              className="px-4 py-2 border border-border-light dark:border-border-dark text-text-light dark:text-text-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition disabled:opacity-50"
            >
              <span className="material-icons-outlined text-sm mr-1 align-middle">content_copy</span>
              Copy Global Holidays
            </button>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition"
            >
              <span className="material-icons-outlined text-sm mr-1 align-middle">add</span>
              Add Holiday
            </button>
          </div>
        )}
      </div>

      {/* Year Selector */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setSelectedYear(y => y - 1)}
          className="p-2 rounded-lg border border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-text-light dark:text-text-dark"
        >
          <span className="material-icons-outlined text-sm">chevron_left</span>
        </button>
        <span className="text-lg font-semibold text-text-light dark:text-text-dark min-w-[60px] text-center">{selectedYear}</span>
        <button
          onClick={() => setSelectedYear(y => y + 1)}
          className="p-2 rounded-lg border border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-text-light dark:text-text-dark"
        >
          <span className="material-icons-outlined text-sm">chevron_right</span>
        </button>
      </div>

      {/* Table */}
      {holidays.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-8 text-center">
          <span className="material-icons-outlined text-4xl text-subtext-light dark:text-subtext-dark mb-2">calendar_today</span>
          <p className="text-subtext-light dark:text-subtext-dark">No holidays found for {selectedYear}</p>
          {isEmployer && (
            <button onClick={openCreateModal} className="mt-4 text-primary hover:underline">Add your first holiday</button>
          )}
        </div>
      ) : (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-border-light dark:divide-border-dark">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Name</th>
                <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Date</th>
                <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Day</th>
                <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Type</th>
                <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Recurring</th>
                {isEmployer && (
                  <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-subtext-light dark:text-subtext-dark">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {holidays.map((holiday) => {
                const dateObj = new Date(holiday.date + 'T00:00:00')
                const dayOfWeek = DAYS_OF_WEEK[dateObj.getDay()]
                const isUpcoming = holiday.date >= today
                return (
                  <tr key={holiday.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition ${isUpcoming ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="material-icons-outlined text-primary text-lg">event</span>
                        <span className="text-sm font-medium text-text-light dark:text-text-dark">{holiday.name}</span>
                      </div>
                      {holiday.description && (
                        <p className="text-xs text-subtext-light dark:text-subtext-dark mt-1 ml-8">{holiday.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                      {new Date(holiday.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-subtext-light dark:text-subtext-dark">{dayOfWeek}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        holiday.type === 'global' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                      }`}>
                        {holiday.type === 'global' ? 'Global' : 'Company'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {holiday.is_recurring && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          <span className="material-icons-outlined text-xs">repeat</span>
                          Yearly
                        </span>
                      )}
                    </td>
                    {isEmployer && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(holiday)}
                            className="text-primary hover:text-primary-hover"
                            disabled={actionLoading}
                          >
                            <span className="material-icons-outlined text-lg">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(holiday.id)}
                            className="text-red-500 hover:text-red-700"
                            disabled={actionLoading}
                          >
                            <span className="material-icons-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <HolidayModal
          holiday={editingHoliday}
          onClose={() => { setShowModal(false); setEditingHoliday(null) }}
          onSuccess={() => { setShowModal(false); setEditingHoliday(null); fetchHolidays() }}
        />
      )}
    </div>
  )
}

function HolidayModal({ holiday, onClose, onSuccess }) {
  const isEdit = !!holiday
  const [formData, setFormData] = useState({
    name: holiday?.name || '',
    date: holiday?.date || '',
    description: holiday?.description || '',
    is_recurring: holiday?.is_recurring || false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.date) {
      setError('Name and date are required')
      return
    }
    try {
      setLoading(true)
      setError(null)
      if (isEdit) {
        await holidaysService.updateHoliday(holiday.id, formData)
      } else {
        await holidaysService.createHoliday(formData)
      }
      onSuccess()
    } catch (err) {
      setError(err.message || `Failed to ${isEdit ? 'update' : 'create'} holiday`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{isEdit ? 'Edit Holiday' : 'Add Holiday'}</h2>
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
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. New Year's Day"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Date *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Optional description"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_recurring}
                onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
            <span className="text-sm text-text-light dark:text-text-dark">Recurring every year</span>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 text-text-light dark:text-text-dark transition">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition">
              {loading ? (isEdit ? 'Saving...' : 'Adding...') : (isEdit ? 'Save Changes' : 'Add Holiday')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
