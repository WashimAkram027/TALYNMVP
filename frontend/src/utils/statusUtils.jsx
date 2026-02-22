/**
 * Shared status utilities for member status badges, labels, and formatting.
 * Used across Dashboard, People, and PersonDetail pages.
 */

export const STATUS_LABELS = {
  invited: 'Invited',
  onboarding: 'Onboarding',
  onboarding_at_risk: 'Onboarding at Risk',
  onboarding_overdue: 'Onboarding Overdue',
  ready_to_start: 'Ready to Start',
  active: 'Active',
  offboarding: 'Offboarding',
  inactive: 'Inactive',
  in_review: 'In Review',
  quote_requires_changes: 'Quote Requires Changes',
  no_active_contracts: 'No Active Contracts',
  offboarded: 'Offboarded'
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
  onboarding_at_risk: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-400',
    dot: 'bg-orange-500'
  },
  onboarding_overdue: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500'
  },
  ready_to_start: {
    bg: 'bg-teal-100 dark:bg-teal-900/30',
    text: 'text-teal-700 dark:text-teal-400',
    dot: 'bg-teal-500'
  },
  active: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    dot: 'bg-green-500'
  },
  offboarding: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500'
  },
  inactive: {
    bg: 'bg-gray-100 dark:bg-gray-900/30',
    text: 'text-gray-700 dark:text-gray-400',
    dot: 'bg-gray-500'
  },
  in_review: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-400',
    dot: 'bg-purple-500'
  },
  quote_requires_changes: {
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    text: 'text-pink-700 dark:text-pink-400',
    dot: 'bg-pink-500'
  },
  no_active_contracts: {
    bg: 'bg-slate-100 dark:bg-slate-900/30',
    text: 'text-slate-700 dark:text-slate-400',
    dot: 'bg-slate-500'
  },
  offboarded: {
    bg: 'bg-gray-100 dark:bg-gray-900/30',
    text: 'text-gray-700 dark:text-gray-400',
    dot: 'bg-gray-500'
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
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'onboarding_at_risk', label: 'Onboarding at Risk' },
  { value: 'onboarding_overdue', label: 'Onboarding Overdue' },
  { value: 'ready_to_start', label: 'Ready to Start' },
  { value: 'offboarding', label: 'Offboarding' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'in_review', label: 'In Review' },
  { value: 'quote_requires_changes', label: 'Quote Requires Changes' },
  { value: 'no_active_contracts', label: 'No Active Contracts' },
  { value: 'offboarded', label: 'Offboarded' }
]

export function formatStartDate(dateString) {
  if (!dateString) return 'Not set'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
