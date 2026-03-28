export default function EmptyState({ icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <span className="material-icons-outlined text-gray-400 text-3xl">{icon}</span>
      </div>
      <p className="text-subtext-light dark:text-subtext-dark">{title}</p>
      {description && (
        <p className="text-sm text-gray-400 mt-2">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 text-sm font-medium text-primary hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
