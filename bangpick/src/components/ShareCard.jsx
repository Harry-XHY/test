// Canvas-based share card image generator

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

function drawRadar(ctx, x, y, r, dimensions, scores, maxPerDim, color) {
  const n = dimensions.length
  const angleStep = (Math.PI * 2) / n

  function polar(angle, radius) {
    const a = angle - Math.PI / 2
    return [x + radius * Math.cos(a), y + radius * Math.sin(a)]
  }

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 1
  for (const ring of [0.25, 0.5, 0.75, 1]) {
    ctx.beginPath()
    for (let i = 0; i <= n; i++) {
      const [px, py] = polar(i * angleStep, ring * r)
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.stroke()
  }

  // Data
  ctx.beginPath()
  dimensions.forEach((dim, i) => {
    const val = Math.min((scores[dim] || 0) / maxPerDim, 1)
    const [px, py] = polar(i * angleStep, val * r)
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  })
  ctx.closePath()
  ctx.fillStyle = color + '33'
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawPersonalityIcon(ctx, cx, cy, size, personality) {
  const r = size / 2
  const c = personality.color

  // Glow circle
  const glow = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r)
  glow.addColorStop(0, c + '66')
  glow.addColorStop(1, c + '00')
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = glow
  ctx.fill()

  // Border circle
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  ctx.fill()
  ctx.strokeStyle = c + '4D'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Emoji fallback (reliable cross-platform)
  ctx.font = `${size * 0.5}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.fillText(personality.emoji, cx, cy + 2)
}

export default function ShareCard({ personality, scores, dimensions, dimensionLabels, quizTitle, aiResult, onClose }) {
  const [imgSrc, setImgSrc] = useState(null)

  useEffect(() => { generate() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function generate() {
    const dpr = 2
    const w = 375
    const h = 600
    const canvas = document.createElement('canvas')
    canvas.width = w * dpr
    canvas.height = h * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#0f141a')
    grad.addColorStop(1, '#0a0e14')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Decorative circle
    ctx.beginPath()
    ctx.arc(w - 40, 80, 100, 0, Math.PI * 2)
    ctx.fillStyle = personality.color + '15'
    ctx.fill()

    // Quiz title
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '600 14px "PingFang SC", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(quizTitle, w / 2, 50)

    // Icon — render inline SVG via Image
    drawPersonalityIcon(ctx, w / 2, 100, 70, personality)

    // Personality name
    ctx.fillStyle = personality.color
    ctx.font = '900 28px "PingFang SC", sans-serif'
    ctx.fillText(personality.name, w / 2, 165)

    // Description
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '400 13px "PingFang SC", sans-serif'
    ctx.fillText(personality.desc, w / 2, 195)

    // Radar chart
    drawRadar(ctx, w / 2, 285, 60, dimensions, scores, 4, personality.color)

    // Dimension labels
    const n = dimensions.length
    const angleStep = (Math.PI * 2) / n
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '600 11px "PingFang SC", sans-serif'
    dimensions.forEach((dim, i) => {
      const a = i * angleStep - Math.PI / 2
      const lx = w / 2 + 80 * Math.cos(a)
      const ly = 285 + 80 * Math.sin(a)
      ctx.fillText(dimensionLabels[dim], lx, ly)
    })

    // AI result
    if (aiResult) {
      const cardY = 365
      // Card background
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      const cardW = w - 60
      const cardX = 30
      roundRect(ctx, cardX, cardY, cardW, 150, 16)
      ctx.fill()

      // Title
      ctx.fillStyle = '#fff'
      ctx.font = '700 15px "PingFang SC", sans-serif'
      ctx.textAlign = 'center'
      wrapText(ctx, aiResult.title || '', w / 2, cardY + 30, cardW - 30, 20)

      // Description (wrap text)
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '400 12px "PingFang SC", sans-serif'
      wrapText(ctx, aiResult.description || '', w / 2, cardY + 60, cardW - 30, 18)
    }

    // Watermark
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '600 12px "Inter", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('bangpick — 帮我选', w / 2, h - 30)

    setImgSrc(canvas.toDataURL('image/png'))
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1a1f28] rounded-2xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        {!imgSrc ? (
          <div className="text-center py-8">
            <div className="flex justify-center gap-1.5 mb-3">
              <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-sm text-[var(--muted)]">生成中...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <img src={imgSrc} alt="分享卡片" className="w-full rounded-xl" />
            <p className="text-center text-sm text-[var(--text-secondary)]">长按图片保存到相册</p>
            <button onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-white/10 text-white font-medium">
              关闭
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = text.split('')
  let line = ''
  let curY = y
  for (const ch of chars) {
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, curY)
      line = ch
      curY += lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, curY)
}
