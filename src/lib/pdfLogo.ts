import jsPDF from 'jspdf'

// Draws the SAM PRODUCTS wordmark logo on a jsPDF document.
// x,y = top-left anchor (mm). color = RGB for the text (e.g. white on a blue band,
// or navy on white). Renders "Sam" in a serif face + "Products Pvt. Ltd." beneath,
// with a small wave flourish — a close match to the SAM Products logo.
// The signature is unchanged so existing callers (Work Order, white-on-blue) keep working.
export function drawSamLogo(doc: jsPDF, x: number, y: number, color: [number, number, number]) {
  const prevSize = doc.getFontSize()

  doc.setTextColor(...color)

  // "Sam" — serif, bold italic for the script-like feel
  doc.setFont('times', 'bolditalic')
  doc.setFontSize(26)
  doc.text('Sam', x, y + 7.4)
  const samW = doc.getTextWidth('Sam')

  // "PRODUCTS PVT. LTD." — spaced small caps beneath, tracked out to the width of "Sam"
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.4)
  doc.text('P R O D U C T S   P V T .   L T D .', x + 0.6, y + 12)

  // wave flourish to the right of "Sam" — two smooth crests
  doc.setDrawColor(...color)
  doc.setLineWidth(0.6)
  const wx = x + samW + 2.6
  const wy = y + 4.2
  doc.lines(
    [[2, -2], [2, 2], [2, -2], [2, 2]],
    wx, wy, [1, 1], 'S', false
  )

  // restore font size for the caller
  doc.setFontSize(prevSize)
}
