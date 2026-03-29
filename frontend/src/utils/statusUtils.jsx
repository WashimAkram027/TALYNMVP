/**
 * Shared status utilities for member status badges, labels, and formatting.
 * Used across Dashboard, People, and PersonDetail pages.
 */

export const STATUS_LABELS = {
  invited: 'Invited',
  onboarding: 'Onboarding',
  active: 'Active'
}

export const STATUS_STYLES = {
  invited: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-400',
    dot: 'bg-yellow-500'
  },
  onboarding: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-500'
  },
  active: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    dot: 'bg-green-500'
  }
}

const defaultStyle = {
  bg: 'bg-gray-100 dark:bg-gray-900/30',
  text: 'text-gray-700 dark:text-gray-400',
  dot: 'bg-gray-500'
}

export function StatusBadge({ status, size = 'sm' }) {
  const key = status?.toLowerCase()
  const style = STATUS_STYLES[key] || defaultStyle
  const label = STATUS_LABELS[key] || status || 'Unknown'

  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-1 text-xs'
    : 'px-3 py-1.5 text-sm'

  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'

  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClasses} rounded-full font-medium ${style.bg} ${style.text}`}>
      <span className={`${dotSize} rounded-full ${style.dot}`}></span>
      {label}
    </span>
  )
}

export const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'invited', label: 'Invited' },
  { value: 'onboarding', label: 'Onboarding' }
]

export function formatStartDate(dateString) {
  if (!dateString) return 'Not set'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
