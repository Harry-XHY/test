import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

export default function SpinWheel({ options }) {
  const { t } = useTranslation()
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const wheelRef = useRef(null)

  if (options.length < 2) {
    return <p className="text-center text-slate-400">{t('spin.min_options')}</p>
  }

  const sliceAngle = 360 / options.length

  function spin() {
    if (spinning) return
    setSpinning(true)
    setResult(null)

    const winIdx = Math.floor(Math.random() * options.length)
    const extraRotations = (5 + Math.floor(Math.random() * 3)) * 360
    const targetAngle = extraRotations + (360 - winIdx * sliceAngle - sliceAngle / 2)

    const wheel = wheelRef.current
    wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
    wheel.style.transform = `rotate(${targetAngle}deg)`

    setTimeout(() => {
      setSpinning(false)
      setResult(options[winIdx])
    }, 4200)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-2xl">▼</div>

      <div className="relative w-64 h-64">
        <svg
          ref={wheelRef}
          viewBox="0 0 200 200"
          className="w-full h-full"
          style={{ transformOrigin: 'center' }}
        >
          {options.map((opt, i) => {
            const startAngle = i * sliceAngle
            const endAngle = startAngle + sliceAngle
            const startRad = (Math.PI / 180) * (startAngle - 90)
            const endRad = (Math.PI / 180) * (endAngle - 90)
            const x1 = 100 + 95 * Math.cos(startRad)
            const y1 = 100 + 95 * Math.sin(startRad)
            const x2 = 100 + 95 * Math.cos(endRad)
            const y2 = 100 + 95 * Math.sin(endRad)
            const largeArc = sliceAngle > 180 ? 1 : 0
            const midRad = (Math.PI / 180) * ((startAngle + endAngle) / 2 - 90)
            const textX = 100 + 55 * Math.cos(midRad)
            const textY = 100 + 55 * Math.sin(midRad)
            const textRotation = (startAngle + endAngle) / 2

            return (
              <g key={i}>
                <path
                  d={`M100,100 L${x1},${y1} A95,95 0 ${largeArc},1 ${x2},${y2} Z`}
                  fill={COLORS[i % COLORS.length]}
                  stroke="#1e293b"
                  strokeWidth="1"
                />
                <text
                  x={textX}
                  y={textY}
                  fill="white"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                >
                  {opt.name.length > 6 ? opt.name.slice(0, 6) + '…' : opt.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <button
        onClick={spin}
        disabled={spinning}
        className="px-8 py-3 rounded-xl bg-purple-600 text-white font-bold text-lg active:bg-purple-700 disabled:opacity-50"
      >
        {spinning ? t('spin.spinning') : t('spin.go')}
      </button>

      {result && (
        <div className="text-center mt-2 p-3 bg-green-900/30 rounded-xl border border-green-700">
          <p className="text-green-400 font-bold text-lg">{t('spin.result')} {result.name}</p>
          <p className="text-slate-300 text-sm mt-1">{result.reason}</p>
        </div>
      )}
    </div>
  )
}
