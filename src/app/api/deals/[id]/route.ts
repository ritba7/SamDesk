import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PRODUCTION_STAGES } from '@/lib/utils'
import { addBusinessDays } from 'date-fns'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deal = await prisma.deal.findUnique({
    where: { id: params.id },
    include: {
      assignedTo: true,
      createdBy: true,
      activities: {
        include: { user: { select: { name: true, role: true } } },
        orderBy: { createdAt: 'desc' }
      },
      tasks: {
        include: { assignedTo: { select: { name: true, role: true } } },
        orderBy: { createdAt: 'desc' }
      },
      documents: { orderBy: { createdAt: 'desc' } },
      productionStages: { orderBy: { order: 'asc' } },
      quotes: { orderBy: { version: 'desc' } },
      payments: { orderBy: { date: 'desc' } },
    }
  })

  if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(deal)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const body = await req.json()
  const { stage: newStage, ...rest } = body

  const existing = await prisma.deal.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updateData: any = { ...rest }
  if (newStage) updateData.stage = newStage

  // Heat score auto-calculation
  const stageForHeat = newStage || existing.stage
  const lastActivity = await prisma.activity.findFirst({
    where: { dealId: params.id },
    orderBy: { createdAt: 'desc' }
  })
  const daysSinceActivity = lastActivity
    ? Math.floor((Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : Math.floor((Date.now() - new Date(existing.updatedAt).getTime()) / (1000 * 60 * 60 * 24))

  if (['po_received', 'po_vetted', 'pi_sent', 'approval_pending'].includes(stageForHeat)) {
    updateData.heatScore = 'hot'
  } else if (['inquiry', 'tds_sent', 'quote_sent'].includes(stageForHeat)) {
    updateData.heatScore = 'warm'
  } else if (daysSinceActivity > 14) {
    updateData.heatScore = 'cold'
  }
  // else keep existing heatScore (don't override)

  const deal = await prisma.deal.update({
    where: { id: params.id },
    data: updateData
  })

  if (newStage && newStage !== existing.stage) {
    await prisma.activity.create({
      data: {
        dealId: deal.id,
        userId: user.id,
        type: 'stage_change',
        content: `Stage changed to: ${newStage}`,
      }
    })

    const followUpStages: Record<string, string> = {
      tds_sent: 'Follow up with customer after TDS',
      quote_sent: 'Follow up on quote',
      pi_sent: 'Follow up on PI approval',
      dispatched: 'Call customer to confirm receipt',
    }

    if (followUpStages[newStage] && deal.assignedToId) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 3)
      await prisma.task.create({
        data: {
          dealId: deal.id,
          title: `${followUpStages[newStage]} - ${deal.customerName}`,
          assignedToId: deal.assignedToId,
          createdById: user.id,
          dueDate,
          type: 'follow_up',
        }
      })
    }

    if (newStage === 'production') {
      const existingStages = await prisma.productionStage.count({ where: { dealId: deal.id } })
      if (existingStages === 0) {
        let currentDate = new Date()
        for (let i = 0; i < PRODUCTION_STAGES.length; i++) {
          const ps = PRODUCTION_STAGES[i]
          const plannedStart = new Date(currentDate)
          const plannedEnd = addBusinessDays(currentDate, ps.estimatedDays)
          await prisma.productionStage.create({
            data: {
              dealId: deal.id,
              stageName: ps.key,
              order: i,
              plannedStart,
              plannedEnd,
            }
          })
          currentDate = new Date(plannedEnd)
          currentDate.setDate(currentDate.getDate() + 1)
        }

        const mfgHead = await prisma.user.findFirst({ where: { role: 'manufacturing' } })
        const designHead = await prisma.user.findFirst({ where: { role: 'design' } })

        if (mfgHead) {
          await prisma.task.create({
            data: {
              dealId: deal.id,
              title: `Work Order: Start production for ${deal.customerName} (${deal.dealNumber})`,
              description: `Material: ${deal.material}, Motor: ${deal.motorType} ${deal.motorBrand}. Outer: ${deal.outerWidth}W x ${deal.outerHeight}H x ${deal.outerDepth}D mm`,
              assignedToId: mfgHead.id,
              createdById: user.id,
              dueDate: deal.expectedDispatch || undefined,
              type: 'other',
            }
          })
        }

        if (designHead) {
          await prisma.task.create({
            data: {
              dealId: deal.id,
              title: `Prepare layout drawing for ${deal.customerName} (${deal.dealNumber})`,
              assignedToId: designHead.id,
              createdById: user.id,
              type: 'document',
            }
          })
        }
      }
    }
  }

  return NextResponse.json(deal)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (user.role !== 'director') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.deal.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
