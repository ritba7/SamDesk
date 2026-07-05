import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  const body = await req.json()
  const activity = await prisma.activity.create({
    data: { ...body, userId: user.id }
  })
  return NextResponse.json(activity)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, highlighted } = await req.json()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  const activity = await prisma.activity.update({
    where: { id },
    data: { highlighted: !!highlighted },
  })
  return NextResponse.json(activity)
}
