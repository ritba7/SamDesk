import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const body = await req.json()
  const stage = await prisma.productionStage.update({
    where: { id: params.id },
    data: {
      ...body,
      ...(body.status === 'in_progress' && !body.actualStart ? { actualStart: new Date() } : {}),
      ...(body.status === 'completed' && !body.actualEnd ? { actualEnd: new Date() } : {}),
    }
  })

  // Log activity
  await prisma.activity.create({
    data: {
      dealId: stage.dealId,
      userId: user.id,
      type: 'task',
      content: `Production stage "${stage.stageName}" ${body.status ? `status → ${body.status}` : ''}${body.plannedEnd ? ` — deadline changed to ${new Date(body.plannedEnd).toLocaleDateString('en-IN')}` : ''}`,
    }
  })

  return NextResponse.json(stage)
}
