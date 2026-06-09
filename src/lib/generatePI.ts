import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const BLUE: [number, number, number] = [0, 112, 192]
const WHITE: [number, number, number] = [255, 255, 255]
const LIGHT_GRAY: [number, number, number] = [245, 245, 245]
const RED: [number, number, number] = [255, 0, 0]

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function convert(n: number): string {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '')
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
  }

  const intPart = Math.floor(num)
  const decPart = Math.round((num - intPart) * 100)
  let result = convert(intPart) + ' Rupees'
  if (decPart > 0) result += ' and ' + convert(decPart) + ' Paise'
  result += ' Only'
  return result
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmt(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function generatePI(deal: any, piNumber?: string): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 14
  const contentW = pageW - 2 * margin
  let y = 10

  const today = new Date()
  const fy = today.getMonth() >= 3
    ? `${today.getFullYear()}-${String(today.getFullYear() + 1).slice(2)}`
    : `${today.getFullYear() - 1}-${String(today.getFullYear()).slice(2)}`
  const piNum = piNumber || `SPPL/PI/${fy}/0001`

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
  doc.text('PROFORMA INVOICE', pageW / 2, y + 5.5, { align: 'center' })
  y += 12

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`PI No: ${piNum}`, margin, y)
  doc.text(`Date: ${formatDate(today)}`, pageW - margin, y, { align: 'right' })
  y += 8

  const halfW = (contentW - 4) / 2
  doc.setFillColor(235, 245, 255)
  doc.rect(margin, y, halfW, 28, 'F')
  doc.rect(margin + halfW + 4, y, halfW, 28, 'F')
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text('BILL TO:', margin + 2, y + 5)
  doc.text('SHIP TO:', margin + halfW + 6, y + 5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(8.5)
  doc.text(deal.customerCompany || deal.customerName || '', margin + 2, y + 10)
  doc.text(deal.customerCompany || deal.customerName || '', margin + halfW + 6, y + 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  if (deal.customerAddress) {
    const addrLines = doc.splitTextToSize(deal.customerAddress, halfW - 4)
    doc.text(addrLines.slice(0, 3), margin + 2, y + 15)
    doc.text(addrLines.slice(0, 3), margin + halfW + 6, y + 15)
  }
  if (deal.customerState) {
    doc.text(`State: ${deal.customerState}`, margin + 2, y + 25)
    doc.text(`State: ${deal.customerState}`, margin + halfW + 6, y + 25)
  }
  y += 32

  const isSameState = deal.customerState === 'Uttar Pradesh'
  const basicPrice = deal.quotedAmount || 0
  const gstRate = 0.18
  const outerDims = (deal.outerWidth && deal.outerHeight && deal.outerDepth) ? `${deal.outerWidth} x ${deal.outerHeight} x ${deal.outerDepth} mm` : ''
  const innerDims = (deal.innerWidth && deal.innerHeight && deal.innerDepth) ? `${deal.innerWidth} x ${deal.innerHeight} x ${deal.innerDepth} mm` : ''
  const motorBrand = deal.motorBrand === 'other' ? deal.motorBrandOther : deal.motorBrand
  const motorStr = deal.motorType && motorBrand ? `${deal.motorType.toUpperCase()} - ${motorBrand}` : ''
  const itemDesc = ['Air Shower', deal.dealNumber ? `Model: ${deal.dealNumber}` : '', outerDims ? `Size (OD): ${outerDims}` : '', innerDims ? `Size (ID): ${innerDims}` : '', deal.material ? `Material: ${deal.material.toUpperCase()}` : '', motorStr ? `Motor: ${motorStr}` : ''].filter(Boolean).join('\n')
  const gstAmount = basicPrice * gstRate
  const totalWithGst = basicPrice + gstAmount

  const itemRows: any[] = [
    ['1', itemDesc, '84145930', '1', fmt(basicPrice), fmt(basicPrice)],
    [{ content: 'SUB TOTAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: fmt(basicPrice), styles: { fontStyle: 'bold' } }],
  ]
  if (isSameState) {
    itemRows.push(
      [{ content: 'CGST @ 9%', colSpan: 5, styles: { halign: 'right' } }, { content: fmt(gstAmount / 2) }],
      [{ content: 'SGST @ 9%', colSpan: 5, styles: { halign: 'right' } }, { content: fmt(gstAmount / 2) }],
    )
  } else {
    itemRows.push([{ content: 'IGST @ 18%', colSpan: 5, styles: { halign: 'right' } }, { content: fmt(gstAmount) }])
  }
  itemRows.push([{ content: 'GRAND TOTAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', textColor: RED } }, { content: fmt(totalWithGst), styles: { fontStyle: 'bold', textColor: RED } }])

  autoTable(doc, {
    startY: y,
    head: [['Sl#', 'Description', 'HSN Code', 'Qty', 'Rate (INR)', 'Amount (INR)']],
    body: itemRows,
    theme: 'grid',
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 72 }, 2: { cellWidth: 22 }, 3: { cellWidth: 12 }, 4: { cellWidth: 28 }, 5: { cellWidth: 28 } },
    margin: { left: margin, right: margin },
  })

  y = (doc as any).lastAutoTable.finalY + 5
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Amount in Words: ', margin, y)
  doc.setFont('helvetica', 'normal')
  const words = numberToWords(Math.round(totalWithGst))
  const wordLines = doc.splitTextToSize(words, contentW - 35)
  doc.text(wordLines, margin + 35, y)
  y += wordLines.length * 5 + 5

  doc.setFillColor(...LIGHT_GRAY)
  doc.rect(margin, y, contentW, 6, 'F')
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.text('PAYMENT TERMS', margin + 2, y + 4.5)
  y += 9
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('50% advance with Purchase Order + Balance before dispatch.', margin + 2, y)
  y += 10

  doc.setFillColor(...LIGHT_GRAY)
  doc.rect(margin, y, contentW, 6, 'F')
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.text('BANK DETAILS', margin + 2, y + 4.5)
  y += 9
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('[Bank Name, Account Number, IFSC Code — To be filled]', margin + 2, y)
  y += 10

  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(100, 100, 100)
  doc.text('This is a Computer Generated Document.', pageW / 2, y, { align: 'center' })
  y += 6
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('For SAM PRODUCTS Pvt Ltd', pageW - margin, y, { align: 'right' })
  y += 8
  doc.setFont('helvetica', 'normal')
  doc.text('Authorised Signatory', pageW - margin, y, { align: 'right' })

  const safeName = (deal.customerCompany || deal.customerName || 'Customer').replace(/[^a-zA-Z0-9 ]/g, '')
  doc.save(`PI_${piNum.replace(/\//g, '_')}_${safeName}.pdf`)
}
