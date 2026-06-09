'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Factory, Clock, Check, AlertCircle, Activity, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatDate, PRODUCTION_STAGES } from '@/lib/utils'

export default function ProductionPage() {
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDeals = async () => {
    setLoading(true)
    const res = await fetch('/api/deals')
    const data = await res.json()
    setDeals(Array.isArray(data) ? data.filter((d: any) => ['production', 'dispatch_ready'].includes(d.stage)) : [])
    setLoading(false)
  }
  useEffect(() => { fetchDeals() }, [])

  const updateStage = async (stageId: string, status: string) => {
    await fetch(`/api/production/${stageId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    await fetchDeals()
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading production orders...</div>

  const activeCount = deals.filter(d => d.stage === 'production').length
  const readyCount = deals.filter(d => d.stage === 'dispatch_ready').length
  const delayedCount = deals.reduce((sum, d) => sum + d.productionStages.filter((s: any) => s.status === 'delayed').length, 0)

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Production</h1><p className="text-gray-500 mt-1">Active manufacturing orders</p></div>
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">In Production</p><p className="text-2xl font-bold text-blue-600">{activeCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Ready for Dispatch</p><p className="text-2xl font-bold text-green-600">{readyCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Delayed Stages</p><p className="text-2xl font-bold text-red-600">{delayedCount}</p></CardContent></Card>
      </div>
      {deals.length === 0 ? (
        <div className="text-center py-12"><Factory className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No active production orders</p></div>
      ) : (
        <div className="space-y-4">{deals.map(deal => {
          const stages = deal.productionStages
          const completed = stages.filter((s: any) => s.status === 'completed').length
          const inProgress = stages.find((s: any) => s.status === 'in_progress')
          const delayed = stages.filter((s: any) => s.status === 'delayed').length
          const total = stages.length
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0
          return (
            <Card key={deal.id} className={delayed > 0 ? 'border-red-200' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{deal.customerName}</CardTitle>
                      {delayed > 0 && <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><AlertCircle className="w-3 h-3" /> {delayed} delayed</span>}
                      {deal.stage === 'dispatch_ready' && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Ready to Dispatch</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      <span className="font-mono">{deal.dealNumber}</span>
                      {deal.material && <span>· {deal.material.toUpperCase()}</span>}
                      {deal.expectedDispatch && <span>· Expected: {formatDate(deal.expectedDispatch)}</span>}
                    </div>
                  </div>
                  <Link href={`/dashboard/deals/${deal.id}`}><Button variant="outline" size="sm">View Deal <ArrowRight className="w-3 h-3" /></Button></Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1"><Progress value={pct} /></div>
                  <span className="text-sm font-medium text-gray-700">{pct}%</span>
                  <span className="text-xs text-gray-400">{completed}/{total} stages</span>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2">
                  {stages.map((stage: any) => {
                    const meta = PRODUCTION_STAGES.find(p => p.key === stage.stageName)
                    return (
                      <div key={stage.id} className={`flex flex-col items-center p-2 rounded-lg text-center ${ stage.status === 'completed' ? 'bg-green-50 border border-green-200' : stage.status === 'in_progress' ? 'bg-blue-50 border border-blue-200' : stage.status === 'delayed' ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200' }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${ stage.status === 'completed' ? 'bg-green-500' : stage.status === 'in_progress' ? 'bg-blue-500' : stage.status === 'delayed' ? 'bg-red-500' : 'bg-gray-200' }`}>
                          {stage.status === 'completed' ? <Check className="w-3 h-3 text-white" /> : stage.status === 'in_progress' ? <Activity className="w-3 h-3 text-white" /> : stage.status === 'delayed' ? <AlertCircle className="w-3 h-3 text-white" /> : <Clock className="w-3 h-3 text-gray-400" />}
                        </div>
                        <p className="text-xs text-gray-600 leading-tight" style={{ fontSize: '10px' }}>{meta?.label || stage.stageName}</p>
                        <div className="mt-1 flex gap-1">
                          {stage.status === 'pending' && <button onClick={() => updateStage(stage.id, 'in_progress')} className="text-blue-500 hover:text-blue-700 text-xs">▶</button>}
                          {stage.status === 'in_progress' && <button onClick={() => updateStage(stage.id, 'completed')} className="text-green-500 hover:text-green-700 text-xs">✓</button>}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {inProgress && (
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-500">Currently at:</span>
                    <span className="font-medium text-blue-700">{PRODUCTION_STAGES.find(p => p.key === inProgress.stageName)?.label || inProgress.stageName}</span>
                    {inProgress.actualStart && <span className="text-xs text-gray-400">· Started {formatDate(inProgress.actualStart)}</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}</div>
      )}
    </div>
  )
}
