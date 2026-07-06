import jsPDF from 'jspdf'

// Draws the SAM PRODUCTS wordmark logo on a jsPDF document.
// x,y = top-left anchor (mm). color = RGB for the text (e.g. white on a blue band,
// or navy on white). Renders "Sam" in a serif face + "Products Pvt. Ltd." beneath,
// with a small wave underline — a close match to the SAM Products logo.
export function drawSamLogo(doc: jsPDF, x: number, y: number, color: [number, number, number]) {
  doc.setTextColor(...color)
  // "Sam" — serif, bold italic for the script-like feel
  doc.setFont('times', 'bolditalic')
  doc.setFontSize(24)
  doc.text('Sam', x, y + 7)
  const samW = doc.getTextWidth('Sam')
  // "Products Pvt. Ltd." — small bold sans beneath
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('Products Pvt. Ltd.', x + 1, y + 12)
  // wave to the right of "Sam"
  doc.setDrawColor(...color)
  doc.setLineWidth(0.7)
  const wx = x + samW + 3
  const wy = y + 5
  doc.lines(
    [[3, -2.2], [3, 2.2], [3, -2.2], [3, 2.2]],
    wx, wy, [1, 1], 'S', false
  )
}
