import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotificationStore } from '../../store/notificationStore'

const ICON_MAP = {
  leave_requested: 'event_busy',
  leave_approved: 'event_available',
  leave_rejected: 'event_busy',
  leave_cancelled: 'event_busy',
  invoice_generated: 'request_quote',
  invoice_approved: 'check_circle',
  invoice_rejected: 'cancel',
  invoice_paid: 'paid',
  invoice_failed: 'error',
  invoice_disputed: 'gavel',
  invoice_refunded: 'currency_exchange',
  invitation_accepted: 'person_add',
  invitation_declined: 'person_remove',
  member_activated: 'how_to_reg',
  payroll_processing: 'sync',
  payroll_funded: 'account_balance',
  payroll_failed: 'error',
  payroll_disputed: 'gavel',
  payroll_refunded: 'currency_exchange',
  entity_submitted: 'upload_file',
  entity_approved: 'verified',
  entity_rejected: 'block'
}

const COLOR_MAP = {
  leave_requested: 'text-blue-500',
  leave_approved: 'text-green-500',
  leave_rejected: 'text-red-500',
  leave_cancelled: 'text-gray-500',
  invoice_generated: 'text-amber-500',
  invoice_approved: 'text-green-500',
  invoice_rejected: 'text-red-500',
  invoice_paid: 'text-green-600',
  invoice_failed: 'text-red-500',
  invoice_disputed: 'text-orange-500',
  invoice_refunded: 'text-blue-500',
  invitation_accepted: 'text-green-500',
  invitation_declined: 'text-red-500',
  member_activated: 'text-green-500',
  payroll_processing: 'text-blue-500',
  payroll_funded: 'text-green-600',
  payroll_failed: 'text-red-500',
  payroll_disputed: 'text-orange-500',
  payroll_refunded: 'text-blue-500',
  entity_submitted: 'text-blue-500',
  entity_approved: 'text-green-500',
  entity_rejected: 'text-red-500'
}

function timeAgo(dateStr) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)

  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function NotificationPanel({ onClose }) {
  const navigate = useNavigate()
  const panelRef = useRef(null)
  const { notifications, markRead, dismiss, markAllRead, unreadCount } = useNotificationStore()

  // Filter out dismissed notifications
  const visible = notifications.filter(n => !n.dismissed_at)

  // Click outside to close
  useEffect(() => {
    function handleMouseDown(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  const handleClick = (notif) => {
    if (!notif.read_at) markRead(notif.id)
    if (notif.action_url) navigate(notif.action_url)
    onClose()
  }

  const handleDismiss = (e, id) => {
    e.stopPropagation()
    dismiss(id)
  }

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full left-0 mb-2 w-80 max-h-[28rem] bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-xl flex flex-col z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-light dark:border-border-dark flex items-center justify-between shrink-0">
        <h3 className="text-sm font-semibold text-text-light dark:text-text-dark">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-primary hover:text-primary-hover font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-subtext-light dark:text-subtext-dark">
            <span className="material-icons-outlined text-3xl mb-2">notifications_none</span>
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          visible.map(notif => (
            <div
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={`px-4 py-3 flex items-start gap-3 cursor-pointer border-b border-border-light/50 dark:border-border-dark/50 last:border-b-0 transition-colors ${
                !notif.read_at
                  ? 'bg-primary/5 hover:bg-primary/10'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              {/* Icon */}
              <span className={`material-icons-outlined text-lg mt-0.5 shrink-0 ${COLOR_MAP[notif.type] || 'text-gray-500'}`}>
                {ICON_MAP[notif.type] || 'notifications'}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${!notif.read_at ? 'font-medium text-text-light dark:text-text-dark' : 'text-subtext-light dark:text-subtext-dark'}`}>
                  {notif.title}
                </p>
                {notif.message && (
                  <p className="text-xs text-subtext-light dark:text-subtext-dark mt-0.5 line-clamp-2">
                    {notif.message}
                  </p>
                )}
                <p className="text-[10px] text-subtext-light dark:text-subtext-dark mt-1">
                  {timeAgo(notif.created_at)}
                </p>
              </div>

              {/* Dismiss + Unread Dot */}
              <div className="flex items-center gap-1.5 shrink-0">
                {!notif.read_at && (
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                )}
                <button
                  onClick={(e) => handleDismiss(e, notif.id)}
                  className="text-subtext-light dark:text-subtext-dark hover:text-red-500 transition p-0.5"
                  title="Dismiss"
                >
                  <span className="material-icons-outlined text-sm">close</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
