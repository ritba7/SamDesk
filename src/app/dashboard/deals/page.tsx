'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Flame, Thermometer, Snowflake, User, Calendar, DollarSign } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, getStageColor, getStageLabel, STAGES } from '@/lib/utils'

function HeatBadge({ score }: { score: string }) {
  if (score === 'hot') return <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 rounded-full px-2 py-0.5"><Flame className="w-3 h-3" /> Hot</span>
  if (score === 'warm') return <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 rounded-full px-2 py-0.5"><Thermometer className="w-3 h-3" /> Warm</span>
  return <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full px-2 py-0.5"><Snowflake className="w-3 h-3" /> Cold</span>
}

export default function DealsPage() {
  const { data: session } = useSession()
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [heatFilter, setHeatFilter] = useState('')
  const user = session?.user as any

  useEffect(() => {
    setLoading(true)
    fetch('/api/deals').then(r => r.json()).then(d => { setDeals(Array.isArray(d) ? d : []); setLoading(false) })
  }, [])

  const filtered = deals.filter(d => {
    const matchSearch = !search || d.customerName.toLowerCase().includes(search.toLowerCase()) || d.dealNumber.toLowerCase().includes(search.toLowerCase()) || d.customerCompany.toLowerCase().includes(search.toLowerCase())
    return matchSearch && (!stageFilter || d.stage === stageFilter) && (!heatFilter || d.heatScore === heatFilter)
  })

  const canCreate = ['director', 'vp', 'accounts'].includes(user?.role)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Deals</h1><p className="text-gray-500 mt-1">{filtered.length} deals</p></div>
        {canCreate && <Link href="/dashboard/deals/new"><Button><Plus className="w-4 h-4" />New Deal</Button></Link>}
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search deals..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 h-9 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="h-9 px-3 rounded-lg border border-gray-300 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">All Stages</option>
          {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select value={heatFilter} onChange={e => setHeatFilter(e.target.value)} className="h-9 px-3 rounded-lg border border-gray-300 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">All Heat Scores</option>
          <option value="hot">Hot</option><option value="warm">Warm</option><option value="cold">Cold</option>
        </select>
        {(stageFilter || heatFilter || search) && <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStageFilter(''); setHeatFilter('') }}>Clear</Button>}
      </div>
      {loading ? <div className="text-center py-12 text-gray-400">Loading deals...</div> :
        filtered.length === 0 ? <div className="text-center py-12"><p className="text-gray-400 mb-4">No deals found</p>{canCreate && <Link href="/dashboard/deals/new"><Button><Plus className="w-4 h-4" /> Create first deal</Button></Link>}</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(deal => (
            <Link key={deal.id} href={`/dashboard/deals/${deal.id}`}>
              <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0"><p className="font-semibold text-gray-900 truncate">{deal.customerName}</p><p className="text-xs text-gray-400 mt-0.5">{deal.customerCompany}</p></div>
                    <HeatBadge score={deal.heatScore} />
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-400 font-mono">{deal.dealNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStageColor(deal.stage)}`}>{getStageLabel(deal.stage)}</span>
                  </div>
                  <div className="space-y-1.5 text-sm text-gray-500">
                    {deal.quotedAmount && <div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /><span className="font-medium text-gray-900">{formatCurrency(deal.quotedAmount)}</span></div>}
                    {deal.assignedTo && <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /><span>{deal.assignedTo.name}</span></div>}
                    <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /><span>Updated {formatDate(deal.updatedAt)}</span></div>
                  </div>
                  {deal.tasks && deal.tasks.length > 0 && <div className="mt-3 pt-3 border-t border-gray-100"><span className="text-xs text-amber-600 font-medium">{deal.tasks.length} pending task{deal.tasks.length > 1 ? 's' : ''}</span></div>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
