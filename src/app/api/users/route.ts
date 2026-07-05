import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const where: any = {}
  if (user.role === 'sales') {
    // Sales must not see other sales users (colleague performance inference)
    where.OR = [
      { id: user.id },
      { role: { in: ['director', 'sales_director', 'accounts', 'vp', 'design', 'manufacturing'] } },
    ]
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true }
  })
  return NextResponse.json(users)
}
