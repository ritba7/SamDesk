import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

function flatten(row: any): any {
  const out: any = {}
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) { out[k] = ''; continue }
    if (v instanceof Date) { out[k] = v.toISOString() }
    else if (typeof v === 'object') { out[k] = JSON.stringify(v) }
    else { out[k] = v }
  }
  return out
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  if (user.role !== 'director') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [
    deals, contacts, activities, tasks, payments, expenses,
    proformaInvoices, workOrders, materialRequests, productionStages, inspectionChecklists,
  ] = await Promise.all([
    prisma.deal.findMany(),
    prisma.contactPerson.findMany(),
    prisma.activity.findMany(),
    prisma.task.findMany(),
    prisma.payment.findMany(),
    prisma.expense.findMany(),
    prisma.proformaInvoice.findMany(),
    prisma.workOrder.findMany(),
    prisma.materialRequest.findMany(),
    prisma.productionStage.findMany(),
    prisma.inspectionChecklist.findMany(),
  ])

  const wb = XLSX.utils.book_new()
  const addSheet = (name: string, rows: any[]) => {
    const data = rows.length > 0 ? rows.map(flatten) : [{ note: 'No records' }]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), name)
  }

  addSheet('Deals', deals)
  addSheet('Contacts', contacts)
  addSheet('Activities', activities)
  addSheet('Tasks', tasks)
  addSheet('Payments', payments)
  addSheet('Expenses', expenses)
  addSheet('ProformaInvoices', proformaInvoices)
  addSheet('WorkOrders', workOrders)
  addSheet('MaterialRequests', materialRequests)
  addSheet('ProductionStages', productionStages)
  addSheet('InspectionChecklists', inspectionChecklists)

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const dateStr = new Date().toISOString().slice(0, 10)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="SamDesk_Full_Export_${dateStr}.xlsx"`,
    },
  })
}
