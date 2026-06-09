import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (user.role !== 'director') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [deals, tasks, payments, productionStages] = await Promise.all([
    prisma.deal.findMany({
      include: {
        quotes: { orderBy: { version: 'desc' }, take: 1 },
        payments: true
      }
    }),
    prisma.task.findMany({ where: { status: 'pending' } }),
    prisma.payment.findMany(),
    prisma.productionStage.findMany({ where: { status: 'delayed' } }),
  ])

  const total = deals.length
  const won = deals.filter(d => d.stage === 'closed_won').length
  const lost = deals.filter(d => d.stage === 'closed_lost').length
  const active = deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)).length
  const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0

  const stageCount: Record<string, number> = {}
  deals.forEach(d => { stageCount[d.stage] = (stageCount[d.stage] || 0) + 1 })

  const lostReasons: Record<string, number> = {}
  deals.filter(d => d.lostReason).forEach(d => {
    lostReasons[d.lostReason!] = (lostReasons[d.lostReason!] || 0) + 1
  })

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0)

  const pipelineValue = deals
    .filter(d => !['closed_won', 'closed_lost'].includes(d.stage))
    .reduce((sum, d) => sum + (d.quotedAmount || 0), 0)

  const heatScores = {
    hot: deals.filter(d => d.heatScore === 'hot').length,
    warm: deals.filter(d => d.heatScore === 'warm').length,
    cold: deals.filter(d => d.heatScore === 'cold').length,
  }

  const onTimeProduction = productionStages.length === 0 ? 100 : Math.max(0, 100 - productionStages.length * 10)
  const paymentHealth = deals.filter(d => d.stage === 'dispatched' && !d.balancePaid).length
  const pipelineHealth = Math.round(
    (conversionRate * 0.4) + (onTimeProduction * 0.4) + (Math.max(0, 100 - paymentHealth * 20) * 0.2)
  )

  // Monthly revenue chart data
  const monthlyRevenue: Record<string, number> = {}
  payments.forEach(p => {
    const key = new Date(p.date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
    monthlyRevenue[key] = (monthlyRevenue[key] || 0) + p.amount
  })

  return NextResponse.json({
    total, won, lost, active, conversionRate,
    stageCount, lostReasons, totalRevenue, pipelineValue,
    heatScores, pipelineHealth, pendingTasks: tasks.length,
    delayedStages: productionStages.length,
    monthlyRevenue,
  })
}
