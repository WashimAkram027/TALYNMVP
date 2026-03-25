import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy h:mm a')
  } catch {
    return dateStr
  }
}

export function formatRelative(dateStr) {
  if (!dateStr) return '-'
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true })
  } catch {
    return dateStr
  }
}

export function formatCurrency(amount, currency = 'USD') {
  if (amount == null) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(num) {
  if (num == null) return '-'
  return new Intl.NumberFormat('en-US').format(num)
}

export function formatStatus(status) {
  if (!status) return '-'
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
