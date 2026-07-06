import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { WO_TEMPLATE, WoField } from './woTemplate'

const BLUE: [number, number, number] = [0, 112, 192]
const WHITE: [number, number, number] = [255, 255, 255]
const LIGHT_GRAY: [number, number, number] = [230, 230, 230]

function fieldValue(field: WoField, filled: Record<string, any>): string {
  const v = filled[field.key]
  if (v === undefined || v === null || v === '') return ''
  if (field.type === 'dims') {
    if (typeof v === 'object') {
      const w = v.w ?? ''
      const d = v.d ?? ''
      const h = v.h ?? ''
      if (w === '' && d === '' && h === '') return ''
      return `${w} × ${d} × ${h}`
    }
    return String(v)
  }
  if (field.type === 'multi') {
    if (Array.isArray(v)) return v.join(', ')
    return String(v)
  }
  return String(v)
}

export function generateWorkOrder(wo: any): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 12
  const contentW = pageW - 2 * margin

  let filled: Record<string, any> = {}
  try { filled = JSON.parse(wo.filledData || '{}') } catch { filled = {} }

  // Header
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, pageW, 24, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text('WORK ORDER — AIR SHOWER', margin, 10)
  doc.setFontSize(10)
  doc.text('SAM PRODUCTS PVT LTD', margin, 16)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('ISO 9001:2015', margin, 21)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`WO: ${wo.woNumber}`, pageW - margin, 12, { align: 'right' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  if (wo.deal?.customerCompany) doc.text(wo.deal.customerCompany, pageW - margin, 18, { align: 'right' })

  let y = 30

  for (const section of WO_TEMPLATE) {
    const rows = section.fields.map(f => [f.label, fieldValue(f, filled)])
    autoTable(doc, {
      startY: y,
      head: [[{ content: section.title, colSpan: 2 }]],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 7.5, textColor: [0, 0, 0] },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      columnStyles: { 0: { cellWidth: contentW * 0.45, fontStyle: 'bold' }, 1: { cellWidth: contentW * 0.55 } },
      margin: { left: margin, right: margin },
    })
    y = (doc as any).lastAutoTable.finalY + 4
  }

  doc.save(`WO_${String(wo.woNumber).replace(/\//g, '_')}.pdf`)
}
