import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const stage = searchParams.get('stage')
  const assignedTo = searchParams.get('assignedTo')

  const where: any = {}
  if (stage) where.stage = stage
  if (assignedTo) where.assignedToId = assignedTo

  const user = session.user as any
  if (user.role === 'manufacturing') {
    // Manufacturing only sees deals with a fully approved Work Order
    where.workOrders = { some: { approvedByAccounts: true, vettedByDirector: true } }
  }
  if (user.role === 'sales') {
    // A salesman only ever sees his own deals
    where.OR = [{ assignedToId: user.id }, { createdById: user.id }]
  }
  if (user.role === 'accounts') {
    // Accounts see a deal once it is finalized OR submitted for any vetting
    // (quote vetting / PO vetting happen before finalize).
    where.OR = [
      { dealFinalized: true },
      { vettingStatus: { in: ['pending', 'approved'] } },
      { quoteVetStatus: { in: ['requested', 'vetted'] } },
    ]
  }

  const deals = await prisma.deal.findMany({
    where,
    include: {
      assignedTo: { select: { name: true, role: true } },
      createdBy: { select: { name: true, role: true } },
      tasks: { where: { status: 'pending' } },
      productionStages: true,
      quotes: { orderBy: { version: 'desc' }, take: 1 },
      payments: true,
      workOrders: { orderBy: { createdAt: 'desc' }, select: { id: true, woNumber: true, status: true, approvedByAccounts: true, vettedByDirector: true, deadline: true } },
    },
    orderBy: { updatedAt: 'desc' }
  })

  return NextResponse.json(deals)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const body = await req.json()

  const count = await prisma.deal.count()
  const dealNumber = `SD-${String(count + 1).padStart(4, '0')}-${new Date().getFullYear()}`

  const {
    expectedCloseDate,
    customerName, customerCompany, customerEmail, customerPhone,
    customerAddress, customerState, gstNumber, source,
    productInterest, querySummary, estimatedQty, timeline,
    budgetIndication, specNotes, priority, verificationScore,
    verificationData, heatScore, assignedToId,
    material, motorType, motorBrand, motorBrandOther,
    outerDepth, outerHeight, outerWidth, innerDepth, innerHeight, innerWidth,
    freightPaidBy, installationType, expectedDispatch,
    paymentTerms, freightTerms, inspectionTerms, introEmail, tdsDeadline,
    modelNumber, airShowerConfig, application, numberOfUsers, entryType,
    airFlowTime, doorType, flooringRequired, inputPower,
    productOther, flooringType, doorLeaf,
    nextFollowUpAt, nextFollowUpMode, firstCallRemarks,
  } = body

  // ---- Serial number generation: {PROD}-{COMP4}-{INITIALS}_{ddmmyy}_{nn} ----
  const PROD_CODES: Record<string, string> = {
    air_shower: 'AS', air_curtain: 'AC', pass_box_static: 'PBS',
    pass_box_dynamic: 'PBD', clean_room: 'CR', other: 'OT',
  }
  const prodCode = PROD_CODES[productInterest as string] || 'OT'
  const comp4 = String(customerCompany || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'XXXX'
  const initials = String(user.name || '')
    .split(/\s+/).filter(Boolean).map((w: string) => w[0]).join('').slice(0, 3).toUpperCase() || 'XX'
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yy = String(now.getFullYear()).slice(-2)
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999)
  const todayCount = await prisma.deal.count({ where: { createdAt: { gte: startOfDay, lte: endOfDay } } })
  const serialNumber = `${prodCode}-${comp4}-${initials}_${dd}${mm}${yy}_${String(todayCount + 1).padStart(2, '0')}`

  // Only leadership (director / sales_director) may assign a deal to someone else.
  // Every other role's new deals are always assigned to the creator himself.
  const canAssignOthers = ['director', 'sales_director'].includes(user.role)
  const effectiveAssignedToId = canAssignOthers ? (assignedToId || user.id) : user.id

  const deal = await prisma.deal.create({
    data: {
      customerName,
      customerCompany,
      ...(customerEmail ? { customerEmail } : {}),
      ...(customerPhone ? { customerPhone } : {}),
      ...(customerAddress ? { customerAddress } : {}),
      ...(customerState ? { customerState } : {}),
      ...(gstNumber ? { gstNumber } : {}),
      ...(source ? { source } : {}),
      ...(productInterest ? { productInterest } : {}),
      ...(querySummary ? { querySummary } : {}),
      ...(estimatedQty ? { estimatedQty: Number(estimatedQty) } : {}),
      ...(timeline ? { timeline } : {}),
      ...(budgetIndication ? { budgetIndication: Number(budgetIndication) } : {}),
      ...(specNotes ? { specNotes } : {}),
      ...(priority ? { priority } : {}),
      ...(verificationScore !== undefined ? { verificationScore: Number(verificationScore) } : {}),
      ...(verificationData ? { verificationData } : {}),
      ...(heatScore ? { heatScore } : {}),
      ...(effectiveAssignedToId ? { assignedToId: effectiveAssignedToId } : {}),
      ...(material ? { material } : {}),
      ...(motorType ? { motorType } : {}),
      ...(motorBrand ? { motorBrand } : {}),
      ...(motorBrandOther ? { motorBrandOther } : {}),
      ...(outerDepth ? { outerDepth: Number(outerDepth) } : {}),
      ...(outerHeight ? { outerHeight: Number(outerHeight) } : {}),
      ...(outerWidth ? { outerWidth: Number(outerWidth) } : {}),
      ...(innerDepth ? { innerDepth: Number(innerDepth) } : {}),
      ...(innerHeight ? { innerHeight: Number(innerHeight) } : {}),
      ...(innerWidth ? { innerWidth: Number(innerWidth) } : {}),
      ...(freightPaidBy ? { freightPaidBy } : {}),
      ...(installationType ? { installationType } : {}),
      ...(expectedDispatch ? { expectedDispatch: new Date(expectedDispatch) } : {}),
      ...(expectedCloseDate ? { expectedCloseDate: new Date(expectedCloseDate) } : {}),
      ...(paymentTerms ? { paymentTerms } : {}),
      ...(freightTerms ? { freightTerms } : {}),
      ...(inspectionTerms ? { inspectionTerms } : {}),
      ...(introEmail ? { introEmail } : {}),
      ...(tdsDeadline ? { tdsDeadline: new Date(tdsDeadline) } : {}),
      ...(modelNumber ? { modelNumber } : {}),
      ...(airShowerConfig ? { airShowerConfig } : {}),
      ...(application ? { application } : {}),
      ...(numberOfUsers ? { numberOfUsers: Number(numberOfUsers) } : {}),
      ...(entryType ? { entryType } : {}),
      ...(airFlowTime ? { airFlowTime } : {}),
      ...(doorType ? { doorType } : {}),
      ...(flooringRequired !== undefined ? { flooringRequired: !!flooringRequired } : {}),
      ...(inputPower ? { inputPower } : {}),
      ...(productOther ? { productOther } : {}),
      ...(flooringType ? { flooringType } : {}),
      ...(doorLeaf ? { doorLeaf } : {}),
      ...(nextFollowUpAt ? { nextFollowUpAt: new Date(nextFollowUpAt) } : {}),
      ...(nextFollowUpMode ? { nextFollowUpMode } : {}),
      serialNumber,
      dealNumber,
      createdById: user.id,
      stage: 'inquiry',
    }
  })

  await prisma.activity.create({
    data: {
      dealId: deal.id,
      userId: user.id,
      type: 'stage_change',
      content: `Deal created - Inquiry received from ${deal.customerName}`,
    }
  })

  // Primary contact person from customer fields
  if (customerName) {
    await prisma.contactPerson.create({
      data: {
        dealId: deal.id,
        name: customerName,
        phone: customerPhone || null,
        email: customerEmail || null,
        isPrimary: true,
      }
    })
  }

  // Remarks after first call — always logged as a note activity
  if (firstCallRemarks && String(firstCallRemarks).trim()) {
    await prisma.activity.create({
      data: {
        dealId: deal.id,
        userId: user.id,
        type: 'note',
        content: String(firstCallRemarks).trim(),
      }
    })
  }

  // Compulsory next follow-up → task for the creating user
  if (nextFollowUpAt) {
    await prisma.task.create({
      data: {
        dealId: deal.id,
        title: `Follow up (${nextFollowUpMode === 'mail' ? 'Email' : 'Call'}) — ${deal.customerCompany}`,
        dueDate: new Date(nextFollowUpAt),
        assignedToId: user.id,
        createdById: user.id,
        type: 'follow_up',
      }
    })
  }

  // Auto-create tasks on deal creation

  // The deal's own salesman = the assignee (never the whole sales team).
  const dealSalesmanId = deal.assignedToId || null

  // 1. Company authentication task for the deal's salesman
  if (dealSalesmanId) {
    const authDue = new Date()
    authDue.setDate(authDue.getDate() + 2)
    await prisma.task.create({
      data: {
        dealId: deal.id,
        title: `Authenticate company — ${deal.customerName} (${deal.customerCompany})`,
        description: `Verify company legitimacy: check website, client list, authorized contact. GST: ${deal.gstNumber || 'not provided'}`,
        type: 'other',
        dueDate: authDue,
        assignedToId: dealSalesmanId,
        createdById: user.id,
      }
    })
  }

  // 2 & 3. TDS tasks and Drawing tasks if tdsDeadline is provided
  if (tdsDeadline) {
    const tdsDate = new Date(tdsDeadline)

    // TDS tasks — one for the deal's own salesman, one for the accounts head, one for the VP.
    const [accountsHead, vpUser] = await Promise.all([
      prisma.user.findFirst({ where: { role: 'accounts' } }),
      prisma.user.findFirst({ where: { role: 'vp' } }),
    ])
    const tdsAssigneeIds = Array.from(new Set([dealSalesmanId, accountsHead?.id, vpUser?.id]
      .filter((x): x is string => !!x)))
    for (const tdsAssigneeId of tdsAssigneeIds) {
      await prisma.task.create({
        data: {
          dealId: deal.id,
          title: `Send TDS to ${deal.customerName} — ${deal.dealNumber}`,
          dueDate: tdsDate,
          type: 'document',
          assignedToId: tdsAssigneeId,
          createdById: user.id,
        }
      })
    }

    // TDS review task for director
    const directorUser = await prisma.user.findFirst({ where: { role: 'director' } })
    if (directorUser) {
      await prisma.task.create({
        data: {
          dealId: deal.id,
          title: `Review TDS before sending to ${deal.customerName}`,
          dueDate: tdsDate,
          type: 'document',
          assignedToId: directorUser.id,
          createdById: user.id,
        }
      })
    }

    // Drawing task for design head
    const designUser = await prisma.user.findFirst({ where: { role: 'design' } })
    if (designUser) {
      await prisma.task.create({
        data: {
          dealId: deal.id,
          title: `Prepare layout drawing for TDS — ${deal.customerName} (${deal.dealNumber})`,
          dueDate: tdsDate,
          type: 'document',
          assignedToId: designUser.id,
          createdById: user.id,
        }
      })
    }

    // Drawing review task for director
    if (directorUser) {
      await prisma.task.create({
        data: {
          dealId: deal.id,
          title: `Review/approve drawing before TDS — ${deal.customerName}`,
          dueDate: tdsDate,
          type: 'document',
          assignedToId: directorUser.id,
          createdById: user.id,
        }
      })
    }
  }

  // 4. Intro email reminder for the deal's own salesman if introEmail provided
  if (introEmail && dealSalesmanId) {
    const emailDue = new Date()
    emailDue.setDate(emailDue.getDate() + 1)
    await prisma.task.create({
      data: {
        dealId: deal.id,
        title: `Send intro email to ${deal.customerName} — ${deal.customerCompany}`,
        description: `Intro email drafted. Send it and log the email.`,
        dueDate: emailDue,
        type: 'follow_up',
        assignedToId: dealSalesmanId,
        createdById: user.id,
      }
    })
  }

  return NextResponse.json(deal)
}
