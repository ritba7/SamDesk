import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  const body = await req.json()

  const payment = await prisma.payment.create({ data: body })

  // Log activity
  await prisma.activity.create({
    data: {
      dealId: body.dealId,
      userId: user.id,
      type: 'payment',
      content: `Payment received — ₹${body.amount.toLocaleString('en-IN')} (${body.type})`,
    }
  })

  // Auto-update deal advance/balance flags
  if (body.type === 'advance') {
    await prisma.deal.update({
      where: { id: body.dealId },
      data: { advanceReceived: true, advanceDate: new Date(body.date) }
    })
  } else if (body.type === 'balance') {
    await prisma.deal.update({
      where: { id: body.dealId },
      data: { balancePaid: true, balanceDate: new Date(body.date) }
    })
  }

  return NextResponse.json(payment)
}
