import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  if (!['manufacturing', 'director', 'vp'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { dealId, items, notes } = body
  if (!dealId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'dealId and items required' }, { status: 400 })
  }

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { workOrders: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const woNumber = deal.workOrders?.[0]?.woNumber || null
  const cleanItems = items
    .filter((it: any) => it && (it.item || it.spec || it.qty))
    .map((it: any) => ({ item: String(it.item || ''), spec: String(it.spec || ''), qty: String(it.qty || '') }))

  const created = await prisma.materialRequest.create({
    data: {
      dealId,
      woNumber,
      items: JSON.stringify(cleanItems),
      notes: notes || null,
      createdById: user.id,
    },
  })

  const summary = cleanItems.map(it => `${it.item} — ${it.spec} × ${it.qty}`).join('; ')

  const accountsUser = await prisma.user.findFirst({ where: { role: 'accounts' } })
  if (accountsUser) {
    const due = new Date(); due.setDate(due.getDate() + 2)
    await prisma.task.create({
      data: {
        dealId,
        title: `Order materials before Assembly 1 — ${woNumber || deal.serialNumber || deal.dealNumber}`,
        description: summary,
        assignedToId: accountsUser.id,
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
      type: 'note',
      content: `Material request raised: ${summary}`,
    },
  })

  return NextResponse.json({ ...created, items: cleanItems })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  const { searchParams } = new URL(req.url)
  const dealId = searchParams.get('dealId')

  const where: any = {}
  if (dealId) where.dealId = dealId
  if (user.role === 'manufacturing') {
    where.createdById = user.id
  } else if (!['accounts', 'director', 'vp'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const requests = await prisma.materialRequest.findMany({
    where,
    include: { deal: { select: { serialNumber: true, workCode: true, customerCompany: true, dealNumber: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const parsed = requests.map(r => {
    let items: any[] = []
    try { items = JSON.parse(r.items) } catch { items = [] }
    return { ...r, items }
  })

  return NextResponse.json(parsed)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  if (!['accounts', 'director'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, status } = await req.json()
  if (!id || !['pending', 'ordered', 'received'].includes(status)) {
    return NextResponse.json({ error: 'id and valid status required' }, { status: 400 })
  }

  const updated = await prisma.materialRequest.update({ where: { id }, data: { status } })

  await prisma.activity.create({
    data: {
      dealId: updated.dealId,
      userId: user.id,
      type: 'note',
      content: `Material request marked ${status}`,
    },
  })

  let items: any[] = []
  try { items = JSON.parse(updated.items) } catch { items = [] }
  return NextResponse.json({ ...updated, items })
}
