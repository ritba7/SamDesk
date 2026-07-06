import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WO_ALL_FIELDS } from '@/lib/woTemplate'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  if (!['director', 'sales_director', 'vp', 'accounts', 'manufacturing'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const wo = await prisma.workOrder.findUnique({
    where: { id: params.id },
    include: {
      deal: true,
      pi: { select: { piNumber: true, poReference: true } },
    },
  })
  if (!wo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(wo)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  const role = user.role

  const wo = await prisma.workOrder.findUnique({ where: { id: params.id } })
  if (!wo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { filledData } = await req.json()
  if (!filledData || typeof filledData !== 'object') {
    return NextResponse.json({ error: 'filledData required' }, { status: 400 })
  }

  const canProduction = ['manufacturing', 'director'].includes(role)
  const canAccounts = ['accounts', 'director'].includes(role)
  if (!canProduction && !canAccounts) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Role-based key filtering
  const accountsKeys = new Set(WO_ALL_FIELDS.filter(f => f.filledBy === 'accounts').map(f => f.key))
  const allowed: Record<string, any> = {}
  for (const [key, value] of Object.entries(filledData)) {
    const isAccountsField = accountsKeys.has(key)
    if (role === 'director') {
      allowed[key] = value
    } else if (isAccountsField && canAccounts) {
      allowed[key] = value
    } else if (!isAccountsField && role === 'manufacturing') {
      allowed[key] = value
    }
  }

  let existing: Record<string, any> = {}
  try { existing = JSON.parse(wo.filledData || '{}') } catch { existing = {} }
  const merged = { ...existing, ...allowed }

  const updated = await prisma.workOrder.update({
    where: { id: params.id },
    data: { filledData: JSON.stringify(merged) },
  })

  await prisma.activity.create({
    data: {
      dealId: wo.dealId,
      userId: user.id,
      type: 'note',
      content: `Work Order ${wo.woNumber} details updated`,
    },
  })

  return NextResponse.json(updated)
}
