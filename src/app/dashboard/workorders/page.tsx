'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardList, Check, Clock, Factory } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  in_production: 'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-600',
}
const STATUS_LABEL: Record<string, string> = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  in_production: 'In Production',
  completed: 'Completed',
}

function snapshotModel(wo: any): string {
  if (wo.deal?.modelNumber) return wo.deal.modelNumber
  try { return JSON.parse(wo.specSnapshot || '{}').modelNumber || '—' } catch { return '—' }
}

export default function WorkOrdersPage() {
  const { data: session } = useSession()
  const [wos, setWos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const user = session?.user as any
  const role = user?.role
  const allowed = ['director', 'sales_director', 'vp', 'accounts', 'manufacturing'].includes(role)

  const load = () => fetch('/api/workorders').then(r => r.json()).then(d => { setWos(Array.isArray(d) ? d : []); setLoading(false) })
  useEffect(() => { if (allowed) load() }, [allowed])

  const act = async (id: string, action: string) => {
    setActing(id + action)
    await fetch('/api/workorders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    setActing(null)
    load()
  }

  if (!allowed) return <div className="text-center py-12 text-gray-400">You do not have access to this page.</div>
  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>

  const isMfg = role === 'manufacturing'

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-blue-600" /> Work Orders
        </h1>
        <p className="text-gray-500 mt-1">{isMfg ? 'Approved work orders for manufacturing' : 'Work order approvals and tracking'}</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{wos.length} work order{wos.length === 1 ? '' : 's'}</CardTitle></CardHeader>
        <CardContent>
          {wos.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No work orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 text-xs">
                    <th className="pb-2 text-left font-medium">WO Number</th>
                    {!isMfg && <th className="pb-2 text-left font-medium">Deal Ref</th>}
                    <th className="pb-2 text-left font-medium">Model</th>
                    <th className="pb-2 text-left font-medium">Status</th>
                    {!isMfg && <th className="pb-2 text-left font-medium">Sign-offs</th>}
                    <th className="pb-2 text-left font-medium">Deadline</th>
                    <th className="pb-2 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {wos.map((wo: any) => {
                    const fullyApproved = wo.approvedByAccounts && wo.vettedByDirector
                    return (
                      <tr key={wo.id} className="hover:bg-gray-50">
                        <td className="py-3 font-mono text-xs font-semibold text-gray-900">
                          <Link href={`/dashboard/workorders/${wo.id}`} className="hover:text-blue-600">{wo.woNumber}</Link>
                        </td>
                        {!isMfg && (
                          <td className="py-3 font-mono text-xs text-gray-500">{wo.deal?.workCode || wo.deal?.serialNumber || '—'}</td>
                        )}
                        <td className="py-3 text-xs">{snapshotModel(wo)}</td>
                        <td className="py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[wo.status] || 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABEL[wo.status] || wo.status}
                          </span>
                        </td>
                        {!isMfg && (
                          <td className="py-3">
                            <div className="flex flex-col gap-1">
                              <span className={`text-xs flex items-center gap-1 ${wo.approvedByAccounts ? 'text-green-600' : 'text-amber-600'}`}>
                                {wo.approvedByAccounts ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />} Accounts {wo.approvedByAccounts ? '✓' : 'pending'}
                              </span>
                              <span className={`text-xs flex items-center gap-1 ${wo.vettedByDirector ? 'text-green-600' : 'text-amber-600'}`}>
                                {wo.vettedByDirector ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />} Director {wo.vettedByDirector ? '✓' : 'pending'}
                              </span>
                            </div>
                          </td>
                        )}
                        <td className="py-3 text-xs text-gray-500">{wo.deadline ? formatDate(wo.deadline) : '—'}</td>
                        <td className="py-3">
                          <div className="flex gap-2 flex-wrap">
                            {!wo.approvedByAccounts && ['accounts', 'director'].includes(role) && (
                              <Button size="sm" variant="outline" disabled={acting === wo.id + 'approve_accounts'} onClick={() => act(wo.id, 'approve_accounts')}>
                                Approve as Accounts
                              </Button>
                            )}
                            {!wo.vettedByDirector && ['director', 'sales_director'].includes(role) && (
                              <Button size="sm" variant="outline" disabled={acting === wo.id + 'vet_director'} onClick={() => act(wo.id, 'vet_director')}>
                                Vet as Director
                              </Button>
                            )}
                            {fullyApproved && wo.status === 'approved' && ['director', 'manufacturing', 'accounts'].includes(role) && (
                              <Button size="sm" variant="outline" disabled={acting === wo.id + 'start_production'} onClick={() => act(wo.id, 'start_production')}>
                                <Factory className="w-3 h-3 mr-1" /> Start Production
                              </Button>
                            )}
                            {wo.status === 'in_production' && ['director', 'manufacturing', 'accounts'].includes(role) && (
                              <Button size="sm" variant="outline" disabled={acting === wo.id + 'complete'} onClick={() => act(wo.id, 'complete')}>
                                Complete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
