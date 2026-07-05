import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: vetting queue for accounts/director — spec + commercials ONLY, no customer contact info
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  if (!['accounts', 'director'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const deals = await prisma.deal.findMany({
    where: { vettingStatus: 'pending' },
    select: {
      id: true,
      serialNumber: true,
      dealNumber: true,
      modelNumber: true,
      airShowerConfig: true,
      application: true,
      numberOfUsers: true,
      entryType: true,
      airFlowTime: true,
      doorType: true,
      doorLeaf: true,
      flooringRequired: true,
      flooringType: true,
      inputPower: true,
      material: true,
      motorType: true,
      motorBrand: true,
      motorBrandOther: true,
      outerDepth: true,
      outerHeight: true,
      outerWidth: true,
      innerDepth: true,
      innerHeight: true,
      innerWidth: true,
      specNotes: true,
      // commercials
      basicPrice: true,
      discountType: true,
      discountValue: true,
      finalPrice: true,
      freightBearer: true,
      freightAmount: true,
      assemblyAtSite: true,
      assemblyCharge: true,
      warrantyTerms: true,
      insuranceNote: true,
      paymentTerms: true,
      quotedAmount: true,
    },
    orderBy: { updatedAt: 'asc' },
  })

  // Quote-vet requests (simple list)
  const quoteRequests = await prisma.deal.findMany({
    where: { quoteVetStatus: 'requested' },
    select: { id: true, serialNumber: true, dealNumber: true, modelNumber: true, quotedAmount: true },
    orderBy: { updatedAt: 'asc' },
  })

  return NextResponse.json({ deals, quoteRequests })
}

// POST: approve / reject a pending vetting
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  if (!['accounts', 'director'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { dealId, action, note } = await req.json()
  if (!dealId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const deal = await prisma.deal.findUnique({ where: { id: dealId } })
  if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (deal.vettingStatus !== 'pending') {
    return NextResponse.json({ error: 'Deal is not pending vetting' }, { status: 400 })
  }

  if (action === 'approve') {
    // work code SP/{MMYY}/{serial} — serial = count of approved vettings this month + 1 (3-digit)
    const now = new Date()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yy = String(now.getFullYear()).slice(-2)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    const monthCount = await prisma.deal.count({
      where: { vettingStatus: 'approved', vettedAt: { gte: startOfMonth, lte: endOfMonth } },
    })
    const workCode = `SP/${mm}${yy}/${String(monthCount + 1).padStart(3, '0')}`

    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: {
        vettingStatus: 'approved',
        workCode,
        vettedById: user.id,
        vettedAt: now,
        vettingNote: note || null,
      },
    })

    await prisma.activity.create({
      data: {
        dealId,
        userId: user.id,
        type: 'note',
        content: `Vetted & approved by accounts — work code ${workCode}`,
        highlighted: true,
      },
    })

    return NextResponse.json(updated)
  }

  // reject
  const updated = await prisma.deal.update({
    where: { id: dealId },
    data: { vettingStatus: 'rejected', vettingNote: note || null },
  })
  await prisma.activity.create({
    data: {
      dealId,
      userId: user.id,
      type: 'note',
      content: `Vetting rejected by accounts${note ? ` — ${note}` : ''}`,
    },
  })
  return NextResponse.json(updated)
}
