import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const dealId = searchParams.get('dealId')
  if (!dealId) return NextResponse.json({ error: 'dealId required' }, { status: 400 })

  const checklist = await prisma.inspectionChecklist.findUnique({ where: { dealId } })
  if (!checklist) return NextResponse.json(null)

  let data: any = {}
  try { data = JSON.parse(checklist.data) } catch { data = {} }
  return NextResponse.json({ ...checklist, data })
}

async function upsert(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  if (!['manufacturing', 'vp', 'director'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { dealId, data } = await req.json()
  if (!dealId) return NextResponse.json({ error: 'dealId required' }, { status: 400 })

  const payload = JSON.stringify(data || {})
  const checklist = await prisma.inspectionChecklist.upsert({
    where: { dealId },
    create: { dealId, data: payload },
    update: { data: payload },
  })

  let parsed: any = {}
  try { parsed = JSON.parse(checklist.data) } catch { parsed = {} }
  return NextResponse.json({ ...checklist, data: parsed })
}

export async function POST(req: NextRequest) { return upsert(req) }
export async function PUT(req: NextRequest) { return upsert(req) }

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  const { dealId, action } = await req.json()
  if (!dealId || !action) return NextResponse.json({ error: 'dealId and action required' }, { status: 400 })

  const existing = await prisma.inspectionChecklist.findUnique({ where: { dealId } })
  if (!existing) return NextResponse.json({ error: 'Checklist not found — save it first' }, { status: 404 })

  const data: any = {}
  if (action === 'approve_mfg') {
    if (!['manufacturing', 'director'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    data.mfgApproved = true
    data.mfgApprovedAt = new Date()
  } else if (action === 'approve_vp') {
    if (!['vp', 'director'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    data.vpApproved = true
    data.vpApprovedAt = new Date()
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const updated = await prisma.inspectionChecklist.update({ where: { dealId }, data })

  const bothApproved = updated.mfgApproved && updated.vpApproved
  const wasBoth = existing.mfgApproved && existing.vpApproved
  if (bothApproved && !wasBoth) {
    const deal = await prisma.deal.findUnique({ where: { id: dealId } })
    const serial = deal?.serialNumber || deal?.dealNumber || ''
    // mark internal_inspection stage completed
    const stage = await prisma.productionStage.findFirst({ where: { dealId, stageName: 'internal_inspection' } })
    if (stage) {
      await prisma.productionStage.update({
        where: { id: stage.id },
        data: { status: 'completed', actualEnd: new Date() },
      })
    }
    await prisma.activity.create({
      data: { dealId, userId: user.id, type: 'note', content: 'Internal inspection approved by MFG & VP', highlighted: true },
    })
    const salesUser = deal?.assignedToId
      ? await prisma.user.findUnique({ where: { id: deal.assignedToId } })
      : await prisma.user.findFirst({ where: { role: 'sales' } })
    if (salesUser) {
      await prisma.task.create({
        data: {
          dealId,
          title: `Send production photos to customer if required — ${serial}`,
          assignedToId: salesUser.id,
          createdById: user.id,
          type: 'other',
        },
      })
    }
  }

  let parsed: any = {}
  try { parsed = JSON.parse(updated.data) } catch { parsed = {} }
  return NextResponse.json({ ...updated, data: parsed })
}
