import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface CalEvent {
  id: string
  date: string
  type: string
  title: string
  sub?: string
  role?: string
  dealId?: string
  amount?: number
  direction?: 'in' | 'out'
}

function roleSees(visibility: string[], userRole: string): boolean {
  if (userRole === 'director') return true
  return visibility.includes(userRole)
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const role = user.role as string
  const events: CalEvent[] = []

  // Tasks
  const taskWhere: any = { dueDate: { not: null } }
  if (role !== 'director') taskWhere.assignedToId = user.id
  const tasks = await prisma.task.findMany({
    where: taskWhere,
    include: { deal: { select: { customerCompany: true } } },
  })
  for (const t of tasks) {
    events.push({
      id: `task-${t.id}`,
      date: (t.dueDate as Date).toISOString(),
      type: 'task',
      title: t.title,
      sub: t.deal?.customerCompany || undefined,
      dealId: t.dealId || undefined,
    })
  }

  // Payments scheduled (director + accounts)
  if (roleSees(['accounts'], role)) {
    const payments = await prisma.payment.findMany({
      where: { received: false, scheduledDate: { not: null } },
      include: { deal: { select: { customerCompany: true } } },
    })
    for (const p of payments) {
      events.push({
        id: `pay-${p.id}`,
        date: (p.scheduledDate as Date).toISOString(),
        type: 'payment_in',
        direction: 'in',
        amount: p.amount,
        title: `${p.deal?.customerCompany || ''} — ${p.type}`,
        dealId: p.dealId,
      })
    }
  }

  // Expenses scheduled (director + accounts)
  if (roleSees(['accounts'], role)) {
    const expenses = await prisma.expense.findMany({
      where: { paid: false, dueDate: { not: null } },
    })
    for (const e of expenses) {
      events.push({
        id: `exp-${e.id}`,
        date: (e.dueDate as Date).toISOString(),
        type: 'payment_out',
        direction: 'out',
        amount: e.amount,
        title: e.vendorName || e.category,
        sub: e.vendorName ? e.category : undefined,
        dealId: e.dealId || undefined,
      })
    }
  }

  // Deal-based deadlines / dispatch
  const deals = await prisma.deal.findMany({
    select: {
      id: true, customerCompany: true,
      advanceDeadline: true, advanceReceived: true, advanceAmount: true,
      balanceDeadline: true, balancePaid: true,
      tdsDeadline: true, expectedDispatch: true,
    },
  })
  for (const d of deals) {
    if (d.advanceDeadline && !d.advanceReceived && roleSees(['accounts', 'sales'], role)) {
      events.push({
        id: `adv-${d.id}`, date: d.advanceDeadline.toISOString(), type: 'deadline',
        title: `Advance due — ${d.customerCompany}`, amount: d.advanceAmount || undefined, dealId: d.id,
      })
    }
    if (d.balanceDeadline && !d.balancePaid && roleSees(['accounts', 'sales'], role)) {
      events.push({
        id: `bal-${d.id}`, date: d.balanceDeadline.toISOString(), type: 'deadline',
        title: `Balance due — ${d.customerCompany}`, dealId: d.id,
      })
    }
    if (d.tdsDeadline && roleSees(['sales', 'vp'], role)) {
      events.push({
        id: `tds-${d.id}`, date: d.tdsDeadline.toISOString(), type: 'deadline',
        title: `Send TDS — ${d.customerCompany}`, dealId: d.id,
      })
    }
    if (d.expectedDispatch && roleSees(['sales', 'accounts', 'manufacturing'], role)) {
      events.push({
        id: `dispatch-${d.id}`, date: d.expectedDispatch.toISOString(), type: 'dispatch',
        title: `Dispatch — ${d.customerCompany}`, dealId: d.id,
      })
    }
  }

  // Production stages (director + manufacturing)
  if (roleSees(['manufacturing'], role)) {
    const stages = await prisma.productionStage.findMany({
      where: { plannedEnd: { not: null } },
      include: { deal: { select: { id: true, customerCompany: true } } },
    })
    for (const s of stages) {
      events.push({
        id: `prod-${s.id}`, date: (s.plannedEnd as Date).toISOString(), type: 'production',
        title: `${s.stageName} — ${s.deal?.customerCompany || ''}`, dealId: s.dealId,
      })
    }
  }

  return NextResponse.json(events)
}
