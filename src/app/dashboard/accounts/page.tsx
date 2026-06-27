'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Download, ChevronDown, ChevronUp, Plus, X, ArrowDownCircle, ArrowUpCircle, Calendar, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

const inputCls = 'w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

const CHECKLIST_ITEMS = [
  'All invoices for this month raised',
  'All advance payments confirmed',
  'All balance payments collected for dispatched units',
  'GST reconciliation done',
  'Tally export done',
]

function isThisMonth(date: string) {
  const d = new Date(date)
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

function isLastDaysOfMonth() {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return now.getDate() >= lastDay - 2
}

function daysSince(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
}

// Modal for logging incoming payment
function PaymentModal({ deal, onClose, onSave }: { deal: any, onClose: () => void, onSave: () => void }) {
  const [form, setForm] = useState({
    type: 'advance', amount: '', date: new Date().toISOString().slice(0, 10),
    scheduledDate: '', paymentMode: '', utrNumber: '', bankAccount: '', notes: '',
    received: 'true',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.amount || !form.date) return
    setSaving(true)
    await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealId: deal.id,
        type: form.type,
        amount: parseFloat(form.amount),
        date: form.received === 'true' ? form.date : (form.scheduledDate || form.date),
        scheduledDate: form.scheduledDate || undefined,
        paymentMode: form.paymentMode || undefined,
        utrNumber: form.utrNumber || undefined,
        bankAccount: form.bankAccount || undefined,
        notes: form.notes || undefined,
        received: form.received === 'true',
      })
    })
    setSaving(false)
    onSave()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">Log Payment</h2>
            <p className="text-xs text-gray-500">{deal.customerCompany} · {deal.dealNumber}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.received} onChange={e => setForm(f => ({ ...f, received: e.target.value }))} className={inputCls}>
                <option value="true">Received</option>
                <option value="false">Scheduled / Expected</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inputCls}>
                <option value="advance">Advance</option>
                <option value="balance">Balance</option>
                <option value="milestone">Milestone</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount (₹)</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>{form.received === 'true' ? 'Date Received' : 'Scheduled Date'}</label>
              <input type="date" value={form.received === 'true' ? form.date : form.scheduledDate} onChange={e => setForm(f => form.received === 'true' ? ({ ...f, date: e.target.value }) : ({ ...f, scheduledDate: e.target.value }))} className={inputCls} />
            </div>
          </div>
          {form.received === 'false' && (
            <p className="text-xs text-blue-600 bg-blue-50 rounded p-2">Reminders will be auto-sent to accounts head 1 and 2 days before this date.</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Payment Mode</label>
              <select value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))} className={inputCls}>
                <option value="">Select mode</option>
                <option value="NEFT">NEFT</option>
                <option value="RTGS">RTGS</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>UTR / Reference No.</label>
              <input type="text" value={form.utrNumber} onChange={e => setForm(f => ({ ...f, utrNumber: e.target.value }))} className={inputCls} placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Bank Account (received in)</label>
            <input type="text" value={form.bankAccount} onChange={e => setForm(f => ({ ...f, bankAccount: e.target.value }))} className={inputCls} placeholder="e.g. HDFC Current - 1234" />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} />
          </div>
        </div>
        <div className="flex gap-2 justify-end p-5 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.amount}>
            {saving ? 'Saving...' : form.received === 'true' ? 'Log Payment' : 'Schedule Payment'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Modal for logging outgoing expense
function ExpenseModal({ onClose, onSave, deals }: { onClose: () => void, onSave: () => void, deals: any[] }) {
  const [form, setForm] = useState({
    category: 'freight', amount: '', date: new Date().toISOString().slice(0, 10),
    vendorName: '', paymentMode: '', utrNumber: '', dealId: '', notes: '',
    paid: 'true', dueDate: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.amount) return
    setSaving(true)
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        amount: parseFloat(form.amount),
        dealId: form.dealId || undefined,
        paid: form.paid === 'true',
        date: form.paid === 'true' ? form.date : (form.dueDate || form.date),
        dueDate: form.dueDate || undefined,
      })
    })
    setSaving(false)
    onSave()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Log Outgoing Payment</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.paid} onChange={e => setForm(f => ({ ...f, paid: e.target.value }))} className={inputCls}>
                <option value="true">Already Paid</option>
                <option value="false">Scheduled / To Pay</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                <option value="freight">Freight</option>
                <option value="installation">Installation</option>
                <option value="raw_material">Raw Material</option>
                <option value="vendor">Vendor Payment</option>
                <option value="salary">Salary</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount (₹)</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>{form.paid === 'true' ? 'Date Paid' : 'Due Date'}</label>
              <input type="date" value={form.paid === 'true' ? form.date : form.dueDate} onChange={e => setForm(f => form.paid === 'true' ? ({ ...f, date: e.target.value }) : ({ ...f, dueDate: e.target.value }))} className={inputCls} />
            </div>
          </div>
          {form.paid === 'false' && (
            <p className="text-xs text-blue-600 bg-blue-50 rounded p-2">Reminders auto-sent to accounts head 1 and 2 days before the due date.</p>
          )}
          <div>
            <label className={labelCls}>Vendor / Paid To</label>
            <input type="text" value={form.vendorName} onChange={e => setForm(f => ({ ...f, vendorName: e.target.value }))} className={inputCls} placeholder="Vendor name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Payment Mode</label>
              <select value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))} className={inputCls}>
                <option value="">Select mode</option>
                <option value="NEFT">NEFT</option>
                <option value="RTGS">RTGS</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>UTR / Reference No.</label>
              <input type="text" value={form.utrNumber} onChange={e => setForm(f => ({ ...f, utrNumber: e.target.value }))} className={inputCls} placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Link to Deal (optional)</label>
            <select value={form.dealId} onChange={e => setForm(f => ({ ...f, dealId: e.target.value }))} className={inputCls}>
              <option value="">No deal</option>
              {deals.map(d => <option key={d.id} value={d.id}>{d.customerCompany} — {d.dealNumber}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} />
          </div>
        </div>
        <div className="flex gap-2 justify-end p-5 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.amount}>
            {saving ? 'Saving...' : 'Log Expense'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AccountsPage() {
  const { data: session } = useSession()
  const [deals, setDeals] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [checklistOpen, setChecklistOpen] = useState(isLastDaysOfMonth())
  const [checklist, setChecklist] = useState<boolean[]>(CHECKLIST_ITEMS.map(() => false))
  const [paymentModal, setPaymentModal] = useState<any>(null)
  const [expenseModal, setExpenseModal] = useState(false)
  const [showAllPayments, setShowAllPayments] = useState(false)

  const user = session?.user as any
  const role = user?.role
  const allowed = ['director', 'accounts'].includes(role)

  const loadData = async () => {
    const [dealsRes, expensesRes] = await Promise.all([
      fetch('/api/deals'),
      fetch('/api/expenses'),
    ])
    const dealsData = await dealsRes.json()
    const expensesData = await expensesRes.json()
    setDeals(Array.isArray(dealsData) ? dealsData : [])
    setExpenses(Array.isArray(expensesData) ? expensesData : [])
    setLoading(false)
  }

  useEffect(() => { if (allowed) loadData() }, [allowed])

  const exportTally = () => {
    const now = new Date()
    window.open(`/api/export/tally?month=${now.getMonth() + 1}&year=${now.getFullYear()}`, '_blank')
  }

  const markExpensePaid = async (id: string) => {
    await fetch('/api/expenses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, paid: true, date: new Date().toISOString() })
    })
    loadData()
  }

  if (!allowed) return <div className="text-center py-12 text-gray-400">You do not have access to this page.</div>
  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Gather all payments from deals
  const allPayments: any[] = []
  deals.forEach(d => { if (d.payments) d.payments.forEach((p: any) => allPayments.push({ ...p, deal: d })) })

  // Pipeline summary
  const totalPipeline = deals.filter(d => d.stage !== 'closed_lost').reduce((s, d) => s + (d.quotedAmount || 0), 0)
  const totalReceived = allPayments.filter(p => p.received !== false).reduce((s, p) => s + p.amount, 0)
  const totalPending = Math.max(0, totalPipeline - totalReceived)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const overdueAdvances = deals.filter(d => d.advanceDeadline && !d.advanceReceived && new Date(d.advanceDeadline) < today).length

  // Month stats
  const thisMonthPayments = allPayments.filter(p => p.received !== false && isThisMonth(p.date))
  const collectedThisMonth = thisMonthPayments.reduce((s, p) => s + p.amount, 0)
  const thisMonthExpenses = expenses.filter(e => isThisMonth(e.date))
  const spentThisMonth = thisMonthExpenses.reduce((s, e) => s + e.amount, 0)

  // Sections
  const advancePending = deals.filter(d =>
    ['pi_sent', 'approval_pending', 'production', 'dispatch_ready', 'dispatched'].includes(d.stage) && !d.advanceReceived
  )
  const balancePending = deals.filter(d => ['dispatched', 'installation', 'completed'].includes(d.stage) && !d.balancePaid)

  const displayedPayments = showAllPayments ? allPayments.filter(p => p.received !== false) : thisMonthPayments

  // ===== Money Due Schedule (combined receivables + payables, by date) =====
  type DueItem = { id: string; date: Date; dir: 'in' | 'out'; amount: number; label: string; sub: string; dealId?: string; deal?: any; expenseId?: string }
  const dueItems: DueItem[] = []

  // Receivable: advance pending with deadline
  deals.forEach(d => {
    if (!d.advanceReceived && d.advanceDeadline && ['pi_sent', 'approval_pending', 'production', 'dispatch_ready', 'dispatched'].includes(d.stage)) {
      dueItems.push({ id: `adv-${d.id}`, date: new Date(d.advanceDeadline), dir: 'in', amount: d.advanceAmount || (d.quotedAmount ? d.quotedAmount * 0.5 : 0), label: d.customerCompany, sub: `Advance · ${d.dealNumber}`, dealId: d.id, deal: d })
    }
    // Receivable: balance pending with deadline
    if (!d.balancePaid && d.balanceDeadline && ['dispatched', 'installation', 'completed'].includes(d.stage)) {
      dueItems.push({ id: `bal-${d.id}`, date: new Date(d.balanceDeadline), dir: 'in', amount: d.balanceAmount || 0, label: d.customerCompany, sub: `Balance · ${d.dealNumber}`, dealId: d.id, deal: d })
    }
  })
  // Receivable: scheduled incoming payments
  allPayments.filter(p => p.received === false && p.scheduledDate).forEach(p => {
    dueItems.push({ id: `pay-${p.id}`, date: new Date(p.scheduledDate), dir: 'in', amount: p.amount, label: p.deal?.customerCompany || 'Unknown', sub: `${p.type} · ${p.deal?.dealNumber || ''}`, dealId: p.deal?.id, deal: p.deal })
  })
  // Payable: scheduled expenses
  expenses.filter(e => e.paid === false && e.dueDate).forEach(e => {
    dueItems.push({ id: `exp-${e.id}`, date: new Date(e.dueDate), dir: 'out', amount: e.amount, label: e.vendorName || e.category, sub: `${e.category.replace('_', ' ')}`, expenseId: e.id })
  })

  dueItems.sort((a, b) => a.date.getTime() - b.date.getTime())

  const in7 = new Date(today); in7.setDate(in7.getDate() + 7)
  const in30 = new Date(today); in30.setDate(in30.getDate() + 30)
  const buckets = {
    overdue: dueItems.filter(i => i.date < today),
    week: dueItems.filter(i => i.date >= today && i.date < in7),
    month: dueItems.filter(i => i.date >= in7 && i.date < in30),
    later: dueItems.filter(i => i.date >= in30),
  }
  const sumBy = (items: DueItem[], dir: 'in' | 'out') => items.filter(i => i.dir === dir).reduce((s, i) => s + i.amount, 0)
  const totalToReceive = sumBy(dueItems, 'in')
  const totalToPay = sumBy(dueItems, 'out')

  const BUCKET_META: { key: keyof typeof buckets; label: string; tone: string }[] = [
    { key: 'overdue', label: 'Overdue', tone: 'text-red-600' },
    { key: 'week', label: 'Next 7 days', tone: 'text-amber-600' },
    { key: 'month', label: 'Next 30 days', tone: 'text-blue-600' },
    { key: 'later', label: 'Later', tone: 'text-gray-500' },
  ]

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-500 mt-1">Financial overview and payment tracking</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setExpenseModal(true)} variant="outline">
            <ArrowUpCircle className="w-4 h-4 mr-2 text-red-500" /> Log Expense
          </Button>
          <Button onClick={exportTally} variant="outline">
            <Download className="w-4 h-4 mr-2" /> Export Tally
          </Button>
        </div>
      </div>

      {/* Pipeline summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500">Total Pipeline</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalPipeline)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500">Total Received</p>
          <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(totalReceived)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500">Total Pending</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(totalPending)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500">Overdue Advances</p>
          <p className={`text-xl font-bold mt-1 ${overdueAdvances > 0 ? 'text-red-600' : 'text-gray-400'}`}>{overdueAdvances}</p>
        </CardContent></Card>
      </div>

      {/* Month stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500">This Month — In</p>
          <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(collectedThisMonth)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500">This Month — Out</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(spentThisMonth)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500">Net This Month</p>
          <p className={`text-xl font-bold mt-1 ${collectedThisMonth - spentThisMonth >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {formatCurrency(collectedThisMonth - spentThisMonth)}
          </p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500">Total Expenses</p>
          <p className="text-xl font-bold text-gray-700 mt-1">{formatCurrency(totalExpenses)}</p>
        </CardContent></Card>
      </div>

      {/* Money Due Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" /> Money Due Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Receive / Pay / Net summary */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-lg border border-green-100 bg-green-50 p-3">
              <p className="text-xs text-green-700 font-medium">To Receive</p>
              <p className="text-lg font-bold text-green-700 mt-0.5">{formatCurrency(totalToReceive)}</p>
            </div>
            <div className="rounded-lg border border-red-100 bg-red-50 p-3">
              <p className="text-xs text-red-700 font-medium">To Pay</p>
              <p className="text-lg font-bold text-red-700 mt-0.5">{formatCurrency(totalToPay)}</p>
            </div>
            <div className={`rounded-lg border p-3 ${totalToReceive - totalToPay >= 0 ? 'border-blue-100 bg-blue-50' : 'border-amber-100 bg-amber-50'}`}>
              <p className={`text-xs font-medium ${totalToReceive - totalToPay >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>Net Expected</p>
              <p className={`text-lg font-bold mt-0.5 ${totalToReceive - totalToPay >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>{formatCurrency(totalToReceive - totalToPay)}</p>
            </div>
          </div>

          {dueItems.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No upcoming dues. Set advance/balance deadlines on deals or schedule payments to see them here.</p>
          ) : (
            <div className="space-y-5">
              {BUCKET_META.map(({ key, label, tone }) => {
                const items = buckets[key]
                if (items.length === 0) return null
                const bIn = sumBy(items, 'in')
                const bOut = sumBy(items, 'out')
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <p className={`text-xs font-semibold uppercase tracking-wide ${tone}`}>{label}</p>
                      <p className="text-xs text-gray-500">
                        {bIn > 0 && <span className="text-green-600 font-medium">+{formatCurrency(bIn)}</span>}
                        {bIn > 0 && bOut > 0 && ' · '}
                        {bOut > 0 && <span className="text-red-600 font-medium">−{formatCurrency(bOut)}</span>}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {items.map(item => {
                        const daysUntil = Math.ceil((item.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                        const when = daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil}d`
                        return (
                          <div key={item.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${item.dir === 'in' ? 'border-gray-200 bg-white' : 'border-red-100 bg-red-50/40'}`}>
                            {item.dir === 'in'
                              ? <ArrowDownCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                              : <ArrowUpCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              {item.dealId
                                ? <Link href={`/dashboard/deals/${item.dealId}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block">{item.label}</Link>
                                : <p className="text-sm font-medium text-gray-900 truncate">{item.label}</p>}
                              <p className="text-xs text-gray-500 truncate">{item.sub}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`text-sm font-semibold ${item.dir === 'in' ? 'text-green-700' : 'text-red-700'}`}>
                                {item.dir === 'in' ? '+' : '−'}{formatCurrency(item.amount)}
                              </p>
                              <p className={`text-xs ${daysUntil < 0 ? 'text-red-500' : 'text-gray-400'}`}>{formatDate(item.date.toISOString())} · {when}</p>
                            </div>
                            {item.dir === 'in' && item.deal && (
                              <Button size="sm" variant="outline" onClick={() => setPaymentModal(item.deal)}>
                                <Plus className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {item.dir === 'out' && item.expenseId && (
                              <Button size="sm" variant="outline" onClick={() => markExpensePaid(item.expenseId!)}>
                                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Paid
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advance Pending */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowDownCircle className="w-4 h-4 text-amber-500" /> Advance Pending
            <span className="ml-auto text-xs font-normal bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{advancePending.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {advancePending.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No pending advances</p>
          ) : (
            <div className="space-y-2">
              {advancePending.map(deal => {
                const isOverdue = deal.advanceDeadline && new Date(deal.advanceDeadline) < today
                return (
                  <div key={deal.id} className={`flex items-center justify-between p-3 rounded-lg border ${isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
                    <div>
                      <Link href={`/dashboard/deals/${deal.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">{deal.customerCompany}</Link>
                      <p className="text-xs text-gray-500">{deal.dealNumber} · {deal.paymentTerms || 'No payment terms set'}</p>
                      {deal.advanceDeadline && (
                        <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-600 font-medium' : 'text-amber-600'}`}>
                          Due: {formatDate(deal.advanceDeadline)} {isOverdue ? `(${daysSince(deal.advanceDeadline)}d overdue)` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">{deal.advanceAmount ? formatCurrency(deal.advanceAmount) : '—'}</span>
                      <Button size="sm" variant="outline" onClick={() => setPaymentModal(deal)}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Log
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Balance Pending */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowDownCircle className="w-4 h-4 text-red-500" /> Balance Pending
            <span className="ml-auto text-xs font-normal bg-red-50 text-red-700 px-2 py-0.5 rounded-full">{balancePending.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {balancePending.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No pending balances</p>
          ) : (
            <div className="space-y-2">
              {balancePending.map(deal => (
                <div key={deal.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white">
                  <div>
                    <Link href={`/dashboard/deals/${deal.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">{deal.customerCompany}</Link>
                    <p className="text-xs text-gray-500">{deal.dealNumber} · Dispatched {daysSince(deal.updatedAt)}d ago</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-red-700">{deal.balanceAmount ? formatCurrency(deal.balanceAmount) : '—'}</span>
                    <Button size="sm" variant="outline" onClick={() => setPaymentModal({ ...deal, _defaultType: 'balance' })}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Log
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incoming Payments log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowDownCircle className="w-4 h-4 text-green-500" /> Incoming Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button size="sm" variant={!showAllPayments ? 'default' : 'outline'} onClick={() => setShowAllPayments(false)}>This Month</Button>
            <Button size="sm" variant={showAllPayments ? 'default' : 'outline'} onClick={() => setShowAllPayments(true)}>All Time</Button>
          </div>
          {displayedPayments.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No payments recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 text-xs">
                    <th className="pb-2 text-left font-medium">Date</th>
                    <th className="pb-2 text-left font-medium">Company</th>
                    <th className="pb-2 text-left font-medium">Deal#</th>
                    <th className="pb-2 text-left font-medium">Type</th>
                    <th className="pb-2 text-left font-medium">Amount</th>
                    <th className="pb-2 text-left font-medium">Mode</th>
                    <th className="pb-2 text-left font-medium">UTR</th>
                    <th className="pb-2 text-left font-medium">Bank</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayedPayments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="py-2.5 text-gray-500 text-xs">{formatDate(p.date)}</td>
                      <td className="py-2.5">
                        <p className="font-medium text-gray-900">{p.deal?.customerCompany}</p>
                      </td>
                      <td className="py-2.5 font-mono text-xs text-gray-400">{p.deal?.dealNumber}</td>
                      <td className="py-2.5">
                        <span className={`capitalize text-xs px-2 py-0.5 rounded-full ${p.type === 'advance' ? 'bg-blue-50 text-blue-700' : p.type === 'balance' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{p.type}</span>
                      </td>
                      <td className="py-2.5 font-medium text-green-700">{formatCurrency(p.amount)}</td>
                      <td className="py-2.5 text-gray-500 text-xs">{p.paymentMode || '—'}</td>
                      <td className="py-2.5 text-gray-400 text-xs">{p.utrNumber || '—'}</td>
                      <td className="py-2.5 text-gray-400 text-xs">{p.bankAccount || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200">
                    <td colSpan={4} className="pt-2 text-xs font-semibold text-gray-600">Total</td>
                    <td className="pt-2 font-bold text-green-700">{formatCurrency(displayedPayments.reduce((s: number, p: any) => s + p.amount, 0))}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outgoing Expenses log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-red-500" /> Outgoing Payments / Expenses
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => setExpenseModal(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No expenses logged</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 text-xs">
                    <th className="pb-2 text-left font-medium">Date</th>
                    <th className="pb-2 text-left font-medium">Category</th>
                    <th className="pb-2 text-left font-medium">Vendor</th>
                    <th className="pb-2 text-left font-medium">Amount</th>
                    <th className="pb-2 text-left font-medium">Mode</th>
                    <th className="pb-2 text-left font-medium">UTR</th>
                    <th className="pb-2 text-left font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.map((e: any) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="py-2.5 text-gray-500 text-xs">{formatDate(e.date)}</td>
                      <td className="py-2.5"><span className="capitalize text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{e.category.replace('_', ' ')}</span></td>
                      <td className="py-2.5 text-gray-700">{e.vendorName || '—'}</td>
                      <td className="py-2.5 font-medium text-red-700">{formatCurrency(e.amount)}</td>
                      <td className="py-2.5 text-gray-500 text-xs">{e.paymentMode || '—'}</td>
                      <td className="py-2.5 text-gray-400 text-xs">{e.utrNumber || '—'}</td>
                      <td className="py-2.5 text-gray-400 text-xs">{e.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200">
                    <td colSpan={3} className="pt-2 text-xs font-semibold text-gray-600">Total</td>
                    <td className="pt-2 font-bold text-red-700">{formatCurrency(totalExpenses)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Checklist */}
      <Card>
        <CardHeader>
          <button onClick={() => setChecklistOpen(o => !o)} className="flex items-center justify-between w-full">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" /> Monthly Closing Checklist
              {isLastDaysOfMonth() && <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Month-end</span>}
            </CardTitle>
            {checklistOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
        </CardHeader>
        {checklistOpen && (
          <CardContent>
            <div className="space-y-2">
              {CHECKLIST_ITEMS.map((item, i) => (
                <label key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={checklist[i]} onChange={e => { const c = [...checklist]; c[i] = e.target.checked; setChecklist(c) }} className="w-4 h-4 rounded text-blue-600" />
                  <span className={`text-sm ${checklist[i] ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item}</span>
                </label>
              ))}
              <div className="mt-2 text-xs text-gray-400">{checklist.filter(Boolean).length}/{CHECKLIST_ITEMS.length} completed</div>
            </div>
          </CardContent>
        )}
      </Card>

      {paymentModal && <PaymentModal deal={paymentModal} onClose={() => setPaymentModal(null)} onSave={loadData} />}
      {expenseModal && <ExpenseModal deals={deals} onClose={() => setExpenseModal(false)} onSave={loadData} />}
    </div>
  )
}
