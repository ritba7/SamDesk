'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus, Search, Flame, Thermometer, Snowflake,
  User, Calendar, DollarSign, LayoutGrid, List, ArrowUpDown
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, getStageColor, getStageLabel, STAGES } from '@/lib/utils'

interface Deal {
  id: string
  dealNumber: string
  customerName: string
  customerCompany: string
  stage: string
  heatScore: string
  quotedAmount?: number
  assignedTo?: { name: string; role: string }
  updatedAt: string
  tasks: any[]
}

const ACTIVE_STAGES = [
  'inquiry', 'tds_sent', 'quote_sent', 'follow_up', 'po_received',
  'po_vetted', 'pi_sent', 'approval_pending', 'production',
  'dispatch_ready', 'dispatched', 'feedback_pending'
]

const STAGE_OVERDUE_DAYS: Record<string, number> = {
  inquiry: 7,
  tds_sent: 5,
  quote_sent: 7,
  follow_up: 3,
  po_received: 3,
  approval_pending: 5,
  production: 0,
}

function daysInStage(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24))
}

function isOverdue(deal: Deal): boolean {
  const threshold = STAGE_OVERDUE_DAYS[deal.stage]
  if (threshold === undefined || threshold === 0) return false
  return daysInStage(deal.updatedAt) > threshold
}

function HeatBadge({ score }: { score: string }) {
  if (score === 'hot') return (
    <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 rounded-full px-2 py-0.5">
      <Flame className="w-3 h-3" /> Hot
    </span>
  )
  if (score === 'warm') return (
    <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">
      <Thermometer className="w-3 h-3" /> Warm
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">
      <Snowflake className="w-3 h-3" /> Cold
    </span>
  )
}

function PipelineView({ deals, canCreate }: { deals: Deal[], canCreate: boolean }) {
  const closedCount = deals.filter(d => d.stage === 'closed_won' || d.stage === 'closed_lost').length
  const activeDeals = deals.filter(d => ACTIVE_STAGES.includes(d.stage))

  return (
    <div>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {ACTIVE_STAGES.map(stage => {
            const stageDeals = activeDeals.filter(d => d.stage === stage)
            return (
              <div key={stage} className="w-72 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">{getStageLabel(stage)}</h3>
                  <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{stageDeals.length}</span>
                </div>
                <div className="space-y-3 min-h-24">
                  {stageDeals.map(deal => {
                    const days = daysInStage(deal.updatedAt)
                    const overdue = isOverdue(deal)
                    return (
                      <Link key={deal.id} href={`/dashboard/deals/${deal.id}`}>
                        <Card className={`hover:shadow-md transition-all cursor-pointer ${overdue ? 'border-red-300' : 'hover:border-blue-200'}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm truncate">{deal.customerName}</p>
                                <p className="text-xs text-gray-400 truncate">{deal.customerCompany}</p>
                              </div>
                              <HeatBadge score={deal.heatScore} />
                            </div>
                            <p className="text-xs font-mono text-gray-400 mb-2">{deal.dealNumber}</p>
                            {deal.quotedAmount && (
                              <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                                <DollarSign className="w-3 h-3" />
                                <span className="font-medium">{formatCurrency(deal.quotedAmount)}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Calendar className="w-3 h-3" />
                                <span>{days}d in stage</span>
                              </div>
                              {overdue && (
                                <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">OVERDUE</span>
                              )}
                            </div>
                            {deal.assignedTo && (
                              <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                <User className="w-3 h-3" />
                                <span>{deal.assignedTo.name}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    )
                  })}
                  {stageDeals.length === 0 && (
                    <div className="h-16 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                      <span className="text-xs text-gray-300">No deals</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {closedCount > 0 && (
        <p className="text-sm text-gray-400 mt-4">{closedCount} closed deal{closedCount > 1 ? 's' : ''} not shown</p>
      )}
    </div>
  )
}

type SortKey = 'dealNumber' | 'customerName' | 'stage' | 'heatScore' | 'quotedAmount' | 'updatedAt'

function ListView({ deals }: { deals: Deal[] }) {
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [heatFilter, setHeatFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const filtered = deals.filter(d => {
    const matchSearch = !search ||
      d.customerName.toLowerCase().includes(search.toLowerCase()) ||
      d.dealNumber.toLowerCase().includes(search.toLowerCase()) ||
      d.customerCompany.toLowerCase().includes(search.toLowerCase())
    const matchStage = !stageFilter || d.stage === stageFilter
    const matchHeat = !heatFilter || d.heatScore === heatFilter
    return matchSearch && matchStage && matchHeat
  })

  const sorted = [...filtered].sort((a, b) => {
    let valA: any = a[sortKey]
    let valB: any = b[sortKey]
    if (sortKey === 'quotedAmount') {
      valA = a.quotedAmount || 0
      valB = b.quotedAmount || 0
    }
    if (sortKey === 'updatedAt') {
      valA = new Date(a.updatedAt).getTime()
      valB = new Date(b.updatedAt).getTime()
    }
    if (typeof valA === 'string') valA = valA.toLowerCase()
    if (typeof valB === 'string') valB = valB.toLowerCase()
    if (valA < valB) return sortDir === 'asc' ? -1 : 1
    if (valA > valB) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortBtn = ({ k, label }: { k: SortKey, label: string }) => (
    <button
      onClick={() => toggleSort(k)}
      className="flex items-center gap-1 text-left font-medium text-gray-700 hover:text-blue-600"
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortKey === k ? 'text-blue-600' : 'text-gray-300'}`} />
    </button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search deals..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-9 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-gray-300 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Stages</option>
          {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select
          value={heatFilter}
          onChange={e => setHeatFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-gray-300 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Heat</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
        </select>
        {(stageFilter || heatFilter || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStageFilter(''); setHeatFilter('') }}>
            Clear
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left"><SortBtn k="dealNumber" label="Deal#" /></th>
              <th className="px-4 py-3 text-left"><SortBtn k="customerName" label="Customer" /></th>
              <th className="px-4 py-3 text-left"><SortBtn k="stage" label="Stage" /></th>
              <th className="px-4 py-3 text-left"><SortBtn k="heatScore" label="Heat" /></th>
              <th className="px-4 py-3 text-left"><SortBtn k="quotedAmount" label="Amount" /></th>
              <th className="px-4 py-3 text-left">Assigned To</th>
              <th className="px-4 py-3 text-left">Days in Stage</th>
              <th className="px-4 py-3 text-left"><SortBtn k="updatedAt" label="Last Activity" /></th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-gray-400">No deals found</td></tr>
            ) : sorted.map(deal => {
              const days = daysInStage(deal.updatedAt)
              const overdue = isOverdue(deal)
              return (
                <tr key={deal.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{deal.dealNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{deal.customerName}</p>
                    <p className="text-xs text-gray-400">{deal.customerCompany}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStageColor(deal.stage)}`}>
                      {getStageLabel(deal.stage)}
                    </span>
                  </td>
                  <td className="px-4 py-3"><HeatBadge score={deal.heatScore} /></td>
                  <td className="px-4 py-3 font-medium">{deal.quotedAmount ? formatCurrency(deal.quotedAmount) : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{deal.assignedTo?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700">{days}d</span>
                      {overdue && <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">OVERDUE</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(deal.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/deals/${deal.id}`}>
                      <Button size="sm" variant="ghost">View</Button>
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">{sorted.length} deals</p>
    </div>
  )
}

export default function DealsPage() {
  const { data: session } = useSession()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'pipeline' | 'list'>('pipeline')

  const user = session?.user as any
  const canCreate = ['director', 'vp', 'accounts'].includes(user?.role)

  useEffect(() => {
    fetch('/api/deals').then(r => r.json()).then(data => {
      setDeals(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
          <p className="text-gray-500 mt-1">{deals.length} total deals</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('pipeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${view === 'pipeline' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <LayoutGrid className="w-4 h-4" /> Pipeline
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${view === 'list' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <List className="w-4 h-4" /> List
            </button>
          </div>
          {canCreate && (
            <Link href="/dashboard/deals/new">
              <Button>
                <Plus className="w-4 h-4" /> New Deal
              </Button>
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading deals...</div>
      ) : view === 'pipeline' ? (
        <PipelineView deals={deals} canCreate={canCreate} />
      ) : (
        <ListView deals={deals} />
      )}
    </div>
  )
}
