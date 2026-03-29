const statusStyles = {
  // Entity statuses
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending_review: 'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  not_submitted: 'bg-slate-50 text-slate-600 border-slate-200',

  // General statuses
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspended: 'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  invited: 'bg-blue-50 text-blue-700 border-blue-200',
  onboarding: 'bg-indigo-50 text-indigo-700 border-indigo-200',

  // Payroll statuses
  draft: 'bg-slate-50 text-slate-600 border-slate-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  pending_approval: 'bg-amber-50 text-amber-700 border-amber-200',
  failed: 'bg-red-50 text-red-700 border-red-200',

  // Payment
  succeeded: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  bounced: 'bg-red-50 text-red-700 border-red-200',

  // Email
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  opened: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  clicked: 'bg-violet-50 text-violet-700 border-violet-200',
  bounced_email: 'bg-red-50 text-red-700 border-red-200',
}

export default function StatusBadge({ status, label }) {
  const displayLabel = label || status?.replace(/_/g, ' ')
  const style = statusStyles[status] || 'bg-slate-50 text-slate-600 border-slate-200'

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${style}`}>
      {displayLabel}
    </span>
  )
}
