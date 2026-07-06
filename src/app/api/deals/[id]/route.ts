import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PRODUCTION_STAGES } from '@/lib/utils'
import { FOLLOWUP_CONFIG } from '@/lib/followupConfig'
import { addBusinessDays } from 'date-fns'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deal = await prisma.deal.findUnique({
    where: { id: params.id },
    include: {
      assignedTo: true,
      createdBy: true,
      contacts: { orderBy: { createdAt: 'asc' } },
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
      proformaInvoices: { orderBy: { createdAt: 'desc' }, include: { workOrder: { select: { woNumber: true, status: true } } } },
      workOrders: { orderBy: { createdAt: 'desc' } },
    }
  })

  if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const user = session.user as any
  if (user.role === 'sales' && deal.assignedToId !== user.id && deal.createdById !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (user.role === 'accounts' && !deal.dealFinalized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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

  // Sales can only touch their own deals
  if (user.role === 'sales' && existing.assignedToId !== user.id && existing.createdById !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updateData: any = { ...rest }
  if (newStage) updateData.stage = newStage

  // Fields sales may always change; also allowed on finalized deals for non-directors
  const ALWAYS_EDITABLE = [
    'stage', 'nextFollowUpAt', 'nextFollowUpMode', 'heatScore',
    // Vetting flow fields (submit for vetting / request quote vetting)
    'vettingStatus', 'quoteVetStatus',
    // Commercials — editable by sales until deal is finalized (finalized guard below still applies)
    'basicPrice', 'discountType', 'discountValue', 'finalPrice',
    'freightBearer', 'freightAmount', 'assemblyAtSite', 'assemblyCharge',
    'warrantyTerms', 'insuranceNote', 'commercialsDone', 'paymentTerms',
    // Dispatch chain fields (primary path is /api/dispatch, but allow direct PATCH)
    'dispatchStatus', 'dispatchDate', 'packingListNote',
  ]

  // A salesman may fully edit his OWN deals (specs, commercials, payment terms)
  // up until the deal is finalized/frozen. The finalized guard below still
  // locks specs/commercials for sales after freeze. Ownership was already
  // enforced above.

  // Finalized deals: spec/commercial changes only for director/sales_director.
  // dealFinalized itself may only be set by sales/sales_director/director (freeze action).
  if (existing.dealFinalized && !['director', 'sales_director'].includes(user.role)) {
    const NOTES_FIELDS = ['internalNotes', 'lostReason', 'lostNotes', 'querySummary']
    const FINALIZED_LOCKED = [
      'basicPrice', 'discountType', 'discountValue', 'finalPrice',
      'freightBearer', 'freightAmount', 'assemblyAtSite', 'assemblyCharge',
      'warrantyTerms', 'insuranceNote', 'commercialsDone', 'paymentTerms',
    ]
    for (const key of Object.keys(updateData)) {
      if ((ALWAYS_EDITABLE.includes(key) && !FINALIZED_LOCKED.includes(key)) || NOTES_FIELDS.includes(key)) continue
      delete updateData[key]
    }
  }

  if (updateData.nextFollowUpAt) updateData.nextFollowUpAt = new Date(updateData.nextFollowUpAt)

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

  if (updateData.commercialsDone === true) {
    await prisma.activity.create({
      data: { dealId: deal.id, userId: user.id, type: 'note', content: 'Commercials updated' }
    })
  }
  if (updateData.vettingStatus === 'pending' && existing.vettingStatus !== 'pending') {
    await prisma.activity.create({
      data: { dealId: deal.id, userId: user.id, type: 'note', content: 'Submitted for accounts vetting' }
    })
  }
  if (updateData.quoteVetStatus === 'requested' && existing.quoteVetStatus !== 'requested') {
    await prisma.activity.create({
      data: { dealId: deal.id, userId: user.id, type: 'note', content: 'Quote vetting requested from accounts' }
    })
  }

  if (newStage && newStage !== existing.stage) {
    await prisma.activity.create({
      data: {
        dealId: deal.id,
        userId: user.id,
        type: 'stage_change',
        content: `Stage changed to: ${newStage}`,
      }
    })

    // Auto follow-up task based on new stage
    const followupCfg = FOLLOWUP_CONFIG.find(c => c.stage === newStage)
    if (followupCfg) {
      // Find the best user to assign: prefer deal's assignedTo if role matches, else find first matching user
      let assigneeId: string | null = deal.assignedToId
      if (assigneeId) {
        const assignee = await prisma.user.findUnique({ where: { id: assigneeId }, select: { role: true } })
        if (!assignee || !followupCfg.assignToRole.includes(assignee.role)) {
          assigneeId = null
        }
      }
      if (!assigneeId) {
        const matchingUser = await prisma.user.findFirst({ where: { role: { in: followupCfg.assignToRole } } })
        assigneeId = matchingUser?.id || null
      }
      if (assigneeId) {
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + followupCfg.defaultDays)
        await prisma.task.create({
          data: {
            dealId: deal.id,
            title: `${followupCfg.taskTitle} — ${deal.customerName}`,
            assignedToId: assigneeId,
            createdById: user.id,
            dueDate,
            type: 'follow_up',
          }
        })
      }
    }

    if (newStage === 'production') {
      const existingStages = await prisma.productionStage.count({ where: { dealId: deal.id } })
      if (existingStages === 0) {
        const mat = (deal.material || '').toLowerCase()
        const isMs = mat === 'ms' || mat.includes('ms_') || mat.includes('ms')
        const applicableStages = PRODUCTION_STAGES.filter(ps => {
          if (ps.key === 'powder_coating' || ps.key === 'assembly_2') return isMs
          if (ps.key === 'external_inspection') return deal.inspectionTerms !== 'waiver'
          return true
        })
        let currentDate = new Date()
        for (let i = 0; i < applicableStages.length; i++) {
          const ps = applicableStages[i]
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
  if (!['director', 'sales_director'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = params.id
  // Remove dependent records first (only ContactPerson cascades automatically).
  await prisma.$transaction([
    prisma.workOrder.deleteMany({ where: { dealId: id } }),
    prisma.proformaInvoice.deleteMany({ where: { dealId: id } }),
    prisma.materialRequest.deleteMany({ where: { dealId: id } }),
    prisma.inspectionChecklist.deleteMany({ where: { dealId: id } }),
    prisma.productionStage.deleteMany({ where: { dealId: id } }),
    prisma.payment.deleteMany({ where: { dealId: id } }),
    prisma.quote.deleteMany({ where: { dealId: id } }),
    prisma.document.deleteMany({ where: { dealId: id } }),
    prisma.task.deleteMany({ where: { dealId: id } }),
    prisma.activity.deleteMany({ where: { dealId: id } }),
    prisma.deal.delete({ where: { id } }),
  ])
  return NextResponse.json({ success: true })
}
