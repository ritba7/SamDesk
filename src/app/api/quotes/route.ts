import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  const body = await req.json()

  // Get next version number
  const lastQuote = await prisma.quote.findFirst({
    where: { dealId: body.dealId },
    orderBy: { version: 'desc' }
  })
  const version = (lastQuote?.version || 0) + 1

  const quote = await prisma.quote.create({
    data: { ...body, version, createdById: user.id }
  })

  // Log activity
  await prisma.activity.create({
    data: {
      dealId: body.dealId,
      userId: user.id,
      type: 'document',
      content: `Quote v${version} created — ₹${body.amount.toLocaleString('en-IN')}`,
    }
  })

  // Update deal quoted amount
  await prisma.deal.update({
    where: { id: body.dealId },
    data: { quotedAmount: body.amount }
  })

  return NextResponse.json(quote)
}
