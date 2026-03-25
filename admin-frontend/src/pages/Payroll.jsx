import { useState, useEffect, useCallback } from 'react'
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
// PAYROLL DETAIL VIEW (employee-level)
// ============================================================
function PayrollDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [run, setRun] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectNotes, setRejectNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const fetchDetail = useCallback(async () => {
    try {
      const data = await payrollService.getRunDetail(id)
      setRun(data.run || data)
      setItems(data.items || data.payroll_items || [])
    } catch (err) {
      console.error('Error fetching payroll detail:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchDetail() }, [fetchDetail])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleConfirm = async () => {
    setActionLoading(true)
    try {
      await payrollService.approve(id)
      showToast('Payroll run approved and confirmed!')
      setTimeout(() => navigate('/payroll'), 1500)
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to approve', 'error')
    } finally {
      setActionLoading(false)
      setConfirmOpen(false)
    }
  }

  const handleReject = async () => {
    setActionLoading(true)
    try {
      await payrollService.reject(id, rejectNotes)
      showToast('Payroll run rejected')
      setTimeout(() => navigate('/payroll'), 1500)
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to reject', 'error')
    } finally {
      setActionLoading(false)
      setRejectOpen(false)
    }
  }

  const handleSaveItem = async (itemId, updates) => {
    try {
      await payrollService.updateItem(itemId, updates)
      showToast('Employee earnings updated')
      setEditItem(null)
      fetchDetail()
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update', 'error')
    }
  }

  if (loading) return <LoadingSpinner />
  if (!run) return <div className="p-8 text-center text-text-secondary">Payroll run not found</div>

  const isPending = run.status === 'pending_approval' || run.status === 'draft'

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
          { label: 'Total Amount', value: `${run.currency || 'NPR'} ${Number(run.total_amount || 0).toLocaleString()}` },
          { label: 'Employees', value: items.length },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-border-main p-4">
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mb-1">{item.label}</p>
            <p className="text-sm font-bold text-text-primary">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Employee Table (wide, scrollable) */}
      <div className="bg-white rounded-xl border border-border-main overflow-hidden mb-6">
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
                const member = item.member || item.organization_member || {}
                const profile = member.profile || {}
                const empName = profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '—'

                return (
                  <tr
                    key={item.id}
                    className={`border-b border-border-main hover:bg-blue-50/50 transition-colors ${isPending ? 'cursor-pointer' : ''}`}
                    onClick={() => isPending && setEditItem(item)}
                  >
                    <td className="p-3 text-sm font-medium text-text-primary whitespace-nowrap">{empName}</td>
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

      {/* Action Buttons */}
      {isPending && (
        <div className="flex justify-end gap-3">
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

      {/* ============== EDIT EMPLOYEE MODAL ============== */}
      {editItem && <EditEmployeeModal item={editItem} onClose={() => setEditItem(null)} onSave={handleSaveItem} />}

      {/* ============== CONFIRM DIALOG ============== */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirmOpen(false)}>
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

            {/* Employee breakdown */}
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

            {/* Warning */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <p className="text-sm text-amber-800 flex items-center gap-2">
                <span className="material-icons text-[18px]">warning</span>
                This will initiate payment processing. This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmOpen(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-gray-100 rounded-lg">Cancel</button>
              <button
                onClick={handleConfirm}
                disabled={actionLoading}
                className="px-6 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Confirm & Run Payroll'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============== REJECT DIALOG ============== */}
      {rejectOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setRejectOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-2">Reject Payroll Run</h3>
            <p className="text-sm text-text-secondary mb-4">Provide notes for rejecting this payroll run.</p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Rejection notes..."
              className="w-full p-3 border border-border-main rounded-lg text-sm resize-none h-24 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setRejectOpen(false)} className="px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleReject} disabled={actionLoading} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
                {actionLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}
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
          {/* Read-only employee info */}
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

          {/* Editable earnings */}
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

          {/* Deductions */}
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

          {/* Total */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex justify-between items-center">
            <span className="font-semibold text-emerald-800">Net Pay</span>
            <span className="text-2xl font-bold text-emerald-700">{totalEarnings.toLocaleString()}</span>
          </div>
        </div>

        {/* Modal Footer */}
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
