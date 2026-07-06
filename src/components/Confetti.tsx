'use client'
import { useEffect, useState } from 'react'

const COLORS = ['#f44336', '#e91e63', '#9c27b0', '#3f51b5', '#2196f3', '#00bcd4', '#4caf50', '#ffeb3b', '#ff9800', '#ff5722']

let stylesInjected = false
function injectStyles() {
  if (stylesInjected || typeof document === 'undefined') return
  stylesInjected = true
  const style = document.createElement('style')
  style.textContent = `
@keyframes sam-confetti-fall {
  0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
}`
  document.head.appendChild(style)
}

export default function Confetti({ duration = 3000, onDone }: { duration?: number; onDone?: () => void }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    injectStyles()
    const t = setTimeout(() => { setVisible(false); onDone?.() }, duration)
    return () => clearTimeout(t)
  }, [duration, onDone])

  if (!visible) return null

  const pieces = Array.from({ length: 40 })

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100, overflow: 'hidden' }}>
      {pieces.map((_, i) => {
        const left = Math.random() * 100
        const delay = Math.random() * 0.6
        const dur = 2 + Math.random() * 1.5
        const size = 6 + Math.random() * 8
        const color = COLORS[i % COLORS.length]
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              left: `${left}%`,
              width: size,
              height: size * 0.6,
              backgroundColor: color,
              borderRadius: 2,
              animation: `sam-confetti-fall ${dur}s linear ${delay}s forwards`,
            }}
          />
        )
      })}
    </div>
  )
}
