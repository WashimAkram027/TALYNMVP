import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useNavigate, useParams } from 'react-router-dom'
import LoadingSpinner from '../components/common/LoadingSpinner'
import StatusBadge from '../components/common/StatusBadge'
import payrollService from '../services/payrollService'

// ============================================================
// PAYROLL LIST VIEW
// ============================================================
function PayrollList() {
  const navigate = useNavigate()
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const result = await payrollService.listRuns()
        setRuns(Array.isArray(result) ? result : result?.data || [])
      } catch (err) {
        console.error('Error fetching payroll runs:', err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Payroll Management</h1>
        <p className="text-text-secondary text-sm mt-1">Review, edit, and approve payroll runs</p>
      </div>

      {runs.length === 0 ? (
        <div className="bg-white rounded-xl border border-border-main p-12 text-center">
          <span className="material-icons text-[48px] text-text-secondary/40 mb-3 block">payments</span>
          <p className="text-text-secondary">No payroll runs found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border-main overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-border-main">
                <th className="text-left p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Organization</th>
                <th className="text-left p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Pay Period</th>
                <th className="text-left p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Pay Date</th>
                <th className="text-right p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Amount</th>
                <th className="text-center p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                <th className="text-center p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr
                  key={run.id}
                  className="border-b border-border-main hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/payroll/${run.id}`)}
                >
                  <td className="p-4">
                    <span className="font-medium text-text-primary">{run.organization?.name || 'Unknown Org'}</span>
                  </td>
                  <td className="p-4 text-sm text-text-secondary">
                    {run.pay_period_start && new Date(run.pay_period_start).toLocaleDateString()} –{' '}
                    {run.pay_period_end && new Date(run.pay_period_end).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-sm text-text-secondary">
                    {run.pay_date && new Date(run.pay_date).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right font-medium text-text-primary">
                    {run.currency || 'NPR'} {Number(run.total_amount || 0).toLocaleString()}
                  </td>
                  <td className="p-4 text-center"><StatusBadge status={run.status} /></td>
                  <td className="p-4 text-center">
                    <span className="material-icons text-text-secondary/60 text-[20px]">chevron_right</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ============================================================
// PAYROLL DETAIL VIEW (with tabs)
// ============================================================
function PayrollDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [run, setRun] = useState(null)
  const [items, setItems] = useState([])
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectNotes, setRejectNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('employer')
  const [resolveItem, setResolveItem] = useState(null)
  const [resolveNotes, setResolveNotes] = useState('')
  const [regenerateLoading, setRegenerateLoading] = useState(false)

  const fetchDetail = useCallback(async () => {
    try {
      const data = await payrollService.getRunDetail(id)
      setRun(data.run || data)
      setItems(data.items || data.payroll_items || [])
      setInvoice(data.invoice || null)
    } catch (err) {
      console.error('Error fetching payroll detail:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchDetail() }, [fetchDetail])

  const handleConfirm = async () => {
    setActionLoading(true)
    try {
      await payrollService.approve(id)
      toast.success('Payroll run approved and confirmed!')
      setTimeout(() => navigate('/payroll'), 1500)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve')
    } finally {
      setActionLoading(false)
      setConfirmOpen(false)
    }
  }

  const handleReject = async () => {
    setActionLoading(true)
    try {
      await payrollService.reject(id, rejectNotes)
      toast.success('Payroll run rejected')
      setTimeout(() => navigate('/payroll'), 1500)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject')
    } finally {
      setActionLoading(false)
      setRejectOpen(false)
    }
  }

  const handleSaveItem = async (itemId, updates) => {
    try {
      await payrollService.updateItem(itemId, updates)
      toast.success('Employee earnings updated')
      setEditItem(null)
      fetchDetail()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update')
    }
  }

  const handleSaveEmployerEdit = async (itemId, updates) => {
    try {
      await payrollService.employerEditItem(itemId, updates)
      toast.success('Employer payroll item updated')
      setEditItem(null)
      fetchDetail()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update')
    }
  }

  const handleResolveReview = async () => {
    if (!resolveItem) return
    setActionLoading(true)
    try {
      await payrollService.resolveReview(resolveItem.id, resolveNotes)
      toast.success('Review resolved')
      setResolveItem(null)
      setResolveNotes('')
      fetchDetail()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resolve review')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRegenerate = async () => {
    setRegenerateLoading(true)
    try {
      await payrollService.regenerate(id)
      toast.success('Payroll regenerated with latest data')
      fetchDetail()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to regenerate payroll')
    } finally {
      setRegenerateLoading(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (!run) return <div className="p-8 text-center text-text-secondary">Payroll run not found</div>

  const isPending = run.status === 'pending_approval' || run.status === 'draft'
  const reviewItems = items.filter(i => i.review_status)
  const pendingReviews = reviewItems.filter(i => i.review_status === 'pending')

  // Build USD lookup from invoice line_items
  const lineItemMap = {}
  if (invoice?.line_items) {
    for (const li of invoice.line_items) {
      lineItemMap[li.member_id] = li
    }
  }
  const exchangeRate = parseFloat(invoice?.exchange_rate) || 0

  const tabs = [
    { key: 'employer', label: 'Employer View', icon: 'storefront' },
    { key: 'payout', label: 'Payout View', icon: 'account_balance' },
    { key: 'reviews', label: 'Review Requests', icon: 'rate_review', count: pendingReviews.length },
  ]

  return (
    <div>
      {/* Back button + Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/payroll')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <span className="material-icons text-text-secondary">arrow_back</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Payroll Run Detail</h1>
          <p className="text-text-secondary text-sm mt-0.5">{run.organization?.name || 'Organization'}</p>
        </div>
        <div className="ml-auto"><StatusBadge status={run.status} /></div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Organization', value: run.organization?.name || '—' },
          { label: 'Pay Period', value: `${new Date(run.pay_period_start).toLocaleDateString()} – ${new Date(run.pay_period_end).toLocaleDateString()}` },
          { label: 'Pay Date', value: new Date(run.pay_date).toLocaleDateString() },
          { label: 'Total (NPR)', value: `NPR ${Number(run.total_amount || 0).toLocaleString()}` },
          { label: 'Total (USD)', value: invoice ? `$${((invoice.total_amount_cents || 0) / 100).toFixed(2)}` : '—' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-border-main p-4">
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mb-1">{item.label}</p>
            <p className="text-sm font-bold text-text-primary">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="material-icons text-[18px]">{tab.icon}</span>
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'employer' && (
        <EmployerViewTab items={items} lineItemMap={lineItemMap} exchangeRate={exchangeRate} invoice={invoice} isPending={isPending} onEditItem={setEditItem} />
      )}

      {activeTab === 'payout' && (
        <PayoutViewTab items={items} isPending={isPending} onEditItem={setEditItem} />
      )}

      {activeTab === 'reviews' && (
        <ReviewsTab reviewItems={reviewItems} onResolve={(item) => { setResolveItem(item); setResolveNotes('') }} />
      )}

      {/* Action Buttons — context-sensitive per tab */}
      {isPending && activeTab === 'employer' && (
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setRejectOpen(true)}
            className="px-6 py-2.5 bg-red-50 text-red-700 font-medium rounded-lg hover:bg-red-100 border border-red-200 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={handleRegenerate}
            disabled={regenerateLoading}
            className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <span className="material-icons text-[18px]">refresh</span>
            {regenerateLoading ? 'Regenerating...' : 'Regenerate Payroll'}
          </button>
        </div>
      )}
      {isPending && activeTab === 'payout' && (
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setRejectOpen(true)}
            className="px-6 py-2.5 bg-red-50 text-red-700 font-medium rounded-lg hover:bg-red-100 border border-red-200 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            className="px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <span className="material-icons text-[18px]">check_circle</span>
            Confirm & Run
          </button>
        </div>
      )}

      {/* Modals */}
      {editItem && activeTab === 'employer' && <EmployerEditModal item={editItem} invoice={invoice} onClose={() => setEditItem(null)} onSave={handleSaveEmployerEdit} />}
      {editItem && activeTab === 'payout' && <EditEmployeeModal item={editItem} onClose={() => setEditItem(null)} onSave={handleSaveItem} />}
      {confirmOpen && <ConfirmDialog run={run} items={items} loading={actionLoading} onConfirm={handleConfirm} onClose={() => setConfirmOpen(false)} />}
      {rejectOpen && <RejectDialog notes={rejectNotes} setNotes={setRejectNotes} loading={actionLoading} onReject={handleReject} onClose={() => setRejectOpen(false)} />}
      {resolveItem && <ResolveReviewModal item={resolveItem} notes={resolveNotes} setNotes={setResolveNotes} loading={actionLoading} onResolve={handleResolveReview} onClose={() => setResolveItem(null)} />}
    </div>
  )
}

// ============================================================
// TAB: EMPLOYER VIEW (USD, compact, mirrors employer Payroll.jsx)
// ============================================================
function EmployerViewTab({ items, lineItemMap, exchangeRate, invoice, isPending, onEditItem }) {
  if (!invoice) {
    return (
      <div className="bg-white rounded-xl border border-border-main p-8 text-center">
        <span className="material-icons text-[36px] text-text-secondary/40 mb-2 block">receipt_long</span>
        <p className="text-text-secondary">No linked invoice — employer view is unavailable for this payroll run.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-border-main overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-border-main">
            <th className="text-left p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Employee</th>
            <th className="text-right p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Gross (USD)</th>
            <th className="text-center p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Days</th>
            <th className="text-center p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Leave</th>
            <th className="text-right p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Deductions</th>
            <th className="text-right p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Net Pay</th>
            <th className="text-center p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Review</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const member = item.member || {}
            const profile = member.profile || {}
            const name = profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '—'
            const li = lineItemMap[item.member_id] || {}

            const grossUsd = li.cost_usd_cents ? (li.cost_usd_cents / 100).toFixed(2) : ((item.base_salary || 0) * exchangeRate).toFixed(2)
            const deductionUsd = ((item.deductions || 0) * exchangeRate).toFixed(2)
            const netUsd = ((item.net_amount || 0) * exchangeRate).toFixed(2)

            return (
              <tr key={item.id} className={`border-b border-border-main hover:bg-gray-50/50 transition-colors ${isPending ? 'cursor-pointer' : ''}`} onClick={() => isPending && onEditItem(item)}>
                <td className="p-4">
                  <p className="text-sm font-medium text-text-primary">{name}</p>
                  {member.job_title && <p className="text-xs text-text-secondary">{member.job_title}</p>}
                </td>
                <td className="p-4 text-right">
                  <p className="text-sm font-medium text-text-primary">${grossUsd}</p>
                  <p className="text-xs text-text-secondary">NPR {Number(item.base_salary || 0).toLocaleString()}</p>
                </td>
                <td className="p-4 text-center text-sm text-text-secondary">
                  {item.payable_days != null ? `${item.payable_days}/${item.calendar_days}` : '—'}
                </td>
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-1">
                    {item.paid_leave_days > 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.paid_leave_days}d paid
                      </span>
                    )}
                    {item.unpaid_leave_days > 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-200">
                        {item.unpaid_leave_days}d unpaid
                      </span>
                    )}
                    {!item.paid_leave_days && !item.unpaid_leave_days && <span className="text-xs text-text-secondary">—</span>}
                  </div>
                </td>
                <td className="p-4 text-right text-sm text-text-secondary">${deductionUsd}</td>
                <td className="p-4 text-right text-sm font-bold text-text-primary">${netUsd}</td>
                <td className="p-4 text-center">
                  {item.review_status === 'pending' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      <span className="material-icons text-[14px]">flag</span>Pending
                    </span>
                  )}
                  {item.review_status === 'in_progress' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      <span className="material-icons text-[14px]">pending</span>In progress
                    </span>
                  )}
                  {item.review_status === 'resolved' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="material-icons text-[14px]">check_circle</span>Resolved
                    </span>
                  )}
                  {!item.review_status && <span className="text-xs text-text-secondary">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================
// TAB: PAYOUT VIEW (NPR, wide table with edit)
// ============================================================
function PayoutViewTab({ items, isPending, onEditItem }) {
  return (
    <div className="bg-white rounded-xl border border-border-main overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1400px]">
          <thead>
            <tr className="bg-gray-50 border-b border-border-main">
              {['Employee Name', 'ID', 'Designation', 'Start Date', 'PAN', 'SSF', 'Bank Acct', 'Bank',
                'Basic Salary', 'Dearness', 'Other Allow.', 'Festival', 'Bonus', 'Leave Enc.', 'Other Payments', 'Total'
              ].map((h) => (
                <th key={h} className="text-left p-3 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const member = item.member || {}
              const profile = member.profile || {}
              const empName = profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '—'

              return (
                <tr
                  key={item.id}
                  className={`border-b border-border-main hover:bg-blue-50/50 transition-colors ${isPending ? 'cursor-pointer' : ''} ${item.review_status === 'pending' ? 'bg-amber-50/30' : ''}`}
                  onClick={() => isPending && onEditItem(item)}
                >
                  <td className="p-3 text-sm font-medium text-text-primary whitespace-nowrap">
                    {empName}
                    {item.review_status === 'pending' && (
                      <span className="ml-2 material-icons text-amber-500 text-[16px] align-middle">flag</span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-text-secondary font-mono">{(member.id || item.member_id || '').slice(0, 8)}</td>
                  <td className="p-3 text-sm text-text-secondary">{member.job_title || '—'}</td>
                  <td className="p-3 text-sm text-text-secondary">{member.start_date ? new Date(member.start_date).toLocaleDateString() : '—'}</td>
                  <td className="p-3 text-sm text-text-secondary">{member.pan_number || '—'}</td>
                  <td className="p-3 text-sm text-text-secondary">{member.ssf_number || '—'}</td>
                  <td className="p-3 text-sm text-text-secondary font-mono">{member.bank_account_number ? `****${member.bank_account_number.slice(-4)}` : '—'}</td>
                  <td className="p-3 text-sm text-text-secondary">{member.bank_name || '—'}</td>
                  <td className="p-3 text-sm text-right font-medium">{Number(item.base_salary || 0).toLocaleString()}</td>
                  <td className="p-3 text-sm text-right">{Number(item.dearness_allowance || 0).toLocaleString()}</td>
                  <td className="p-3 text-sm text-right">{Number(item.other_allowance || 0).toLocaleString()}</td>
                  <td className="p-3 text-sm text-right">{Number(item.festival_allowance || 0).toLocaleString()}</td>
                  <td className="p-3 text-sm text-right">{Number(item.bonuses || 0).toLocaleString()}</td>
                  <td className="p-3 text-sm text-right">{Number(item.leave_encashments || 0).toLocaleString()}</td>
                  <td className="p-3 text-sm text-right">{Number(item.other_payments || 0).toLocaleString()}</td>
                  <td className="p-3 text-sm text-right font-bold text-emerald-700">{Number(item.net_amount || 0).toLocaleString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================
// TAB: REVIEW REQUESTS
// ============================================================
function ReviewsTab({ reviewItems, onResolve }) {
  if (reviewItems.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-border-main p-8 text-center">
        <span className="material-icons text-[36px] text-text-secondary/40 mb-2 block">check_circle</span>
        <p className="text-text-secondary">No review requests for this payroll run.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {reviewItems.map(item => {
        const member = item.member || {}
        const profile = member.profile || {}
        const name = profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '—'
        const notes = item.review_notes || []
        const latestRequest = notes.find(n => n.type) || {}
        const resolution = notes.find(n => n.resolved_by)
        const issueLabels = { incorrect_salary: 'Incorrect Salary', wrong_leave: 'Wrong Leave Count', missing_allowance: 'Missing Allowance', ssf_error: 'SSF Error', other: 'Other' }

        return (
          <div key={item.id} className={`bg-white rounded-xl border p-4 ${item.review_status === 'pending' ? 'border-amber-200' : 'border-border-main'}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-text-primary">{name}</span>
                  {item.review_status === 'pending' && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Pending</span>
                  )}
                  {item.review_status === 'resolved' && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">Resolved</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-text-secondary mb-2">
                  <span className="flex items-center gap-1">
                    <span className="material-icons text-[16px]">category</span>
                    {issueLabels[latestRequest.type] || latestRequest.type || '—'}
                  </span>
                  {latestRequest.submitted_by_name && (
                    <span className="flex items-center gap-1">
                      <span className="material-icons text-[16px]">person</span>
                      {latestRequest.submitted_by_name}
                    </span>
                  )}
                  {latestRequest.submitted_at && (
                    <span className="flex items-center gap-1">
                      <span className="material-icons text-[16px]">schedule</span>
                      {new Date(latestRequest.submitted_at).toLocaleString()}
                    </span>
                  )}
                </div>
                {latestRequest.description && (
                  <p className="text-sm text-text-primary bg-gray-50 rounded-lg p-3 mb-2">{latestRequest.description}</p>
                )}
                {resolution && (
                  <div className="text-sm bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                    <p className="font-medium text-emerald-800 mb-0.5">Resolution:</p>
                    <p className="text-emerald-700">{resolution.resolution_notes}</p>
                    <p className="text-xs text-emerald-600 mt-1">{new Date(resolution.resolved_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
              {item.review_status === 'pending' && (
                <button
                  onClick={() => onResolve(item)}
                  className="ml-4 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
                >
                  Resolve
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// RESOLVE REVIEW MODAL
// ============================================================
function ResolveReviewModal({ item, notes, setNotes, loading, onResolve, onClose }) {
  const member = item.member || {}
  const profile = member.profile || {}
  const name = profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '—'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-text-primary mb-2">Resolve Review Request</h3>
        <p className="text-sm text-text-secondary mb-4">Resolving review for <strong>{name}</strong></p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Resolution notes (what was changed or why no change was needed)..."
          className="w-full p-3 border border-border-main rounded-lg text-sm resize-none h-24 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 rounded-lg">Cancel</button>
          <button
            onClick={onResolve}
            disabled={loading || !notes.trim()}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Resolving...' : 'Resolve'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// CONFIRM DIALOG
// ============================================================
function ConfirmDialog({ run, items, loading, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-text-primary mb-4">Confirm Payroll Run</h3>
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Organization</span>
            <span className="font-medium">{run.organization?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Pay Period</span>
            <span className="font-medium">{new Date(run.pay_period_start).toLocaleDateString()} – {new Date(run.pay_period_end).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Total</span>
            <span className="font-bold text-emerald-700">{run.currency || 'NPR'} {Number(run.total_amount || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Employees</span>
            <span className="font-medium">{items.length}</span>
          </div>
        </div>
        <div className="max-h-48 overflow-y-auto border border-border-main rounded-lg mb-4">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b"><th className="text-left p-2">Employee</th><th className="text-right p-2">Amount</th></tr></thead>
            <tbody>
              {items.map((item) => {
                const profile = item.member?.profile || {}
                const name = profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '—'
                return (
                  <tr key={item.id} className="border-b border-border-main/50">
                    <td className="p-2 text-text-primary">{name}</td>
                    <td className="p-2 text-right font-medium">{Number(item.net_amount || 0).toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
          <p className="text-sm text-amber-800 flex items-center gap-2">
            <span className="material-icons text-[18px]">warning</span>
            This will initiate payment processing. This action cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="px-6 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {loading ? 'Processing...' : 'Confirm & Run Payroll'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// REJECT DIALOG
// ============================================================
function RejectDialog({ notes, setNotes, loading, onReject, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-text-primary mb-2">Reject Payroll Run</h3>
        <p className="text-sm text-text-secondary mb-4">Provide notes for rejecting this payroll run.</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Rejection notes..."
          className="w-full p-3 border border-border-main rounded-lg text-sm resize-none h-24 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={onReject} disabled={loading} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
            {loading ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Shared input field (must be outside modal to keep stable reference)
// ============================================================
function ModalInputField({ label, value, onChange, readOnly, suffix }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          inputMode={readOnly ? undefined : 'numeric'}
          value={readOnly ? value : (value ?? '')}
          onChange={onChange ? (e) => {
            const raw = e.target.value.replace(/[^0-9]/g, '')
            onChange(raw === '' ? '' : raw)
          } : undefined}
          readOnly={readOnly}
          className={`w-full px-3 py-2 rounded-lg border text-sm ${
            readOnly
              ? 'bg-gray-50 text-text-secondary border-gray-200 cursor-default'
              : 'bg-white border-border-main focus:ring-2 focus:ring-primary/20 focus:border-primary'
          }`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">{suffix}</span>}
      </div>
    </div>
  )
}

// ============================================================
// EMPLOYER EDIT MODAL (salary, days, live cost preview)
// ============================================================
function EmployerEditModal({ item, invoice, onClose, onSave }) {
  const member = item.member || {}
  const profile = member.profile || {}
  const empName = profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '—'

  // Config from invoice snapshot
  const config = invoice?.config_snapshot || {}
  const employerSsfRate = parseFloat(config.employer_ssf_rate) || 0.20
  const employeeSsfRate = parseFloat(config.employee_ssf_rate) || 0.11
  const exchangeRate = parseFloat(config.exchange_rate) || parseFloat(invoice?.exchange_rate) || 0
  const platformFeePerEmployee = config.platform_fee_amount || 0
  const periodsPerYear = config.periods_per_year || 12
  const calendarDays = item.calendar_days || 30

  const [form, setForm] = useState({
    salary_amount: Number(member.salary_amount ?? (item.gross_salary * periodsPerYear) ?? 0),
    payable_days: Number(item.payable_days ?? calendarDays),
    paid_leave_days: Number(item.paid_leave_days ?? 0),
    unpaid_leave_days: Number(item.unpaid_leave_days ?? 0),
  })
  const [resolveReview, setResolveReview] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleChange = (field, value) => {
    const num = value === '' ? 0 : Number(value)
    if (isNaN(num)) return
    setForm(prev => {
      const next = { ...prev, [field]: num }
      // When unpaid leave changes, recalculate payable days
      if (field === 'unpaid_leave_days') {
        next.payable_days = Math.max(0, calendarDays - num)
      }
      // When payable days changes, recalculate unpaid leave days
      if (field === 'payable_days') {
        next.unpaid_leave_days = Math.max(0, calendarDays - num)
      }
      return next
    })
  }

  // Live recalculation (same formula as backend regeneratePayrollRun)
  const fullMonthlyGrossLocal = Math.round((form.salary_amount / periodsPerYear) * 100)
  const deductionDays = Math.max(0, calendarDays - form.payable_days)

  let monthlyGrossLocal = fullMonthlyGrossLocal
  if (deductionDays > 0 && calendarDays > 0) {
    const dailyRate = Math.round(fullMonthlyGrossLocal / calendarDays)
    monthlyGrossLocal = dailyRate * form.payable_days
  }

  const employerSsfLocal = Math.round(monthlyGrossLocal * employerSsfRate)
  const employeeSsfLocal = Math.round(monthlyGrossLocal * employeeSsfRate)
  const totalCostLocal = monthlyGrossLocal + employerSsfLocal
  const totalCostNpr = totalCostLocal / 100
  const totalCostUsd = totalCostNpr * exchangeRate
  const costUsdCents = Math.round(totalCostUsd * 100)
  const invoiceLineTotal = costUsdCents + platformFeePerEmployee

  const monthlyGrossNpr = fullMonthlyGrossLocal / 100
  const proratedGrossNpr = monthlyGrossLocal / 100
  const monthlyGrossUsd = monthlyGrossNpr * exchangeRate

  // Review context
  const hasPendingReview = item.review_status === 'pending'
  const reviewEntry = hasPendingReview && item.review_notes?.length > 0
    ? item.review_notes.find(n => n.issue_type || n.description) || item.review_notes[0]
    : null

  const issueLabels = {
    incorrect_salary: 'Incorrect Salary',
    wrong_leave: 'Wrong Leave Count',
    missing_bonus: 'Missing Bonus/Allowance',
    wrong_deduction: 'Wrong Deduction',
    other: 'Other'
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(item.id, { ...form, resolve_review: resolveReview })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-main flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Edit Employer View</h2>
            <p className="text-sm text-text-secondary">{empName} {member.job_title ? `— ${member.job_title}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <span className="material-icons text-text-secondary">close</span>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Section 1: Salary & Rates */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <span className="material-icons text-[16px] text-primary">payments</span>
              Salary & Rates
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <ModalInputField
                label="Annual Salary (NPR)"
                value={form.salary_amount}
                onChange={(v) => handleChange('salary_amount', v)}
              />
              <ModalInputField label="Monthly Gross (NPR)" value={monthlyGrossNpr.toLocaleString()} readOnly />
              <ModalInputField label="Exchange Rate (NPR→USD)" value={exchangeRate} readOnly />
              <ModalInputField label="Monthly Gross (USD)" value={`$${monthlyGrossUsd.toFixed(2)}`} readOnly />
            </div>
          </div>

          {/* Section 2: Day Count */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <span className="material-icons text-[16px] text-primary">calendar_month</span>
              Day Count
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <ModalInputField label="Calendar Days" value={calendarDays} readOnly />
              <ModalInputField
                label="Payable Days"
                value={form.payable_days}
                onChange={(v) => handleChange('payable_days', v)}
              />
              <ModalInputField label="Deduction Days" value={deductionDays} readOnly />
              <ModalInputField
                label="Paid Leave Days"
                value={form.paid_leave_days}
                onChange={(v) => handleChange('paid_leave_days', v)}
              />
              <ModalInputField
                label="Unpaid Leave Days"
                value={form.unpaid_leave_days}
                onChange={(v) => handleChange('unpaid_leave_days', v)}
              />
            </div>
          </div>

          {/* Section 3: Cost Breakdown Preview */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <span className="material-icons text-[16px] text-primary">calculate</span>
              Cost Breakdown Preview
            </h3>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              {deductionDays > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Prorated Gross (NPR)</span>
                  <span className="font-medium">{proratedGrossNpr.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Employer SSF ({(employerSsfRate * 100).toFixed(0)}%)</span>
                <span className="font-medium">NPR {(employerSsfLocal / 100).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Employee SSF ({(employeeSsfRate * 100).toFixed(0)}%)</span>
                <span className="font-medium">NPR {(employeeSsfLocal / 100).toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-200 my-1" />
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Total Cost (NPR)</span>
                <span className="font-semibold">{totalCostNpr.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Total Cost (USD)</span>
                <span className="font-semibold">${totalCostUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Platform Fee</span>
                <span className="font-medium">${(platformFeePerEmployee / 100).toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 my-1" />
              <div className="flex justify-between text-sm">
                <span className="text-text-primary font-semibold">Invoice Line Total</span>
                <span className="text-emerald-600 font-bold text-base">${(invoiceLineTotal / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Review Context */}
          {hasPendingReview && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <span className="material-icons text-[16px] text-amber-500">rate_review</span>
                Pending Review Request
              </h3>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                {reviewEntry && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                        {issueLabels[reviewEntry.issue_type] || reviewEntry.issue_type || 'Review'}
                      </span>
                      {reviewEntry.submitted_at && (
                        <span className="text-xs text-text-secondary">
                          {new Date(reviewEntry.submitted_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {reviewEntry.description && (
                      <p className="text-sm text-amber-900">{reviewEntry.description}</p>
                    )}
                  </>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resolveReview}
                    onChange={(e) => setResolveReview(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                  />
                  <span className="text-sm font-medium text-amber-800">Resolve this review when saving</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-main flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || form.salary_amount <= 0 || form.payable_days > calendarDays || form.payable_days < 0}
            className="px-6 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// EDIT EMPLOYEE MODAL
// ============================================================
function EditEmployeeModal({ item, onClose, onSave }) {
  const member = item.member || item.organization_member || {}
  const profile = member.profile || {}
  const empName = profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '—'

  const [form, setForm] = useState({
    base_salary: Number(item.base_salary || 0),
    dearness_allowance: Number(item.dearness_allowance || 0),
    other_allowance: Number(item.other_allowance || 0),
    festival_allowance: Number(item.festival_allowance || 0),
    bonuses: Number(item.bonuses || 0),
    leave_encashments: Number(item.leave_encashments || 0),
    other_payments: Number(item.other_payments || 0),
    deductions: Number(item.deductions || 0),
    tax_amount: Number(item.tax_amount || 0),
  })
  const [saving, setSaving] = useState(false)

  const totalEarnings = form.base_salary + form.dearness_allowance + form.other_allowance + form.festival_allowance
    + form.bonuses + form.leave_encashments + form.other_payments - form.deductions - form.tax_amount

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: Number(value) || 0 }))
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave(item.id, form)
    setSaving(false)
  }

  const readOnlyFields = [
    { label: 'Employee Name', value: empName },
    { label: 'Employee ID', value: (member.id || item.member_id || '').slice(0, 12) },
    { label: 'Organisation', value: member.organization?.name || '—' },
    { label: 'Start Date', value: member.start_date ? new Date(member.start_date).toLocaleDateString() : '—' },
    { label: 'Designation', value: member.job_title || '—' },
    { label: 'PAN', value: member.pan_number || '—' },
    { label: 'SSF', value: member.ssf_number || '—' },
    { label: 'Bank Account', value: member.bank_account_number || '—' },
    { label: 'Bank Name', value: member.bank_name || '—' },
  ]

  const earningsFields = [
    { key: 'base_salary', label: 'Basic Salary' },
    { key: 'dearness_allowance', label: 'Dearness Allowance' },
    { key: 'other_allowance', label: 'Other Allowance' },
    { key: 'festival_allowance', label: 'Festival Allowance' },
    { key: 'bonuses', label: 'Bonus' },
    { key: 'leave_encashments', label: 'Leave Encashments' },
    { key: 'other_payments', label: 'Other Payments' },
  ]

  const deductionFields = [
    { key: 'deductions', label: 'Deductions' },
    { key: 'tax_amount', label: 'Tax Amount' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-border-main">
          <h3 className="text-lg font-bold text-text-primary">Edit Employee Payroll</h3>
          <p className="text-sm text-text-secondary mt-0.5">{empName}</p>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Employee Information</h4>
            <div className="grid grid-cols-3 gap-3">
              {readOnlyFields.map((f) => (
                <div key={f.label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-text-secondary mb-0.5">{f.label}</p>
                  <p className="text-sm font-medium text-text-primary">{f.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Earnings</h4>
            <div className="grid grid-cols-2 gap-3">
              {earningsFields.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-text-secondary mb-1">{f.label}</label>
                  <input
                    type="number"
                    value={form[f.key]}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    className="w-full p-2.5 border border-border-main rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Deductions</h4>
            <div className="grid grid-cols-2 gap-3">
              {deductionFields.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-text-secondary mb-1">{f.label}</label>
                  <input
                    type="number"
                    value={form[f.key]}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    className="w-full p-2.5 border border-border-main rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex justify-between items-center">
            <span className="font-semibold text-emerald-800">Net Pay</span>
            <span className="text-2xl font-bold text-emerald-700">{totalEarnings.toLocaleString()}</span>
          </div>
        </div>

        <div className="p-6 border-t border-border-main flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-gray-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// ROUTE WRAPPER
// ============================================================
export default function Payroll() {
  const { id } = useParams()
  return id ? <PayrollDetail /> : <PayrollList />
}
