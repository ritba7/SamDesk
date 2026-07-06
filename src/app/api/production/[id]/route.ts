import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const body = await req.json()
  const stage = await prisma.productionStage.update({
    where: { id: params.id },
    data: {
      ...body,
      ...(body.status === 'in_progress' && !body.actualStart ? { actualStart: new Date() } : {}),
      ...(body.status === 'completed' && !body.actualEnd ? { actualEnd: new Date() } : {}),
    }
  })

  // Log activity
  await prisma.activity.create({
    data: {
      dealId: stage.dealId,
      userId: user.id,
      type: 'task',
      content: `Production stage "${stage.stageName}" ${body.status ? `status → ${body.status}` : ''}${body.plannedEnd ? ` — deadline changed to ${new Date(body.plannedEnd).toLocaleDateString('en-IN')}` : ''}`,
    }
  })

  // Stage-completion side effects
  if (body.status === 'completed') {
    const deal = await prisma.deal.findUnique({ where: { id: stage.dealId } })
    if (deal) {
      const serial = deal.serialNumber || deal.dealNumber
      const salesUser = deal.assignedToId
        ? await prisma.user.findUnique({ where: { id: deal.assignedToId } })
        : await prisma.user.findFirst({ where: { role: 'sales' } })
      const accountsUser = await prisma.user.findFirst({ where: { role: 'accounts' } })

      if (stage.stageName === 'assembly_1' && salesUser) {
        const due = new Date(); due.setDate(due.getDate() + 1)
        const inspDate = new Date(); inspDate.setDate(inspDate.getDate() + 8)
        const product = deal.productInterest === 'other' ? (deal.productOther || 'unit') : (deal.productInterest || 'air shower')
        const model = deal.modelNumber || '—'
        const draft = `Dear Sir/Ma'am, your ${product} (${model}) has completed initial assembly at our works. We invite you for pre-dispatch inspection on ${inspDate.toLocaleDateString('en-IN')} at our Greater Noida facility. Kindly confirm the inspection date, or share a written inspection waiver so we may proceed. — Team SAM PRODUCTS`
        await prisma.task.create({
          data: {
            dealId: deal.id,
            title: `Intimate customer: inspection in 8 days or request waiver (${serial})`,
            description: draft,
            assignedToId: salesUser.id,
            createdById: user.id,
            dueDate: due,
            type: 'other',
          }
        })
      }

      // Packing & dispatch complete, or all stages complete
      const allStages = await prisma.productionStage.findMany({ where: { dealId: deal.id } })
      const allComplete = allStages.length > 0 && allStages.every(s => s.status === 'completed')
      if (stage.stageName === 'packing_dispatch' || allComplete) {
        if (salesUser) {
          await prisma.task.create({
            data: {
              dealId: deal.id,
              title: `Production complete — intimate customer (${serial})`,
              assignedToId: salesUser.id,
              createdById: user.id,
              type: 'other',
            }
          })
        }
        if (accountsUser) {
          await prisma.task.create({
            data: {
              dealId: deal.id,
              title: `Production complete — collect due payments before dispatch (${serial})`,
              assignedToId: accountsUser.id,
              createdById: user.id,
              type: 'other',
            }
          })
        }
      }
    }
  }

  return NextResponse.json(stage)
}
