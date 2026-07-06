import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// The dispatch chain: each step defines the previous status it must follow,
// which roles may trigger it, and the label.
interface Step {
  from: string | null
  to: string
  roles: string[]
}

const STEPS: Step[] = [
  { from: null, to: 'payment_received', roles: ['accounts', 'director'] },
  { from: 'payment_received', to: 'truck_arranged', roles: ['accounts', 'director'] },
  { from: 'truck_arranged', to: 'forklift_called', roles: ['accounts', 'director'] },
  { from: 'forklift_called', to: 'loaded', roles: ['manufacturing', 'director'] },
  { from: 'loaded', to: 'tarp_verified', roles: ['accounts', 'director'] },
  { from: 'tarp_verified', to: 'dispatched', roles: ['accounts', 'director'] },
  { from: 'dispatched', to: 'unloaded', roles: ['sales', 'sales_director', 'director'] },
  { from: 'unloaded', to: 'assembly_planned', roles: ['accounts', 'director'] },
  { from: 'assembly_planned', to: 'closed', roles: ['accounts', 'director'] },
]

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any

  const { dealId, nextStatus, dispatchDate, packingListNote } = await req.json()
  if (!dealId || !nextStatus) return NextResponse.json({ error: 'dealId and nextStatus required' }, { status: 400 })

  const deal = await prisma.deal.findUnique({ where: { id: dealId } })
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const step = STEPS.find(s => s.to === nextStatus)
  if (!step) return NextResponse.json({ error: 'Invalid dispatch status' }, { status: 400 })

  const current = deal.dispatchStatus || null
  if (step.from !== current) {
    return NextResponse.json({ error: `Out-of-order transition. Current: ${current || 'none'}, expected previous: ${step.from || 'none'}` }, { status: 400 })
  }

  // Sales may only act on their own deal
  if (['sales', 'sales_director'].includes(user.role) && deal.assignedToId !== user.id && deal.createdById !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!step.roles.includes(user.role)) {
    return NextResponse.json({ error: 'Your role cannot perform this dispatch step' }, { status: 403 })
  }

  const serial = deal.serialNumber || deal.dealNumber
  const dealUpdate: any = { dispatchStatus: nextStatus }

  const accountsUser = await prisma.user.findFirst({ where: { role: 'accounts' } })
  const mfgUser = await prisma.user.findFirst({ where: { role: 'manufacturing' } })
  const salesUser = deal.assignedToId
    ? await prisma.user.findUnique({ where: { id: deal.assignedToId } })
    : await prisma.user.findFirst({ where: { role: 'sales' } })

  const tasks: { assignedToId?: string | null; title: string; days?: number }[] = []
  let activityContent = `Dispatch: ${nextStatus.replace(/_/g, ' ')}`

  const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  switch (nextStatus) {
    case 'payment_received':
      tasks.push({ assignedToId: accountsUser?.id, title: 'Arrange truck for dispatch' })
      if (dispatchDate) {
        dealUpdate.dispatchDate = new Date(dispatchDate)
        tasks.push({ assignedToId: mfgUser?.id, title: `Dispatch date set: ${fmtDate(new Date(dispatchDate))}` })
      }
      break
    case 'truck_arranged':
      tasks.push({ assignedToId: mfgUser?.id, title: `Truck arranged ${deal.dispatchDate ? fmtDate(new Date(deal.dispatchDate)) : ''} — prepare packing list` })
      break
    case 'forklift_called':
      tasks.push({ assignedToId: mfgUser?.id, title: 'Forklift called — load; provide packing list to accounts BEFORE loading' })
      break
    case 'loaded':
      if (packingListNote) dealUpdate.packingListNote = packingListNote
      tasks.push({ assignedToId: accountsUser?.id, title: 'Verify tarpaulin properly placed on loaded truck' })
      break
    case 'tarp_verified':
      tasks.push({ assignedToId: accountsUser?.id, title: 'Prepare Bill, E-way Bill, PO copy — DISPATCH' })
      break
    case 'dispatched':
      dealUpdate.actualDispatch = new Date()
      tasks.push({ assignedToId: salesUser?.id, title: `Ask customer tomorrow: unloaded OK? (${serial})`, days: 1 })
      break
    case 'unloaded':
      tasks.push({ assignedToId: salesUser?.id, title: 'Ask customer assembly/visit date; tell accounts' })
      break
    case 'assembly_planned':
      tasks.push({ assignedToId: accountsUser?.id, title: 'Plan assembly visit' })
      tasks.push({ assignedToId: accountsUser?.id, title: `Collect pending payment (${serial})` })
      break
    case 'closed':
      dealUpdate.stage = 'closed_won'
      activityContent = 'Deal closed after dispatch & final payment'
      break
  }

  await prisma.deal.update({ where: { id: dealId }, data: dealUpdate })

  for (const t of tasks) {
    if (!t.assignedToId) continue
    let dueDate: Date | undefined = undefined
    if (t.days) { dueDate = new Date(); dueDate.setDate(dueDate.getDate() + t.days) }
    await prisma.task.create({
      data: {
        dealId,
        title: t.title,
        assignedToId: t.assignedToId,
        createdById: user.id,
        dueDate,
        type: 'other',
      },
    })
  }

  await prisma.activity.create({
    data: { dealId, userId: user.id, type: 'note', content: activityContent },
  })

  const updated = await prisma.deal.findUnique({ where: { id: dealId } })
  return NextResponse.json(updated)
}
