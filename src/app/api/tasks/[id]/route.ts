import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const body = await req.json()
  const before = await prisma.task.findUnique({ where: { id: params.id } })
  const task = await prisma.task.update({ where: { id: params.id }, data: body })

  // Log activity
  await prisma.activity.create({
    data: {
      dealId: task.dealId || undefined,
      userId: user.id,
      type: 'task',
      content: `Task "${task.title}" updated${body.status ? ` — marked ${body.status}` : ''}${body.dueDate ? ` — deadline changed to ${new Date(body.dueDate).toLocaleDateString('en-IN')}` : ''}`,
    }
  })

  // Auto-advance the deal when a stage-driving task is completed.
  if (body.status === 'done' && before?.status !== 'done' && task.advancesToStage && task.dealId) {
    const STAGE_ORDER = ['inquiry', 'tds_sent', 'quote_sent', 'follow_up', 'po_received', 'po_vetted', 'pi_sent', 'approval_pending', 'production', 'dispatch_ready', 'dispatched', 'feedback_pending', 'closed_won']
    const deal = await prisma.deal.findUnique({ where: { id: task.dealId } })
    if (deal && STAGE_ORDER.indexOf(task.advancesToStage) > STAGE_ORDER.indexOf(deal.stage)) {
      await prisma.deal.update({ where: { id: deal.id }, data: { stage: task.advancesToStage } })
      await prisma.activity.create({
        data: {
          dealId: deal.id,
          userId: user.id,
          type: 'stage_change',
          content: `Stage auto-advanced to ${task.advancesToStage} — "${task.title}" completed`,
        }
      })
    }
  }

  return NextResponse.json(task)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.task.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
