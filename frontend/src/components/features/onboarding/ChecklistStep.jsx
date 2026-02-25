import { useRef, useEffect, useState } from 'react'

const STATUS_CONFIG = {
  locked: {
    icon: 'lock',
    iconColor: 'text-gray-400 dark:text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    ringColor: '',
    label: null
  },
  active: {
    icon: 'radio_button_unchecked',
    iconColor: 'text-primary',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    ringColor: 'ring-2 ring-primary/30',
    label: null
  },
  in_progress: {
    icon: 'pending',
    iconColor: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    ringColor: '',
    label: { text: 'In Progress', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' }
  },
  pending_review: {
    icon: 'hourglass_top',
    iconColor: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    ringColor: '',
    label: { text: 'Pending Review', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' }
  },
  completed: {
    icon: 'check_circle',
    iconColor: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    ringColor: '',
    label: { text: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
  }
}

export default function ChecklistStep({ stepNumber, title, subtitle, status, expanded, onToggle, justCompleted, children }) {
  const contentRef = useRef(null)
  const [contentHeight, setContentHeight] = useState(0)
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.locked
  const isInteractive = status !== 'locked'

  // Measure content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContentHeight(entry.contentRect.height)
        }
      })
      observer.observe(contentRef.current)
      return () => observer.disconnect()
    }
  }, [expanded, children])

  return (
    <div className={`rounded-xl border overflow-hidden transition-all duration-300 ${
      justCompleted
        ? 'border-green-400 dark:border-green-600 shadow-md shadow-green-500/10'
        : `border-border-light dark:border-border-dark ${config.ringColor}`
    }`}>
      {/* Step Header */}
      <button
        onClick={() => isInteractive && onToggle?.()}
        disabled={!isInteractive}
        className={`w-full flex items-center gap-4 p-4 text-left transition-colors duration-200 ${
          isInteractive ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer' : 'cursor-default opacity-60'
        }`}
      >
        {/* Step Number + Icon */}
        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all duration-500 ${config.bgColor}`}>
          {status === 'completed' ? (
            <span className={`material-icons-outlined text-xl transition-all duration-300 ${config.iconColor} ${justCompleted ? 'scale-125' : 'scale-100'}`}>
              check_circle
            </span>
          ) : (
            <span className={`text-sm font-bold transition-colors duration-300 ${
              status === 'locked' ? 'text-gray-400 dark:text-gray-600' : 'text-text-light dark:text-text-dark'
            }`}>
              {stepNumber}
            </span>
          )}
        </div>

        {/* Title + Subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold text-sm transition-colors duration-300 ${
              status === 'locked' ? 'text-gray-400 dark:text-gray-600' : 'text-text-light dark:text-text-dark'
            }`}>
              {title}
            </h3>
            {config.label && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full transition-all duration-300 ${config.label.color}`}>
                {config.label.text}
              </span>
            )}
          </div>
          <p className={`text-xs mt-0.5 transition-colors duration-300 ${
            status === 'locked' ? 'text-gray-400 dark:text-gray-600' : 'text-subtext-light dark:text-subtext-dark'
          }`}>
            {subtitle}
          </p>
        </div>

        {/* Expand/Collapse Arrow */}
        {isInteractive && (
          <span className={`material-icons-outlined text-lg text-subtext-light dark:text-subtext-dark transition-transform duration-300 ${
            expanded ? 'rotate-180' : ''
          }`}>
            expand_more
          </span>
        )}
      </button>

      {/* Expandable Content with smooth height animation */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: expanded && isInteractive ? contentHeight + 32 : 0,
          opacity: expanded && isInteractive ? 1 : 0
        }}
      >
        <div ref={contentRef} className="px-4 pb-4 border-t border-border-light dark:border-border-dark">
          <div className="pt-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
