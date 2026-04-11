/**
 * Funzioni di disegno dei caratteri tratteggiati
 * Disegna numeri (0-9) e lettere (A-Z) come linee tratteggiate guida
 * Porting delle funzioni canvas dal vecchio Assistivetech
 */

export function drawSimpleDashedChar(
  ctx: CanvasRenderingContext2D,
  char: string,
  size: number
): void {
  const padding = size * 0.15
  const w = size - padding * 2
  const h = size - padding * 2
  const cx = size / 2
  const cy = size / 2
  const left = padding
  const right = size - padding
  const top = padding
  const bottom = size - padding

  // Stile tratteggiato verde
  ctx.setLineDash([8, 6])
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#4CAF50'
  ctx.lineWidth = Math.max(2, size / 50)

  ctx.beginPath()

  const c = char.toUpperCase()

  switch (c) {
    case '0':
      ctx.ellipse(cx, cy, w / 2.5, h / 2.2, 0, 0, Math.PI * 2)
      break
    case '1':
      ctx.moveTo(cx - w * 0.15, top + h * 0.15)
      ctx.lineTo(cx, top)
      ctx.lineTo(cx, bottom)
      break
    case '2':
      ctx.arc(cx, top + h * 0.25, w / 3, Math.PI * 1.3, 0)
      ctx.lineTo(left, bottom)
      ctx.lineTo(right, bottom)
      break
    case '3':
      ctx.arc(cx, top + h * 0.28, w / 3.2, Math.PI * 1.2, Math.PI * 0.3)
      ctx.moveTo(cx, cy)
      ctx.arc(cx, bottom - h * 0.28, w / 3.2, -Math.PI * 0.3, Math.PI * 0.8)
      break
    case '4':
      ctx.moveTo(right - w * 0.1, top)
      ctx.lineTo(left, cy + h * 0.1)
      ctx.lineTo(right, cy + h * 0.1)
      ctx.moveTo(right - w * 0.2, top)
      ctx.lineTo(right - w * 0.2, bottom)
      break
    case '5':
      ctx.moveTo(right - w * 0.1, top)
      ctx.lineTo(left + w * 0.1, top)
      ctx.lineTo(left + w * 0.1, cy - h * 0.05)
      ctx.arc(cx, cy + h * 0.1, w / 3, -Math.PI * 0.5, Math.PI * 0.7)
      break
    case '6':
      ctx.arc(cx, cy + h * 0.15, w / 3, 0, Math.PI * 2)
      ctx.moveTo(left + w * 0.15, cy + h * 0.1)
      ctx.quadraticCurveTo(left + w * 0.1, top, cx + w * 0.2, top)
      break
    case '7':
      ctx.moveTo(left, top)
      ctx.lineTo(right, top)
      ctx.lineTo(cx - w * 0.1, bottom)
      break
    case '8':
      ctx.ellipse(cx, top + h * 0.28, w / 3.5, h / 4.5, 0, 0, Math.PI * 2)
      ctx.moveTo(cx + w / 3, cy)
      ctx.ellipse(cx, bottom - h * 0.28, w / 3, h / 4, 0, 0, Math.PI * 2)
      break
    case '9':
      ctx.arc(cx, cy - h * 0.15, w / 3, 0, Math.PI * 2)
      ctx.moveTo(right - w * 0.15, cy - h * 0.1)
      ctx.quadraticCurveTo(right - w * 0.1, bottom, cx - w * 0.2, bottom)
      break
    case 'A':
      ctx.moveTo(left, bottom)
      ctx.lineTo(cx, top)
      ctx.lineTo(right, bottom)
      ctx.moveTo(left + w * 0.22, cy + h * 0.1)
      ctx.lineTo(right - w * 0.22, cy + h * 0.1)
      break
    case 'B':
      ctx.moveTo(left + w * 0.1, bottom)
      ctx.lineTo(left + w * 0.1, top)
      ctx.lineTo(cx + w * 0.15, top)
      ctx.arc(cx + w * 0.1, top + h * 0.22, h * 0.2, -Math.PI * 0.5, Math.PI * 0.5)
      ctx.lineTo(left + w * 0.1, cy)
      ctx.lineTo(cx + w * 0.2, cy)
      ctx.arc(cx + w * 0.15, cy + h * 0.22, h * 0.23, -Math.PI * 0.5, Math.PI * 0.5)
      ctx.lineTo(left + w * 0.1, bottom)
      break
    case 'C':
      ctx.arc(cx, cy, w / 2.5, -Math.PI * 0.3, Math.PI * 0.3, true)
      break
    case 'D':
      ctx.moveTo(left + w * 0.15, bottom)
      ctx.lineTo(left + w * 0.15, top)
      ctx.lineTo(cx, top)
      ctx.arc(cx, cy, h / 2.2, -Math.PI * 0.5, Math.PI * 0.5)
      ctx.lineTo(left + w * 0.15, bottom)
      break
    case 'E':
      ctx.moveTo(right - w * 0.1, top)
      ctx.lineTo(left + w * 0.15, top)
      ctx.lineTo(left + w * 0.15, bottom)
      ctx.lineTo(right - w * 0.1, bottom)
      ctx.moveTo(left + w * 0.15, cy)
      ctx.lineTo(right - w * 0.2, cy)
      break
    case 'F':
      ctx.moveTo(right - w * 0.1, top)
      ctx.lineTo(left + w * 0.15, top)
      ctx.lineTo(left + w * 0.15, bottom)
      ctx.moveTo(left + w * 0.15, cy)
      ctx.lineTo(right - w * 0.2, cy)
      break
    case 'G':
      ctx.arc(cx, cy, w / 2.5, -Math.PI * 0.3, Math.PI * 0.3, true)
      ctx.lineTo(cx + w * 0.1, cy)
      ctx.lineTo(cx + w * 0.35, cy)
      break
    case 'H':
      ctx.moveTo(left + w * 0.15, top)
      ctx.lineTo(left + w * 0.15, bottom)
      ctx.moveTo(right - w * 0.15, top)
      ctx.lineTo(right - w * 0.15, bottom)
      ctx.moveTo(left + w * 0.15, cy)
      ctx.lineTo(right - w * 0.15, cy)
      break
    case 'I':
      ctx.moveTo(cx, top)
      ctx.lineTo(cx, bottom)
      ctx.moveTo(left + w * 0.25, top)
      ctx.lineTo(right - w * 0.25, top)
      ctx.moveTo(left + w * 0.25, bottom)
      ctx.lineTo(right - w * 0.25, bottom)
      break
    case 'J':
      ctx.moveTo(left + w * 0.2, top)
      ctx.lineTo(right - w * 0.2, top)
      ctx.moveTo(cx + w * 0.1, top)
      ctx.lineTo(cx + w * 0.1, bottom - h * 0.2)
      ctx.arc(cx - w * 0.1, bottom - h * 0.2, w * 0.2, 0, Math.PI)
      break
    case 'K':
      ctx.moveTo(left + w * 0.15, top)
      ctx.lineTo(left + w * 0.15, bottom)
      ctx.moveTo(right - w * 0.1, top)
      ctx.lineTo(left + w * 0.15, cy)
      ctx.lineTo(right - w * 0.1, bottom)
      break
    case 'L':
      ctx.moveTo(left + w * 0.15, top)
      ctx.lineTo(left + w * 0.15, bottom)
      ctx.lineTo(right - w * 0.1, bottom)
      break
    case 'M':
      ctx.moveTo(left, bottom)
      ctx.lineTo(left, top)
      ctx.lineTo(cx, cy)
      ctx.lineTo(right, top)
      ctx.lineTo(right, bottom)
      break
    case 'N':
      ctx.moveTo(left + w * 0.1, bottom)
      ctx.lineTo(left + w * 0.1, top)
      ctx.lineTo(right - w * 0.1, bottom)
      ctx.lineTo(right - w * 0.1, top)
      break
    case 'O':
      ctx.ellipse(cx, cy, w / 2.5, h / 2.2, 0, 0, Math.PI * 2)
      break
    case 'P':
      ctx.moveTo(left + w * 0.15, bottom)
      ctx.lineTo(left + w * 0.15, top)
      ctx.lineTo(cx + w * 0.1, top)
      ctx.arc(cx + w * 0.1, top + h * 0.25, h * 0.25, -Math.PI * 0.5, Math.PI * 0.5)
      ctx.lineTo(left + w * 0.15, cy + h * 0.05)
      break
    case 'Q':
      ctx.ellipse(cx, cy - h * 0.05, w / 2.5, h / 2.4, 0, 0, Math.PI * 2)
      ctx.moveTo(cx + w * 0.1, cy + h * 0.15)
      ctx.lineTo(right - w * 0.1, bottom)
      break
    case 'R':
      ctx.moveTo(left + w * 0.15, bottom)
      ctx.lineTo(left + w * 0.15, top)
      ctx.lineTo(cx + w * 0.1, top)
      ctx.arc(cx + w * 0.1, top + h * 0.22, h * 0.22, -Math.PI * 0.5, Math.PI * 0.5)
      ctx.lineTo(left + w * 0.15, cy)
      ctx.moveTo(cx, cy)
      ctx.lineTo(right - w * 0.1, bottom)
      break
    case 'S':
      ctx.arc(cx, top + h * 0.28, w / 3.2, Math.PI * 1.2, Math.PI * 0.1)
      ctx.arc(cx, bottom - h * 0.28, w / 3.2, -Math.PI * 0.9, Math.PI * 0.2)
      break
    case 'T':
      ctx.moveTo(left, top)
      ctx.lineTo(right, top)
      ctx.moveTo(cx, top)
      ctx.lineTo(cx, bottom)
      break
    case 'U':
      ctx.moveTo(left + w * 0.15, top)
      ctx.lineTo(left + w * 0.15, bottom - h * 0.3)
      ctx.arc(cx, bottom - h * 0.3, w * 0.35, Math.PI, 0)
      ctx.lineTo(right - w * 0.15, top)
      break
    case 'V':
      ctx.moveTo(left, top)
      ctx.lineTo(cx, bottom)
      ctx.lineTo(right, top)
      break
    case 'W':
      ctx.moveTo(left, top)
      ctx.lineTo(left + w * 0.2, bottom)
      ctx.lineTo(cx, cy)
      ctx.lineTo(right - w * 0.2, bottom)
      ctx.lineTo(right, top)
      break
    case 'X':
      ctx.moveTo(left, top)
      ctx.lineTo(right, bottom)
      ctx.moveTo(right, top)
      ctx.lineTo(left, bottom)
      break
    case 'Y':
      ctx.moveTo(left, top)
      ctx.lineTo(cx, cy)
      ctx.lineTo(right, top)
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx, bottom)
      break
    case 'Z':
      ctx.moveTo(left, top)
      ctx.lineTo(right, top)
      ctx.lineTo(left, bottom)
      ctx.lineTo(right, bottom)
      break
    default:
      ctx.font = `${size * 0.6}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#cccccc'
      ctx.fillText(char, cx, cy)
      return
  }

  ctx.stroke()
}
