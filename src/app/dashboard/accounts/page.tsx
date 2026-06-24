'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Download, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Deal {
  id: string
  dealNumber: string
  customerName: string
  customerCompany: string
  stage: string
  quotedAmount?: number
  advanceAmount?: number
  advanceReceived: boolean
  advanceDate?: string
  advanceDeadline?: string
  balanceAmount?: number
  balancePaid: boolean
  balanceDate?: string
  updatedAt: string
  createdAt: string
  payments: any[]
  paymentTerms?: string
}

function daysSince(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
}

function isThisMonth(date: string) {
  const d = new Date(date)
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

const isLastDaysOfMonth = () => {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return now.getDate() >= lastDay - 2
}

const CHECKLIST_ITEMS = [
  'All invoices for this month raised',
  'All advance payments confirmed',
  'All balance payments collected for dispatched units',
  'GST reconciliation done',
  'Tally export done',
]

export default function AccountsPage() {
  const { data: session } = useSession()
  const [deals, setDeals] = useState<Deal[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [checklistOpen, setChecklistOpen] = useState(isLastDaysOfMonth())
  const [checklist, setChecklist] = useState<boolean[]>(CHECKLIST_ITEMS.map(() => false))
  const [markingId, setMarkingId] = useState<string | null>(null)

  const user = session?.user as any
  const role = user?.role

  const allowed = ['director', 'accounts'].includes(role)

  useEffect(() => {
    if (!allowed) return
    fetch('/api/deals')
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : []
        setDeals(arr)
        // Gather all payments from deals
        const allPayments: any[] = []
        arr.forEach((d: Deal) => {
          if (d.payments) d.payments.forEach((p: any) => allPayments.push({ ...p, deal: d }))
        })
        setPayments(allPayments)
        setLoading(false)
      })
  }, [allowed])

  const markAdvance = async (dealId: string) => {
    setMarkingId(dealId)
    await fetch(`/api/deals/${dealId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ advanceReceived: true, advanceDate: new Date().toISOString() })
    })
    const res = await fetch('/api/deals')
    const data = await res.json()
    setDeals(Array.isArray(data) ? data : [])
    setMarkingId(null)
  }

  const markBalance = async (dealId: string) => {
    setMarkingId(dealId)
    await fetch(`/api/deals/${dealId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ balancePaid: true, balanceDate: new Date().toISOString() })
    })
    const res = await fetch('/api/deals')
    const data = await res.json()
    setDeals(Array.isArray(data) ? data : [])
    setMarkingId(null)
  }

  const exportTally = () => {
    const now = new Date()
    window.open(`/api/export/tally?month=${now.getMonth() + 1}&year=${now.getFullYear()}`, '_blank')
  }

  if (!allowed) return (
    <div className="text-center py-12 text-gray-400">You do not have access to this page.</div>
  )

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>

  // Stats
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const invoicedThisMonth = deals
    .filter(d => ['pi_sent', 'approval_pending', 'production', 'dispatch_ready', 'dispatched', 'feedback_pending', 'closed_won'].includes(d.stage) &&
      new Date(d.updatedAt) >= monthStart)
    .reduce((sum, d) => sum + (d.quotedAmount || 0), 0)

  const collectedThisMonth = payments
    .filter(p => isThisMonth(p.date))
    .reduce((sum, p) => sum + p.amount, 0)

  const outstandingBalance = deals
    .filter(d => d.stage === 'dispatched' && !d.balancePaid)
    .reduce((sum, d) => sum + (d.balanceAmount || 0), 0)

  const pendingAdvances = deals.filter(d =>
    ['pi_sent', 'approval_pending', 'production', 'dispatch_ready', 'dispatched'].includes(d.stage) &&
    !d.advanceReceived
  ).length

  // Pipeline summary
  const totalPipelineValue = deals
    .filter(d => !['closed_lost'].includes(d.stage))
    .reduce((sum, d) => sum + (d.quotedAmount || 0), 0)
  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0)
  const totalPending = totalPipelineValue - totalReceived
  const overdueAdvances = deals.filter(d =>
    d.advanceDeadline && !d.advanceReceived && new Date(d.advanceDeadline) < now
  ).length

  // Sections
  const advancePending = deals.filter(d =>
    ['pi_sent', 'approval_pending', 'production', 'dispatch_ready', 'dispatched'].includes(d.stage) &&
    !d.advanceReceived
  )

  const balancePending = deals.filter(d =>
    d.stage === 'dispatched' && !d.balancePaid
  )

  const thisMonthPayments = payments.filter(p => isThisMonth(p.date))

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-500 mt-1">Financial overview and payment tracking</p>
        </div>
        <Button onClick={exportTally} variant="outline">
          <Download className="w-4 h-4 mr-2" /> Export for Tally
        </Button>
      </div>

      {/* Pipeline summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Pipeline</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalPipelineValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Received</p>
            <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(totalReceived)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Pending</p>
            <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(Math.max(0, totalPending))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Overdue Advances</p>
            <p className={`text-xl font-bold mt-1 ${overdueAdvances > 0 ? 'text-red-600' : 'text-gray-400'}`}>{overdueAdvances}</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Invoiced This Month</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(invoicedThisMonth)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Collected This Month</p>
            <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(collectedThisMonth)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Outstanding Balance</p>
            <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(outstandingBalance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Pending Advances</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{pendingAdvances}</p>
          </CardContent>
        </Card>
      </div>

      {/* Advance Pending */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Advance Pending
            <span className="ml-auto text-xs font-normal text-gray-400 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{advancePending.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {advancePending.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No pending advances</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="pb-2 text-left font-medium">Deal#</th>
                    <th className="pb-2 text-left font-medium">Customer</th>
                    <th className="pb-2 text-left font-medium">PI Date</th>
                    <th className="pb-2 text-left font-medium">Amount</th>
                    <th className="pb-2 text-left font-medium">Days Pending</th>
                    <th className="pb-2 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {advancePending.map(deal => (
                    <tr key={deal.id} className="hover:bg-gray-50">
                      <td className="py-3 font-mono text-xs text-gray-500">{deal.dealNumber}</td>
                      <td className="py-3">
                        <p className="font-medium text-gray-900">{deal.customerName}</p>
                        <p className="text-xs text-gray-400">{deal.customerCompany}</p>
                      </td>
                      <td className="py-3 text-gray-500">{formatDate(deal.updatedAt)}</td>
                      <td className="py-3 font-medium">{deal.advanceAmount ? formatCurrency(deal.advanceAmount) : deal.quotedAmount ? formatCurrency(deal.quotedAmount * 0.3) : '—'}</td>
                      <td className="py-3">
                        <span className={`text-sm ${daysSince(deal.updatedAt) > 14 ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                          {daysSince(deal.updatedAt)}d
                        </span>
                      </td>
                      <td className="py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={markingId === deal.id}
                          onClick={() => markAdvance(deal.id)}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Mark Received
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Balance Pending */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Balance Pending
            <span className="ml-auto text-xs font-normal bg-red-50 text-red-700 px-2 py-0.5 rounded-full">{balancePending.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {balancePending.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No pending balances</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="pb-2 text-left font-medium">Deal#</th>
                    <th className="pb-2 text-left font-medium">Customer</th>
                    <th className="pb-2 text-left font-medium">Dispatch Date</th>
                    <th className="pb-2 text-left font-medium">Balance Amount</th>
                    <th className="pb-2 text-left font-medium">Days Outstanding</th>
                    <th className="pb-2 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {balancePending.map(deal => (
                    <tr key={deal.id} className="hover:bg-gray-50">
                      <td className="py-3 font-mono text-xs text-gray-500">{deal.dealNumber}</td>
                      <td className="py-3">
                        <p className="font-medium text-gray-900">{deal.customerName}</p>
                        <p className="text-xs text-gray-400">{deal.customerCompany}</p>
                      </td>
                      <td className="py-3 text-gray-500">{formatDate(deal.updatedAt)}</td>
                      <td className="py-3 font-medium text-red-700">{deal.balanceAmount ? formatCurrency(deal.balanceAmount) : '—'}</td>
                      <td className="py-3">
                        <span className={`text-sm ${daysSince(deal.updatedAt) > 30 ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                          {daysSince(deal.updatedAt)}d
                        </span>
                      </td>
                      <td className="py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={markingId === deal.id}
                          onClick={() => markBalance(deal.id)}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Mark Received
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* This Month's Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">This Month&apos;s Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {thisMonthPayments.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No payments recorded this month</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="pb-2 text-left font-medium">Date</th>
                    <th className="pb-2 text-left font-medium">Deal</th>
                    <th className="pb-2 text-left font-medium">Company</th>
                    <th className="pb-2 text-left font-medium">Type</th>
                    <th className="pb-2 text-left font-medium">Amount</th>
                    <th className="pb-2 text-left font-medium">Mode</th>
                    <th className="pb-2 text-left font-medium">UTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {thisMonthPayments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="py-3 text-gray-500">{formatDate(p.date)}</td>
                      <td className="py-3 font-mono text-xs text-gray-500">{p.deal?.dealNumber}</td>
                      <td className="py-3">
                        <p className="font-medium text-gray-900">{p.deal?.customerCompany}</p>
                        <p className="text-xs text-gray-400">{p.deal?.customerName}</p>
                      </td>
                      <td className="py-3">
                        <span className={`capitalize text-xs px-2 py-0.5 rounded-full ${
                          p.type === 'advance' ? 'bg-blue-50 text-blue-700' :
                          p.type === 'balance' ? 'bg-green-50 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>{p.type}</span>
                      </td>
                      <td className="py-3 font-medium text-green-700">{formatCurrency(p.amount)}</td>
                      <td className="py-3 text-gray-500 text-xs">{p.paymentMode || '—'}</td>
                      <td className="py-3 text-gray-400 text-xs">{p.utrNumber || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Closing Checklist */}
      <Card>
        <CardHeader>
          <button
            onClick={() => setChecklistOpen(o => !o)}
            className="flex items-center justify-between w-full"
          >
            <CardTitle className="text-base flex items-center gap-2">
              Monthly Closing Checklist
              {isLastDaysOfMonth() && (
                <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Month-end</span>
              )}
            </CardTitle>
            {checklistOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
        </CardHeader>
        {checklistOpen && (
          <CardContent>
            <div className="space-y-2">
              {CHECKLIST_ITEMS.map((item, i) => (
                <label key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist[i]}
                    onChange={e => {
                      const copy = [...checklist]
                      copy[i] = e.target.checked
                      setChecklist(copy)
                    }}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className={`text-sm ${checklist[i] ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item}</span>
                </label>
              ))}
              <div className="mt-2 text-xs text-gray-400">
                {checklist.filter(Boolean).length}/{CHECKLIST_ITEMS.length} completed
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
