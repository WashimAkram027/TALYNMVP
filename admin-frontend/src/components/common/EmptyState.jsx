export default function EmptyState({ icon = 'inbox', message = 'No data found', action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="material-icons-outlined text-[48px] text-slate-300 mb-3">{icon}</span>
      <p className="text-text-secondary text-sm">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
