import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import LoadingSpinner from '../components/common/LoadingSpinner'
import StatusBadge from '../components/common/StatusBadge'
import dashboardService from '../services/dashboardService'
import eorConfigService from '../services/eorConfigService'
import { formatDate } from '../utils/formatters'

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({ pendingDocs: 0, pendingPayroll: 0, totalUsers: 0, pendingOnboardings: 0, staleInvitations: 0 })
  const [pendingOnboardings, setPendingOnboardings] = useState([])
  const [onboardingsLoading, setOnboardingsLoading] = useState(true)

  // Exchange rate state
  const [eorConfig, setEorConfig] = useState(null)
  const [rateEditing, setRateEditing] = useState(false)
  const [rateInput, setRateInput] = useState('')
  const [rateSaving, setRateSaving] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const [metricsResult, onboardingsResult, configsResult] = await Promise.allSettled([
          dashboardService.getMetrics(),
          dashboardService.getPendingOnboardings(),
          eorConfigService.list()
        ])
        if (metricsResult.status === 'fulfilled') {
          const metrics = metricsResult.value
          setCounts({
            pendingDocs: metrics.pendingVerifications || 0,
            pendingPayroll: metrics.pendingPayrollRuns || 0,
            totalUsers: metrics.totalUsers || 0,
            pendingOnboardings: metrics.pendingOnboardings || 0,
            staleInvitations: metrics.staleInvitations || 0,
          })
        }
        if (onboardingsResult.status === 'fulfilled') {
          setPendingOnboardings(onboardingsResult.value || [])
        }
        if (configsResult.status === 'fulfilled') {
          const nplConfig = (configsResult.value || []).find(c => c.country_code === 'NPL' && c.is_active)
          if (nplConfig) setEorConfig(nplConfig)
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
        setOnboardingsLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleRateSave = async () => {
    const rate = parseFloat(rateInput)
    if (isNaN(rate) || rate < 0.001 || rate > 0.05) {
      toast.error('Rate must be between 0.001 and 0.05 (20–1000 NPR/USD)')
      return
    }
    setRateSaving(true)
    try {
      const updated = await eorConfigService.update(eorConfig.id, { exchangeRate: rate })
      setEorConfig(updated)
      setRateEditing(false)
      toast.success('Exchange rate updated')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update exchange rate')
    } finally {
      setRateSaving(false)
    }
  }

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
    {
      title: 'Pending Onboardings',
      description: 'Track invited and onboarding members across all organizations',
      count: counts.pendingOnboardings,
      countLabel: counts.staleInvitations > 0 ? `pending (${counts.staleInvitations} stale)` : 'pending',
      icon: 'pending_actions',
      color: 'from-violet-500 to-purple-600',
      bgLight: 'bg-violet-50',
      textColor: 'text-violet-700',
      borderColor: 'border-violet-200',
      path: null,
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">Quick access to your core admin tasks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <div
            key={card.path || idx}
            onClick={() => card.path && navigate(card.path)}
            className={`relative overflow-hidden bg-white rounded-2xl border ${card.borderColor} p-6
              ${card.path ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : ''} transition-all duration-300 group`}
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
              {card.path && (
                <span className={`material-icons ${card.textColor} opacity-50 group-hover:opacity-100
                  group-hover:translate-x-1 transition-all duration-300`}>
                  arrow_forward
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Exchange Rate Widget */}
      {eorConfig && (
        <div className="mt-8">
          <div className="bg-white rounded-2xl border border-border-main p-6 max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <span className="material-icons text-[20px] text-indigo-600">currency_exchange</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">Exchange Rate (NPR → USD)</h3>
                <p className="text-xs text-text-secondary">Used for next invoice generation</p>
              </div>
            </div>

            {!rateEditing ? (
              <div>
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-3xl font-bold text-text-primary">
                    {eorConfig.exchange_rate ? parseFloat(eorConfig.exchange_rate).toFixed(6) : '—'}
                  </span>
                </div>
                {eorConfig.exchange_rate && (
                  <p className="text-sm text-text-secondary mb-3">
                    1 NPR = ${parseFloat(eorConfig.exchange_rate).toFixed(4)} USD
                    <span className="mx-2">·</span>
                    1 USD = {(1 / parseFloat(eorConfig.exchange_rate)).toFixed(2)} NPR
                  </p>
                )}
                {eorConfig.updated_at && (
                  <p className="text-xs text-text-secondary mb-4">
                    Last updated: {new Date(eorConfig.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
                <button
                  onClick={() => { setRateInput(eorConfig.exchange_rate ? String(parseFloat(eorConfig.exchange_rate)) : ''); setRateEditing(true) }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                >
                  <span className="material-icons text-[16px]">edit</span>
                  Update Rate
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">New Exchange Rate (NPR → USD)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={rateInput}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, '')
                    if ((v.match(/\./g) || []).length <= 1) setRateInput(v)
                  }}
                  autoFocus
                  placeholder="e.g. 0.0075"
                  className="w-full px-3 py-2 rounded-lg border border-border-main text-sm mb-1 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                {rateInput && !isNaN(parseFloat(rateInput)) && parseFloat(rateInput) > 0 && (
                  <p className="text-xs text-text-secondary mb-3">
                    1 USD = {(1 / parseFloat(rateInput)).toFixed(2)} NPR
                  </p>
                )}
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={handleRateSave}
                    disabled={rateSaving || !rateInput || isNaN(parseFloat(rateInput)) || parseFloat(rateInput) < 0.001 || parseFloat(rateInput) > 0.05}
                    className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    {rateSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setRateEditing(false)}
                    className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-amber-600 mt-3 flex items-start gap-1">
                  <span className="material-icons text-[14px] mt-0.5">info</span>
                  Changes apply to the next invoice generation only. Existing invoices are not affected.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending Onboardings Table */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Pending Onboardings</h2>
            <p className="text-text-secondary text-sm mt-0.5">Members waiting to complete invitation acceptance or onboarding</p>
          </div>
          {counts.staleInvitations > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
              <span className="material-icons text-amber-600 text-[16px]">warning</span>
              <span className="text-xs font-medium text-amber-700">{counts.staleInvitations} stale invitation{counts.staleInvitations !== 1 ? 's' : ''} (&gt;7 days)</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-border-main overflow-hidden">
          {onboardingsLoading ? (
            <div className="p-8 text-center">
              <LoadingSpinner />
            </div>
          ) : pendingOnboardings.length === 0 ? (
            <div className="p-8 text-center">
              <span className="material-icons text-4xl text-text-secondary opacity-40 mb-2 block">check_circle</span>
              <p className="text-text-secondary text-sm">No pending onboardings</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-main bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">Member</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">Organization</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">Invited</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">Days Waiting</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-secondary">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingOnboardings.map((member) => (
                  <tr key={member.id} className="border-b border-border-main last:border-b-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-text-primary">{member.name || '-'}</p>
                        <p className="text-xs text-text-secondary">{member.email || '-'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{member.organizationName || '-'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={member.status} />
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(member.invitedAt)}</td>
                    <td className="px-4 py-3">
                      {member.daysSinceInvited != null ? (
                        <span className={`font-medium ${member.daysSinceInvited > 7 ? 'text-amber-600' : 'text-text-secondary'}`}>
                          {member.daysSinceInvited} day{member.daysSinceInvited !== 1 ? 's' : ''}
                          {member.daysSinceInvited > 7 && (
                            <span className="material-icons text-amber-500 text-[14px] ml-1 align-middle">warning</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-text-secondary">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/members/${member.id}`)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        View
                        <span className="material-icons text-[14px]">arrow_forward</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
