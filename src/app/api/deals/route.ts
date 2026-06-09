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

  const deal = await prisma.deal.create({
    data: {
      ...body,
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
