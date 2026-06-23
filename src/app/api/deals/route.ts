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
    where.stage = { in: ['production', 'dispatch_ready', 'dispatched'] }
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
  } = body

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
      ...(assignedToId ? { assignedToId } : {}),
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

  return NextResponse.json(deal)
}
