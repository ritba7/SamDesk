import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const BLUE: [number, number, number] = [0, 112, 192]
const YELLOW: [number, number, number] = [255, 192, 0]
const RED: [number, number, number] = [255, 0, 0]
const WHITE: [number, number, number] = [255, 255, 255]
const LIGHT_GRAY: [number, number, number] = [245, 245, 245]

function formatDDMMYY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(2)
  return `${dd}${mm}${yy}`
}

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function generateQuote(deal: any): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 14
  const contentW = pageW - 2 * margin
  let y = 10

  doc.setFillColor(...BLUE)
  doc.rect(0, 0, pageW, 22, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('SAM PRODUCTS Pvt Ltd', margin, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('SINCE 1992', margin, 18)
  doc.setFontSize(7.5)
  doc.text('B-137, Noida Rd, B Block, Sector 6, Noida, 201301, U.P., INDIA', pageW - margin, 8, { align: 'right' })
  doc.text('Ph: 9810065139  |  samproducts1992@gmail.com  |  samproducts25@gmail.com', pageW - margin, 13, { align: 'right' })
  doc.text('www.samproducts.net  |  GSTIN: 09AAKCS6327D1Z8  |  CIN: U51101UP2007PTC055433', pageW - margin, 18, { align: 'right' })

  y = 28
  doc.setFillColor(...LIGHT_GRAY)
  doc.rect(margin, y, contentW, 8, 'F')
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('QUOTATION', pageW / 2, y + 5.5, { align: 'center' })
  y += 12

  const today = new Date()
  const quoteNum = `SPPL/AS/${formatDDMMYY(today)}`
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text(`Date: ${formatDateDisplay(today)}`, margin, y)
  doc.text(`Quote No: ${quoteNum}`, pageW - margin, y, { align: 'right' })
  y += 8

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text('To,', margin, y)
  y += 5
  doc.setFontSize(10)
  doc.text(deal.customerCompany || deal.customerName || '', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(9)
  if (deal.customerAddress) {
    const lines = doc.splitTextToSize(deal.customerAddress, contentW * 0.6)
    doc.text(lines, margin, y)
    y += lines.length * 4.5
  }
  y += 4

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Dear Sir,', margin, y)
  y += 5
  doc.text('We are pleased to Quote as follows for your requirement of AIR SHOWERS.', margin, y)
  y += 8

  const motorBrand = deal.motorBrand === 'other' ? deal.motorBrandOther : deal.motorBrand
  const motorStr = deal.motorType && motorBrand ? `${deal.motorType.toUpperCase()} - ${motorBrand}` : deal.motorType || '—'
  const outerDims = (deal.outerWidth && deal.outerHeight && deal.outerDepth) ? `${deal.outerWidth} x ${deal.outerHeight} x ${deal.outerDepth} mm` : '—'
  const innerDims = (deal.innerWidth && deal.innerHeight && deal.innerDepth) ? `${deal.innerWidth} x ${deal.innerHeight} x ${deal.innerDepth} mm` : '—'
  const materialMap: Record<string, string> = { ms: 'MS (Mild Steel)', ss304: 'SS 304', ss202: 'SS 202', ms_ss304: 'MS + SS 304' }
  const materialStr = deal.material ? (materialMap[deal.material] || deal.material.toUpperCase()) : '—'
  const cabinetFinish = deal.material?.includes('ss') ? 'SS Finish' : 'Powder Coated'
  const elecSupply = deal.motorType === 'ie3' || deal.motorType === 'ie2' ? '3 Phase, 415V, 50Hz' : 'Single Phase, 230V, 50Hz'

  const specRows = [
    ['Model', deal.dealNumber || '—'],
    ['Size (OD)', outerDims],
    ['Size (ID)', innerDims],
    ['Material', materialStr],
    ['Motor Type', motorStr],
    ['No. of Nozzles', '—'],
    ['Air Shower Time', '15-30 Seconds (Adjustable)'],
    ['Cabinet Finish', cabinetFinish],
    ['Door Type', 'Single Leaf, Interlocked'],
    ['High Speed Door', 'No'],
    ['Electrical Supply', elecSupply],
    ['Warranty', '12 Months from date of supply'],
  ]
  if (deal.specNotes) specRows.push(['Notes', deal.specNotes])

  autoTable(doc, {
    startY: y,
    head: [['TECHNICAL SPECIFICATIONS', '']],
    body: specRows,
    theme: 'grid',
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 9, halign: 'center' },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 }, 1: { cellWidth: contentW - 55 } },
    margin: { left: margin, right: margin },
  })

  y = (doc as any).lastAutoTable.finalY + 6
  doc.setDrawColor(180, 180, 180)
  doc.setFillColor(245, 245, 245)
  doc.roundedRect(margin, y, (contentW - 4) / 2, 30, 2, 2, 'FD')
  doc.roundedRect(margin + (contentW - 4) / 2 + 4, y, (contentW - 4) / 2, 30, 2, 2, 'FD')
  doc.setTextColor(160, 160, 160)
  doc.setFontSize(8)
  doc.text('Product Photo 1', margin + (contentW - 4) / 4, y + 16, { align: 'center' })
  doc.text('Product Photo 2', margin + (contentW - 4) / 2 + 4 + (contentW - 4) / 4, y + 16, { align: 'center' })
  y += 36

  const basicPrice = deal.quotedAmount || 0
  const gstAmount = basicPrice * 0.18
  const totalWithGst = basicPrice + gstAmount
  const fmt = (n: number) => n > 0 ? `₹ ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

  autoTable(doc, {
    startY: y,
    head: [['Sl No', 'Model # Size', 'Basic Price (INR)', 'Qty', 'Price', 'Disc %', 'Price (After Disc)', 'Remarks']],
    body: [
      ['1', `${deal.dealNumber || '—'}\n${outerDims}`, fmt(basicPrice), '1', fmt(basicPrice), '0%', fmt(basicPrice), ''],
      [{ content: 'TOTAL', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } }, { content: fmt(basicPrice), colSpan: 4, styles: { fontStyle: 'bold' } }],
      [{ content: 'ADD GST (@18%) HSN CODE 84145930', colSpan: 4, styles: { halign: 'right' } }, { content: fmt(gstAmount), colSpan: 4 }],
      [{ content: 'TOTAL (with GST)', colSpan: 4, styles: { fontStyle: 'bold', textColor: RED, halign: 'right' } }, { content: fmt(totalWithGst), colSpan: 4, styles: { fontStyle: 'bold', textColor: RED } }],
    ],
    theme: 'grid',
    headStyles: { fillColor: YELLOW, textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 40 }, 2: { cellWidth: 25 }, 3: { cellWidth: 10 }, 4: { cellWidth: 22 }, 5: { cellWidth: 13 }, 6: { cellWidth: 28 } },
    margin: { left: margin, right: margin },
  })

  y = (doc as any).lastAutoTable.finalY + 6
  const optionalItems = [
    ['1', 'Sensor (Single Leaf)', '1', '—', '—', '85122090', '18%', ''],
    ['2', 'Sensor (Double Leaf)', '1', '—', '—', '85122090', '18%', ''],
    ['3', 'HEPA Filter', '1', '—', '—', '84213990', '18%', ''],
    ['4', 'Heater', '1', '—', '—', '85162000', '18%', ''],
    ['5', 'Wood Pack / Export Pack', '1', '—', '—', '44152000', '18%', ''],
    ['6', 'Micro Switch', '1', '—', '—', '85369090', '18%', ''],
  ]
  autoTable(doc, {
    startY: y,
    head: [['SI#', 'Item', 'Qty', 'Basic Price (INR)', 'Amount', 'HSN CODE', 'GST', 'Remarks']],
    body: optionalItems,
    theme: 'grid',
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 10 } },
    margin: { left: margin, right: margin },
  })

  y = (doc as any).lastAutoTable.finalY + 6
  const freightScope = deal.freightPaidBy === 'customer' ? 'Customer Scope' : 'SAM Products Scope'
  const installScope = deal.installationType === 'customer' ? 'Customer Scope' : 'SAM Products Scope'
  autoTable(doc, {
    startY: y,
    head: [['', 'COMMERCIALS', 'MODEL: AIR SHOWER']],
    body: [
      ['I', 'DISPATCH', '7-10 WORKING DAYS FROM RECEIPT OF PURCHASE ORDER & ADVANCE PAYMENT'],
      ['II', 'INSTALLATION', installScope],
      ['III', 'FREIGHT', freightScope],
      ['IV', 'OTHERS', 'ANNEXURE AS ATTACHED'],
      ['V', 'WARRANTY', '12 MONTHS FROM DATE OF SUPPLY'],
      ['VI', 'VALIDITY', '20 DAYS FROM THIS DAY OF QUOTE'],
    ],
    theme: 'grid',
    headStyles: { fillColor: YELLOW, textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 35 } },
    margin: { left: margin, right: margin },
  })

  y = (doc as any).lastAutoTable.finalY + 8
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(60, 60, 60)
  doc.text('We look forward for your early confirmation.', margin, y)
  y += 5
  doc.text('Warm Regards,', margin, y)
  y += 5
  doc.setFont('helvetica', 'bold')
  doc.text('Authorised Signatory', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.text('SAM PRODUCTS Pvt Ltd', margin, y)

  const fileName = `Quote_${quoteNum.replace(/\//g, '_')}_${deal.customerCompany || deal.customerName || 'Customer'}.pdf`
  doc.save(fileName)
}
