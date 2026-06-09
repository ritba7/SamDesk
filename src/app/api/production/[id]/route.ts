import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const stage = await prisma.productionStage.update({
    where: { id: params.id },
    data: {
      ...body,
      ...(body.status === 'in_progress' && !body.actualStart ? { actualStart: new Date() } : {}),
      ...(body.status === 'completed' && !body.actualEnd ? { actualEnd: new Date() } : {}),
    }
  })

  return NextResponse.json(stage)
}
