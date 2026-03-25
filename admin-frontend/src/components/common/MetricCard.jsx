export default function MetricCard({ label, value, icon, trend, trendLabel, color = 'primary' }) {
  const colorMap = {
    primary: 'bg-indigo-50 text-indigo-600',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
    info: 'bg-sky-50 text-sky-600',
  }

  const iconBg = colorMap[color] || colorMap.primary

  return (
    <div className="bg-white rounded-xl border border-border-main p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-secondary text-sm font-medium">{label}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
          {trendLabel && (
            <p className={`text-xs mt-1 font-medium ${
              trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-text-secondary'
            }`}>
              {trend === 'up' && '+'}{trendLabel}
            </p>
          )}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
            <span className="material-icons text-[22px]">{icon}</span>
          </div>
        )}
      </div>
    </div>
  )
}
