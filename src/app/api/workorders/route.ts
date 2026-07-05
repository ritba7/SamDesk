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
