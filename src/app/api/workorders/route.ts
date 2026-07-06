import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any

  if (['director', 'sales_director', 'vp', 'accounts'].includes(user.role)) {
    const wos = await prisma.workOrder.findMany({
      include: {
        deal: { select: { serialNumber: true, workCode: true, modelNumber: true, expectedDispatch: true } },
        pi: { select: { piNumber: true, poReference: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(wos)
  }

  if (user.role === 'manufacturing') {
    const wos = await prisma.workOrder.findMany({
      where: { approvedByAccounts: true, vettedByDirector: true },
      select: { id: true, woNumber: true, deadline: true, specSnapshot: true, status: true, dealId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(wos)
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST { dealId } — accounts/director manually create a WorkOrder for the deal
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  if (!['accounts', 'director'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { dealId } = await req.json()
  if (!dealId) return NextResponse.json({ error: 'dealId required' }, { status: 400 })

  const deal = await prisma.deal.findUnique({ where: { id: dealId } })
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const existingWo = await prisma.workOrder.findFirst({ where: { dealId } })
  if (existingWo) {
    return NextResponse.json({ error: 'A work order already exists for this deal', workOrder: existingWo }, { status: 400 })
  }

  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yy = String(now.getFullYear()).slice(-2)
  const mmyy = `${mm}${yy}`
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const woCount = await prisma.workOrder.count({
    where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
  })
  const woNumber = `SPWO/${deal.modelNumber || 'NA'}/${mmyy}/${String(woCount + 1).padStart(2, '0')}`

  const specSnapshot = JSON.stringify({
    serialNumber: deal.serialNumber,
    workCode: deal.workCode,
    modelNumber: deal.modelNumber,
    airShowerConfig: deal.airShowerConfig,
    application: deal.application,
    numberOfUsers: deal.numberOfUsers,
    entryType: deal.entryType,
    airFlowTime: deal.airFlowTime,
    doorType: deal.doorType,
    doorLeaf: deal.doorLeaf,
    flooringRequired: deal.flooringRequired,
    flooringType: deal.flooringType,
    inputPower: deal.inputPower,
    material: deal.material,
    motorType: deal.motorType,
    motorBrand: deal.motorBrand,
    motorBrandOther: deal.motorBrandOther,
    outerWidth: deal.outerWidth,
    outerHeight: deal.outerHeight,
    outerDepth: deal.outerDepth,
    innerWidth: deal.innerWidth,
    innerHeight: deal.innerHeight,
    innerDepth: deal.innerDepth,
    specNotes: deal.specNotes,
    basicPrice: deal.basicPrice,
    discountType: deal.discountType,
    discountValue: deal.discountValue,
    finalPrice: deal.finalPrice,
    freightBearer: deal.freightBearer,
    freightAmount: deal.freightAmount,
    assemblyAtSite: deal.assemblyAtSite,
    assemblyCharge: deal.assemblyCharge,
    warrantyTerms: deal.warrantyTerms,
    paymentTerms: deal.paymentTerms,
  })

  const workOrder = await prisma.workOrder.create({
    data: {
      dealId,
      woNumber,
      specSnapshot,
      status: 'pending_approval',
      deadline: deal.expectedDispatch || null,
    },
  })

  const due = new Date(now)
  due.setDate(due.getDate() + 1)
  const accountsUser = await prisma.user.findFirst({ where: { role: 'accounts' } })
  if (accountsUser) {
    await prisma.task.create({
      data: { dealId, title: `Approve Work Order ${woNumber}`, assignedToId: accountsUser.id, createdById: user.id, dueDate: due, type: 'other' },
    })
  }
  const directorUser = await prisma.user.findFirst({ where: { role: 'director' } })
  if (directorUser) {
    await prisma.task.create({
      data: { dealId, title: `Vet Work Order ${woNumber}`, assignedToId: directorUser.id, createdById: user.id, dueDate: due, type: 'other' },
    })
  }

  await prisma.activity.create({
    data: {
      dealId,
      userId: user.id,
      type: 'document',
      content: `Work Order ${woNumber} generated manually`,
      highlighted: true,
    },
  })

  return NextResponse.json(workOrder)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any

  const { id, action } = await req.json()
  if (!id || !action) return NextResponse.json({ error: 'id and action required' }, { status: 400 })

  const wo = await prisma.workOrder.findUnique({ where: { id } })
  if (!wo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data: any = {}

  if (action === 'approve_accounts') {
    if (!['accounts', 'director'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    data.approvedByAccounts = true
    data.approvedByAccountsAt = new Date()
  } else if (action === 'vet_director') {
    if (!['director', 'sales_director'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    data.vettedByDirector = true
    data.vettedByDirectorAt = new Date()
  } else if (action === 'start_production') {
    if (!['director', 'manufacturing', 'accounts'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    data.status = 'in_production'
  } else if (action === 'complete') {
    if (!['director', 'manufacturing', 'accounts'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    data.status = 'completed'
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // Check if both sign-offs complete → status approved
  const willAccounts = data.approvedByAccounts ?? wo.approvedByAccounts
  const willDirector = data.vettedByDirector ?? wo.vettedByDirector
  const becomingFullyApproved =
    ['approve_accounts', 'vet_director'].includes(action) &&
    willAccounts && willDirector && wo.status === 'pending_approval'
  if (becomingFullyApproved) data.status = 'approved'

  const updated = await prisma.workOrder.update({ where: { id }, data })

  if (becomingFullyApproved) {
    await prisma.activity.create({
      data: {
        dealId: wo.dealId,
        userId: user.id,
        type: 'note',
        content: `WO ${wo.woNumber} fully approved`,
        highlighted: true,
      },
    })
  }

  return NextResponse.json(updated)
}
