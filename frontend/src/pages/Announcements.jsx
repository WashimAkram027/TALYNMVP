import { useState, useEffect } from 'react'
import { announcementsService } from '../services/announcementsService'
import { useAuthStore } from '../store/authStore'

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' }
]

export default function Announcements() {
  const { profile } = useAuthStore()
  const isEmployer = profile?.role === 'employer'

  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      setError(null)
      const filters = {}
      if (filter === 'published') filters.publishedOnly = true
      const data = await announcementsService.getAnnouncements(null, filters)
      let filtered = data || []
      if (filter === 'draft') {
        filtered = filtered.filter(a => !a.is_published)
      }
      // Sort: pinned first, then by date
      filtered.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1
        if (!a.is_pinned && b.is_pinned) return 1
        return new Date(b.created_at) - new Date(a.created_at)
      })
      setAnnouncements(filtered)
    } catch (err) {
      console.error('Failed to fetch announcements:', err)
      setError(err.message || 'Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [filter])

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return
    try {
      setActionLoading(true)
      await announcementsService.deleteAnnouncement(id)
      await fetchAnnouncements()
    } catch (err) {
      alert(err.message || 'Failed to delete announcement')
    } finally {
      setActionLoading(false)
    }
  }

  const handleTogglePin = async (id) => {
    try {
      setActionLoading(true)
      await announcementsService.togglePin(id)
      await fetchAnnouncements()
    } catch (err) {
      alert(err.message || 'Failed to toggle pin')
    } finally {
      setActionLoading(false)
    }
  }

  const openEditModal = (announcement) => {
    setEditingAnnouncement(announcement)
    setShowModal(true)
  }

  const openCreateModal = () => {
    setEditingAnnouncement(null)
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-subtext-light dark:text-subtext-dark">Loading announcements...</p>
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
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Announcements</h1>
          <p className="text-subtext-light dark:text-subtext-dark">Company news and updates</p>
        </div>
        {isEmployer && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition"
          >
            <span className="material-icons-outlined text-sm mr-1 align-middle">add</span>
            New Announcement
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === opt.value
                ? 'bg-primary text-white'
                : 'bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-8 text-center">
          <span className="material-icons-outlined text-4xl text-subtext-light dark:text-subtext-dark mb-2">campaign</span>
          <p className="text-subtext-light dark:text-subtext-dark">No announcements found</p>
          {isEmployer && (
            <button onClick={openCreateModal} className="mt-4 text-primary hover:underline">Create your first announcement</button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`bg-surface-light dark:bg-surface-dark border rounded-xl p-5 transition ${
                announcement.is_pinned
                  ? 'border-primary/50 dark:border-primary/30 ring-1 ring-primary/20'
                  : 'border-border-light dark:border-border-dark'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {announcement.is_pinned && (
                      <span className="material-icons-outlined text-primary text-lg" title="Pinned">push_pin</span>
                    )}
                    <h3 className="text-lg font-semibold text-text-light dark:text-text-dark truncate">{announcement.title}</h3>
                    {!announcement.is_published && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-subtext-light dark:text-subtext-dark line-clamp-3 whitespace-pre-line">
                    {announcement.content}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-subtext-light dark:text-subtext-dark">
                    <span className="flex items-center gap-1">
                      <span className="material-icons-outlined text-sm">person</span>
                      {announcement.author_name || 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-icons-outlined text-sm">calendar_today</span>
                      {new Date(announcement.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {announcement.expires_at && (
                      <span className="flex items-center gap-1">
                        <span className="material-icons-outlined text-sm">schedule</span>
                        Expires {new Date(announcement.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
                {isEmployer && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleTogglePin(announcement.id)}
                      disabled={actionLoading}
                      className={`p-1.5 rounded-lg transition ${announcement.is_pinned ? 'text-primary' : 'text-subtext-light dark:text-subtext-dark hover:text-primary'}`}
                      title={announcement.is_pinned ? 'Unpin' : 'Pin'}
                    >
                      <span className="material-icons-outlined text-lg">push_pin</span>
                    </button>
                    <button
                      onClick={() => openEditModal(announcement)}
                      disabled={actionLoading}
                      className="p-1.5 rounded-lg text-subtext-light dark:text-subtext-dark hover:text-primary transition"
                    >
                      <span className="material-icons-outlined text-lg">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      disabled={actionLoading}
                      className="p-1.5 rounded-lg text-subtext-light dark:text-subtext-dark hover:text-red-500 transition"
                    >
                      <span className="material-icons-outlined text-lg">delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <AnnouncementModal
          announcement={editingAnnouncement}
          onClose={() => { setShowModal(false); setEditingAnnouncement(null) }}
          onSuccess={() => { setShowModal(false); setEditingAnnouncement(null); fetchAnnouncements() }}
        />
      )}
    </div>
  )
}

function AnnouncementModal({ announcement, onClose, onSuccess }) {
  const isEdit = !!announcement
  const [formData, setFormData] = useState({
    title: announcement?.title || '',
    content: announcement?.content || '',
    is_pinned: announcement?.is_pinned || false,
    is_published: announcement?.is_published ?? true,
    expires_at: announcement?.expires_at ? announcement.expires_at.split('T')[0] : ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title || !formData.content) {
      setError('Title and content are required')
      return
    }
    try {
      setLoading(true)
      setError(null)
      const payload = { ...formData }
      if (!payload.expires_at) delete payload.expires_at
      if (isEdit) {
        await announcementsService.updateAnnouncement(announcement.id, payload)
      } else {
        await announcementsService.createAnnouncement(payload)
      }
      onSuccess()
    } catch (err) {
      setError(err.message || `Failed to ${isEdit ? 'update' : 'create'} announcement`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{isEdit ? 'Edit Announcement' : 'New Announcement'}</h2>
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
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Announcement title"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Content *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px] resize-y"
              placeholder="Write your announcement..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Expires At</label>
            <input
              type="date"
              value={formData.expires_at}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              className="w-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-gray-800 rounded-lg px-3 py-2 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="w-4 h-4 text-primary border-border-light rounded focus:ring-primary"
              />
              <span className="text-sm text-text-light dark:text-text-dark">Published</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_pinned}
                onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                className="w-4 h-4 text-primary border-border-light rounded focus:ring-primary"
              />
              <span className="text-sm text-text-light dark:text-text-dark">Pinned</span>
            </label>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 text-text-light dark:text-text-dark transition">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition">
              {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Publish')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
