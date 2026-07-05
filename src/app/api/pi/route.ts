import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any

  const { searchParams } = new URL(req.url)
  const dealId = searchParams.get('dealId')
  if (!dealId) return NextResponse.json({ error: 'dealId required' }, { status: 400 })

  if (!['accounts', 'director', 'sales_director', 'vp', 'sales'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (user.role === 'sales') {
    const deal = await prisma.deal.findUnique({ where: { id: dealId } })
    if (!deal || (deal.assignedToId !== user.id && deal.createdById !== user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const pis = await prisma.proformaInvoice.findMany({
    where: { dealId },
    include: { workOrder: { select: { woNumber: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(pis)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  if (!['accounts', 'director'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { dealId, amount, poReference, notes } = await req.json()
  if (!dealId || !amount) return NextResponse.json({ error: 'dealId and amount required' }, { status: 400 })

  const deal = await prisma.deal.findUnique({ where: { id: dealId } })
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  if (deal.vettingStatus !== 'approved') {
    return NextResponse.json({ error: 'Deal must be vetted & approved by accounts before releasing a PI' }, { status: 400 })
  }

  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yy = String(now.getFullYear()).slice(-2)
  const mmyy = `${mm}${yy}`
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  // PI number SPPI/MMYY/serial (3-digit, count of PIs this month + 1)
  const piCount = await prisma.proformaInvoice.count({
    where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
  })
  const piNumber = `SPPI/${mmyy}/${String(piCount + 1).padStart(3, '0')}`

  const pi = await prisma.proformaInvoice.create({
    data: {
      dealId,
      piNumber,
      poReference: poReference || null,
      amount: Number(amount),
      notes: notes || null,
      createdById: user.id,
      released: true,
    },
  })

  await prisma.activity.create({
    data: {
      dealId,
      userId: user.id,
      type: 'document',
      content: `PI ${piNumber} released${poReference ? ` against PO ${poReference}` : ''}`,
    },
  })

  // ---- AUTO-GENERATE WORK ORDER ----
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
      piId: pi.id,
      woNumber,
      specSnapshot,
      status: 'pending_approval',
      deadline: deal.expectedDispatch || null,
    },
  })

  // Sign-off tasks
  const due = new Date(now)
  due.setDate(due.getDate() + 1)
  const accountsUser = await prisma.user.findFirst({ where: { role: 'accounts' } })
  if (accountsUser) {
    await prisma.task.create({
      data: {
        dealId,
        title: `Approve Work Order ${woNumber}`,
        assignedToId: accountsUser.id,
        createdById: user.id,
        dueDate: due,
        type: 'other',
      },
    })
  }
  const directorUser = await prisma.user.findFirst({ where: { role: 'director' } })
  if (directorUser) {
    await prisma.task.create({
      data: {
        dealId,
        title: `Vet Work Order ${woNumber}`,
        assignedToId: directorUser.id,
        createdById: user.id,
        dueDate: due,
        type: 'other',
      },
    })
  }

  await prisma.activity.create({
    data: {
      dealId,
      userId: user.id,
      type: 'document',
      content: `Work Order ${woNumber} auto-generated from PI ${piNumber}`,
      highlighted: true,
    },
  })

  return NextResponse.json({ pi, workOrder })
}
