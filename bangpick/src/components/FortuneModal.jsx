import { useState, useEffect, useCallback } from 'react'
import { getTodayFortune, isFortuneDrawn, markFortuneDrawn } from '../lib/fortunes'

export default function FortuneModal({ onClose }) {
  const alreadyDrawn = isFortuneDrawn()
  const [flipped, setFlipped] = useState(alreadyDrawn)
  const fortune = getTodayFortune()

  const handleFlip = useCallback(() => {
    if (flipped) return
    setFlipped(true)
    markFortuneDrawn()
  }, [flipped])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
      if ((e.key === 'Enter' || e.key === ' ') && !flipped) {
        e.preventDefault()
        handleFlip()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [flipped, onClose, handleFlip])

  return (
    <div
      className="fortune-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="fortune-card" onClick={handleFlip}>
        <div className={`fortune-card-inner ${flipped ? 'flipped' : ''}`}>
          {/* Front */}
          <div className="fortune-front">
            <div className="text-center text-white">
              <div className="text-5xl mb-2">🔮</div>
              <div className="text-base font-semibold tracking-[4px]">今日一签</div>
              {!alreadyDrawn && (
                <div className="text-[11px] mt-2 opacity-70">点击翻牌</div>
              )}
            </div>
          </div>

          {/* Back */}
          <div className="fortune-back">
            <div className="text-center text-[var(--text)] w-full">
              <div className="text-xs text-[var(--primary)] tracking-[2px] mb-1.5">
                — {fortune.level} —
              </div>
              <div className="text-[13px] leading-relaxed my-3 text-[#e8eaf0]">
                {fortune.message}
              </div>
              <div className="border-t border-white/[0.08] my-3" />
              <div className="flex justify-around text-xs">
                <div>
                  <div className="text-[#22c55e] mb-1">宜</div>
                  <div className="text-[var(--text-secondary)]">{fortune.yi}</div>
                </div>
                <div>
                  <div className="text-[#ef4444] mb-1">忌</div>
                  <div className="text-[var(--text-secondary)]">{fortune.ji}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Close button */}
      {flipped && (
        <button
          onClick={onClose}
          className="absolute top-12 right-6 w-8 h-8 rounded-full grid place-items-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      )}
    </div>
  )
}
