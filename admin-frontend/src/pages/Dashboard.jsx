import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../components/common/LoadingSpinner'
import dashboardService from '../services/dashboardService'

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({ pendingDocs: 0, pendingPayroll: 0, totalUsers: 0 })

  useEffect(() => {
    async function fetchCounts() {
      try {
        const metrics = await dashboardService.getMetrics()
        setCounts({
          pendingDocs: metrics.pendingVerifications || 0,
          pendingPayroll: metrics.payrollRunsMtd || 0,
          totalUsers: metrics.totalUsers || 0,
        })
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCounts()
  }, [])

  if (loading) return <LoadingSpinner />

  const cards = [
    {
      title: 'Document Review',
      description: 'Review and approve onboarding documents for employers and employees',
      count: counts.pendingDocs,
      countLabel: 'pending review',
      icon: 'description',
      color: 'from-amber-500 to-orange-600',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
      path: '/documents',
    },
    {
      title: 'Payroll Management',
      description: 'Review payroll runs, edit employee earnings, and confirm payments',
      count: counts.pendingPayroll,
      countLabel: 'pending approval',
      icon: 'payments',
      color: 'from-emerald-500 to-teal-600',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      path: '/payroll',
    },
    {
      title: 'User Management',
      description: 'Manage all employer and employee accounts with full CRUD access',
      count: counts.totalUsers,
      countLabel: 'total users',
      icon: 'people',
      color: 'from-blue-500 to-indigo-600',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
      path: '/users',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">Quick access to your core admin tasks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div
            key={card.path}
            onClick={() => navigate(card.path)}
            className={`relative overflow-hidden bg-white rounded-2xl border ${card.borderColor} p-6 cursor-pointer 
              hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group`}
          >
            {/* Gradient accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.color}`} />

            {/* Icon */}
            <div className={`w-14 h-14 rounded-xl ${card.bgLight} flex items-center justify-center mb-4 
              group-hover:scale-110 transition-transform duration-300`}>
              <span className={`material-icons text-[28px] ${card.textColor}`}>{card.icon}</span>
            </div>

            {/* Title */}
            <h2 className="text-lg font-bold text-text-primary mb-1">{card.title}</h2>
            <p className="text-sm text-text-secondary mb-4 leading-relaxed">{card.description}</p>

            {/* Count badge */}
            <div className="flex items-center justify-between">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${card.bgLight}`}>
                <span className={`text-xl font-bold ${card.textColor}`}>{card.count}</span>
                <span className={`text-xs font-medium ${card.textColor} opacity-80`}>{card.countLabel}</span>
              </div>
              <span className={`material-icons ${card.textColor} opacity-50 group-hover:opacity-100 
                group-hover:translate-x-1 transition-all duration-300`}>
                arrow_forward
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
