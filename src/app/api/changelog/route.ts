import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET ?dealId= — returns the deal's ChangeLog rows (director & sales_director only)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  if (!['director', 'sales_director'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const dealId = searchParams.get('dealId')
  if (!dealId) return NextResponse.json({ error: 'dealId required' }, { status: 400 })

  const logs = await prisma.changeLog.findMany({
    where: { dealId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(logs)
}
