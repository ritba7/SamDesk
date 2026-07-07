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
  if (user.role === 'accounts') {
    // Accounts may see a deal once it is finalized OR submitted for any vetting.
    const accountsVisible = deal.dealFinalized
      || ['pending', 'approved'].includes(deal.vettingStatus)
      || ['requested', 'vetted'].includes(deal.quoteVetStatus)
    if (!accountsVisible) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
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

  // PO vetting is done by Accounts — sales may move up to po_received but not po_vetted
  if (user.role === 'sales' && newStage === 'po_vetted') {
    return NextResponse.json({ error: 'PO vetting is done by Accounts.' }, { status: 403 })
  }

  const updateData: any = { ...rest }
  if (newStage) updateData.stage = newStage

  // Reassign / transfer (assignedToId) is a leadership-only action.
  // Strip it for anyone who is not director / sales_director.
  const isLeadership = ['director', 'sales_director'].includes(user.role)
  if (updateData.assignedToId !== undefined && !isLeadership) {
    delete updateData.assignedToId
  }

  // Final PO data re-entry: salesman re-enters confirmed PO details, overwriting
  // the earlier lead data. Snapshot the pre-PO data before applying the update.
  const isFinalEntry = updateData.finalDataEntered === true && existing.finalDataEntered === false
  if (isFinalEntry && existing.poSnapshot == null) {
    updateData.poSnapshot = JSON.stringify({
      // customer
      customerName: existing.customerName,
      customerCompany: existing.customerCompany,
      customerEmail: existing.customerEmail,
      customerPhone: existing.customerPhone,
      customerAddress: existing.customerAddress,
      customerState: existing.customerState,
      gstNumber: existing.gstNumber,
      // specs
      modelNumber: existing.modelNumber,
      airShowerConfig: existing.airShowerConfig,
      application: existing.application,
      numberOfUsers: existing.numberOfUsers,
      entryType: existing.entryType,
      airFlowTime: existing.airFlowTime,
      doorType: existing.doorType,
      doorLeaf: existing.doorLeaf,
      flooringRequired: existing.flooringRequired,
      flooringType: existing.flooringType,
      inputPower: existing.inputPower,
      material: existing.material,
      motorType: existing.motorType,
      motorBrand: existing.motorBrand,
      motorBrandOther: existing.motorBrandOther,
      outerWidth: existing.outerWidth,
      outerHeight: existing.outerHeight,
      outerDepth: existing.outerDepth,
      innerWidth: existing.innerWidth,
      innerHeight: existing.innerHeight,
      innerDepth: existing.innerDepth,
      specNotes: existing.specNotes,
      // commercial
      basicPrice: existing.basicPrice,
      discountType: existing.discountType,
      discountValue: existing.discountValue,
      finalPrice: existing.finalPrice,
      quotedAmount: existing.quotedAmount,
      freightBearer: existing.freightBearer,
      freightAmount: existing.freightAmount,
      assemblyAtSite: existing.assemblyAtSite,
      assemblyCharge: existing.assemblyCharge,
      warrantyTerms: existing.warrantyTerms,
      paymentTerms: existing.paymentTerms,
      freightTerms: existing.freightTerms,
      inspectionTerms: existing.inspectionTerms,
      snapshotAt: new Date().toISOString(),
    })
  }

  // Fields sales may always change; also allowed on finalized deals for non-directors
  const ALWAYS_EDITABLE = [
    'stage', 'nextFollowUpAt', 'nextFollowUpMode', 'heatScore',
    // Vetting flow fields (submit for vetting / request quote vetting)
    'vettingStatus', 'quoteVetStatus',
    // Commercials — editable by sales until deal is finalized (finalized guard below still applies)
    'basicPrice', 'discountType', 'discountValue', 'finalPrice',
    'freightBearer', 'freightAmount', 'assemblyAtSite', 'assemblyCharge',
    'warrantyTerms', 'insuranceNote', 'commercialsDone', 'paymentTerms', 'paymentSchedule',
    // Dispatch chain fields (primary path is /api/dispatch, but allow direct PATCH)
    'dispatchStatus', 'dispatchDate', 'packingListNote',
    // Freeze / final-entry flags — sales freeze action must go through
    'dealFinalized', 'finalDataEntered',
  ]

  // A salesman may set dealFinalized true (freeze) but never un-freeze it back.
  if (user.role === 'sales' && updateData.dealFinalized === false && existing.dealFinalized) {
    delete updateData.dealFinalized
  }

  // Sales fill-blanks-only rule: a salesman may fill in blank fields but may
  // not overwrite existing details. Fields in ALWAYS_EDITABLE (stage,
  // follow-ups, commercials, dispatch, freeze flags, etc.) are exempt so those
  // flows work. Note: booleans default to false, so exempting the freeze flags
  // is required — otherwise a false→true toggle would be wrongly stripped.
  if (user.role === 'sales' && !isFinalEntry) {
    for (const key of Object.keys(updateData)) {
      if (ALWAYS_EDITABLE.includes(key)) continue
      const cur = (existing as any)[key]
      if (cur !== null && cur !== undefined && cur !== '') {
        delete updateData[key]
      }
    }
  }

  // Finalized deals: spec/commercial changes only for director/sales_director.
  // dealFinalized itself may only be set by sales/sales_director/director (freeze action).
  if (existing.dealFinalized && !isFinalEntry && !['director', 'sales_director'].includes(user.role)) {
    const NOTES_FIELDS = ['internalNotes', 'lostReason', 'lostNotes', 'querySummary']
    const FINALIZED_LOCKED = [
      'basicPrice', 'discountType', 'discountValue', 'finalPrice',
      'freightBearer', 'freightAmount', 'assemblyAtSite', 'assemblyCharge',
      'warrantyTerms', 'insuranceNote', 'commercialsDone', 'paymentTerms', 'paymentSchedule',
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

  // ---- CHANGE AUDIT LOG ---- diff updateData against existing; skip noisy auto fields
  const SKIP_LOG_FIELDS = ['heatScore', 'updatedAt', 'poSnapshot']
  const changeRows: any[] = []
  for (const key of Object.keys(updateData)) {
    if (SKIP_LOG_FIELDS.includes(key)) continue
    const oldVal = (existing as any)[key]
    const newVal = updateData[key]
    const oldCmp = oldVal instanceof Date ? oldVal.toISOString() : oldVal
    const newCmp = newVal instanceof Date ? new Date(newVal).toISOString() : newVal
    if (String(oldCmp ?? '') === String(newCmp ?? '')) continue
    changeRows.push({
      dealId: params.id,
      userId: user.id,
      userName: user.name || null,
      field: key,
      oldValue: String(oldCmp ?? ''),
      newValue: String(newCmp ?? ''),
    })
  }

  const deal = await prisma.deal.update({
    where: { id: params.id },
    data: updateData
  })

  if (changeRows.length > 0) {
    try {
      await prisma.changeLog.createMany({ data: changeRows })
    } catch (e) {
      // logging must never break the update
    }
  }

  if (updateData.commercialsDone === true) {
    await prisma.activity.create({
      data: { dealId: deal.id, userId: user.id, type: 'note', content: 'Commercials updated' }
    })
  }
  // Deal transfer / reassignment (leadership only — enforced above)
  if (updateData.assignedToId !== undefined && updateData.assignedToId !== existing.assignedToId) {
    const newAssignee = updateData.assignedToId
      ? await prisma.user.findUnique({ where: { id: updateData.assignedToId }, select: { name: true } })
      : null
    await prisma.activity.create({
      data: {
        dealId: deal.id,
        userId: user.id,
        type: 'note',
        content: `Deal transferred to ${newAssignee?.name || 'Unassigned'}`,
        highlighted: true,
      },
    })
  }

  const vettingNowPending = updateData.vettingStatus === 'pending' && existing.vettingStatus !== 'pending'
  const quoteVetNowRequested = updateData.quoteVetStatus === 'requested' && existing.quoteVetStatus !== 'requested'

  if (vettingNowPending) {
    await prisma.activity.create({
      data: { dealId: deal.id, userId: user.id, type: 'note', content: 'Submitted for accounts vetting' }
    })
  }
  if (quoteVetNowRequested) {
    await prisma.activity.create({
      data: { dealId: deal.id, userId: user.id, type: 'note', content: 'Quote vetting requested from accounts' }
    })
  }

  // Notify leadership + accounts head when a deal is submitted for any vetting.
  if (vettingNowPending || quoteVetNowRequested) {
    try {
      const [accountsHead, salesDirector, directorUser] = await Promise.all([
        prisma.user.findFirst({ where: { role: 'accounts' } }),
        prisma.user.findFirst({ where: { role: 'sales_director' } }),
        prisma.user.findFirst({ where: { role: 'director' } }),
      ])
      const recipientIds = Array.from(new Set(
        [accountsHead?.id, salesDirector?.id, directorUser?.id].filter((x): x is string => !!x)
      ))
      if (recipientIds.length > 0) {
        const due = new Date()
        due.setDate(due.getDate() + 1)
        const title = `Vetting requested — ${deal.customerCompany} (${deal.serialNumber || deal.dealNumber})`
        await prisma.task.createMany({
          data: recipientIds.map(rid => ({
            dealId: deal.id,
            title,
            assignedToId: rid,
            createdById: user.id,
            dueDate: due,
            type: 'other',
          })),
        })
      }
    } catch (e) {
      // notification failure must not break the update
    }
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

    // ---- PO RECEIVED BROADCAST ----
    if (newStage === 'po_received' && existing.stage !== 'po_received') {
      try {
        const [vpUser, mfgUser, directorUser, salesDirector] = await Promise.all([
          prisma.user.findFirst({ where: { role: 'vp' } }),
          prisma.user.findFirst({ where: { role: 'manufacturing' } }),
          prisma.user.findFirst({ where: { role: 'director' } }),
          prisma.user.findFirst({ where: { role: 'sales_director' } }),
        ])
        const salesmanId = deal.assignedToId
        const recipientIds = Array.from(new Set([
          vpUser?.id, mfgUser?.id, directorUser?.id, salesmanId, salesDirector?.id,
        ].filter((x): x is string => !!x)))
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 1)
        const title = `PO received — ${deal.customerCompany} (${deal.serialNumber || deal.dealNumber})`
        if (recipientIds.length > 0) {
          await prisma.task.createMany({
            data: recipientIds.map(rid => ({
              dealId: deal.id,
              title,
              assignedToId: rid,
              createdById: user.id,
              dueDate,
              type: 'other',
            })),
          })
        }
        await prisma.activity.create({
          data: {
            dealId: deal.id,
            userId: user.id,
            type: 'note',
            content: 'PO received — broadcast to VP, Manufacturing, Director, Sales & Sales Director',
            highlighted: true,
          },
        })
      } catch (e) {
        // broadcast failures must not break the stage change
      }
    }

    // Auto follow-up task based on new stage
    const followupCfg = FOLLOWUP_CONFIG.find(c => c.stage === newStage)
    if (followupCfg) {
      let assigneeId: string | null = null
      // Salesman-facing follow-ups must go to the deal's own assigned salesman —
      // never to "the first user of role sales".
      if (followupCfg.assignToRole.includes('sales') && deal.assignedToId) {
        assigneeId = deal.assignedToId
      }
      // Otherwise prefer deal's assignedTo if its role matches, else first matching user.
      if (!assigneeId) {
        assigneeId = deal.assignedToId
        if (assigneeId) {
          const assignee = await prisma.user.findUnique({ where: { id: assigneeId }, select: { role: true } })
          if (!assignee || !followupCfg.assignToRole.includes(assignee.role)) {
            assigneeId = null
          }
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
