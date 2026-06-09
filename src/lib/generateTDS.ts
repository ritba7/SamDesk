import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function generateTDS(deal: any) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width

  // ── HEADER ──
  // Blue bar at top
  doc.setFillColor(0, 82, 165)
  doc.rect(0, 0, pageWidth, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('SAM PRODUCTS Pvt. Ltd.', 14, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('B-137, Noida Rd, B Block, Sector 6, Noida, 201301, U.P., INDIA', 14, 19)
  doc.text('Ph: 9810065139 | samproducts1992@gmail.com | www.samproducts.net', 14, 25)
  // GSTIN right side
  doc.text('GSTIN: 09AAKCS6327D1Z8', pageWidth - 14, 19, { align: 'right' })
  doc.text('CIN: U51101UP2007PTC055433', pageWidth - 14, 25, { align: 'right' })

  // ── DOCUMENT TITLE ──
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('TECHNICAL DATA SHEET', pageWidth / 2, 40, { align: 'center' })

  // Underline
  doc.setDrawColor(0, 82, 165)
  doc.setLineWidth(0.5)
  doc.line(14, 43, pageWidth - 14, 43)

  // ── TDS META ──
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  const tdsNumber = `SPPL/TDS/${deal.dealNumber || 'XXXX'}`
  const tdsDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  doc.text(`TDS No: ${tdsNumber}`, 14, 50)
  doc.text(`Date: ${tdsDate}`, pageWidth - 14, 50, { align: 'right' })

  // ── CUSTOMER ──
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Customer:', 14, 60)
  doc.setFont('helvetica', 'normal')
  doc.text(deal.customerCompany || deal.customerName || '-', 40, 60)
  if (deal.customerAddress) {
    const addrLines = doc.splitTextToSize(deal.customerAddress, 120)
    doc.text(addrLines, 40, 66)
  }

  // ── PRODUCT TITLE ──
  doc.setFillColor(0, 82, 165)
  doc.rect(14, 75, pageWidth - 28, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('AIR SHOWER — TECHNICAL SPECIFICATIONS', pageWidth / 2, 80.5, { align: 'center' })

  // ── SPECS TABLE ──
  const material = deal.material || '-'
  const motor = [deal.motorType, deal.motorBrand, deal.motorBrandOther].filter(Boolean).join(' - ') || '-'
  const outerSize = (deal.outerWidth && deal.outerHeight && deal.outerDepth)
    ? `${deal.outerWidth} W × ${deal.outerHeight} H × ${deal.outerDepth} D mm`
    : '-'
  const innerSize = (deal.innerWidth && deal.innerHeight && deal.innerDepth)
    ? `${deal.innerWidth} W × ${deal.innerHeight} H × ${deal.innerDepth} D mm`
    : '-'

  autoTable(doc, {
    startY: 84,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: { fillColor: [0, 82, 165], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [240, 246, 255] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { cellWidth: 'auto' } },
    head: [['PARAMETER', 'SPECIFICATION']],
    body: [
      ['Product', 'Air Shower'],
      ['Model No.', deal.dealNumber ? `S-${deal.dealNumber}` : '-'],
      ['Outer Dimensions (O.D.)', outerSize],
      ['Inner Dimensions (I.D.)', innerSize],
      ['Material of Construction', material.toUpperCase()],
      ['Cabinet Finish', material.toLowerCase().includes('ss') ? 'Hairline / Mirror Polish (SS)' : 'Powder Coated (RAL 9010)'],
      ['Motor', motor],
      ['Motor Standard', deal.motorType === 'ie3' ? 'IE3 (Premium Efficiency)' : 'IE2 (High Efficiency)'],
      ['Air Velocity', 'Min. 20 m/s at nozzle'],
      ['Shower Time', '15–30 seconds (adjustable)'],
      ['Door Type', 'Interlocked, Single / Double Leaf'],
      ['High Speed Door', 'Yes'],
      ['Electrical Supply', '3 Phase, 415V ± 10%, 50 Hz'],
      ['Control Panel', 'PLC / Microprocessor Based'],
      ['Warranty', '12 Months from date of supply'],
      ['Installation', deal.installationType === 'none' ? 'Not included' : deal.installationType === 'online' ? 'Online assistance' : 'On-site by SAM Products engineer'],
      ['Freight', deal.freightPaidBy === 'company' ? 'SAM Products scope' : 'Customer scope'],
      ['Dispatch', `${deal.expectedDispatch ? new Date(deal.expectedDispatch).toLocaleDateString('en-IN') : 'TBD'}`],
    ]
  })

  const finalY = (doc as any).lastAutoTable.finalY + 8

  // ── NOTES ──
  if (deal.specNotes) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Special Notes:', 14, finalY)
    doc.setFont('helvetica', 'normal')
    const noteLines = doc.splitTextToSize(deal.specNotes, pageWidth - 28)
    doc.text(noteLines, 14, finalY + 5)
  }

  // ── PHOTO PLACEHOLDERS ──
  const photoY = finalY + (deal.specNotes ? 20 : 5)
  doc.setDrawColor(180, 180, 180)
  doc.setFillColor(245, 245, 245)
  doc.rect(14, photoY, 80, 50, 'FD')
  doc.rect(112, photoY, 80, 50, 'FD')
  doc.setTextColor(150, 150, 150)
  doc.setFontSize(9)
  doc.text('Layout Drawing', 54, photoY + 27, { align: 'center' })
  doc.text('(Attach)', 54, photoY + 33, { align: 'center' })
  doc.text('Reference Photo', 152, photoY + 27, { align: 'center' })
  doc.text('(Attach)', 152, photoY + 33, { align: 'center' })

  // ── FOOTER ──
  const footerY = photoY + 60
  doc.setDrawColor(0, 82, 165)
  doc.line(14, footerY, pageWidth - 14, footerY)
  doc.setTextColor(80, 80, 80)
  doc.setFontSize(8)
  doc.text('This TDS does not constitute a price quotation. Prices will be communicated separately.', pageWidth / 2, footerY + 5, { align: 'center' })
  doc.text('Design parameters subject to change without prior notice. | SAM PRODUCTS Pvt. Ltd. | SINCE 1992', pageWidth / 2, footerY + 10, { align: 'center' })

  // For Approval section
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('Customer Approval:', 14, footerY + 22)
  doc.setFont('helvetica', 'normal')
  doc.text('Name: ________________________   Signature: ________________________   Date: ____________', 14, footerY + 30)

  doc.save(`TDS_${deal.dealNumber || 'draft'}_${deal.customerName || 'customer'}.pdf`)
}
