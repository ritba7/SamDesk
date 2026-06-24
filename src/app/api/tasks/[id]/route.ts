import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const body = await req.json()
  const task = await prisma.task.update({ where: { id: params.id }, data: body })

  // Log activity
  await prisma.activity.create({
    data: {
      dealId: task.dealId || undefined,
      userId: user.id,
      type: 'task',
      content: `Task "${task.title}" updated${body.status ? ` — marked ${body.status}` : ''}${body.dueDate ? ` — deadline changed to ${new Date(body.dueDate).toLocaleDateString('en-IN')}` : ''}`,
    }
  })

  return NextResponse.json(task)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.task.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
