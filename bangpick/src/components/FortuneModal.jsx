import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getTodayFortune, isFortuneDrawn, markFortuneDrawn } from '../lib/fortunes'

export default function FortuneModal({ onClose }) {
  const { t } = useTranslation()
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
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--primary)]/20 rounded-full blur-[120px] pointer-events-none" />

      {/* 3D Card */}
      <div className="fortune-card" onClick={handleFlip}>
        <div className={`fortune-card-inner ${flipped ? 'flipped' : ''}`}>
          {/* Front */}
          <div className="fortune-front">
            {/* Gradient border wrapper */}
            <div
              className="absolute inset-0 rounded-[20px] p-[2px]"
              style={{ background: 'linear-gradient(135deg, #32008a, #b6a0ff, #7c98ff)' }}
            >
              <div className="w-full h-full rounded-[18px] bg-[#0f141a]/40 backdrop-blur-sm flex flex-col items-center justify-center gap-8 relative overflow-hidden">
                {/* Dot pattern */}
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}
                />
                <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                  <span className="material-symbols-outlined text-white text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>flare</span>
                </div>
                <div className="text-center">
                  <h2 className="text-white text-3xl font-black tracking-widest mb-2">{t('chat.fortune_title')}</h2>
                  <p className="text-white/60 text-sm tracking-widest uppercase font-medium">{t('chat.fortune_click_decrypt')}</p>
                </div>
                {!alreadyDrawn && (
                  <div className="mt-2 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                    <span className="material-symbols-outlined text-white text-sm">auto_fix_high</span>
                    <span className="text-white text-xs font-bold tracking-widest">{t('chat.fortune_flip')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Back */}
          <div className="fortune-back">
            <div
              className="absolute inset-0 rounded-[20px] p-[2px]"
              style={{ background: 'linear-gradient(135deg, rgba(182,160,255,0.3), rgba(124,152,255,0.1))' }}
            >
              <div className="w-full h-full bg-[#0a0e14]/90 backdrop-blur-xl rounded-[18px] p-7 flex flex-col justify-between relative overflow-hidden">
                {/* Top: Level */}
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[var(--primary)] text-[11px] font-bold tracking-widest uppercase mb-1">{t('chat.fortune_level')}</span>
                    <h3 className="text-3xl font-black text-[var(--text)]">{fortune.level}</h3>
                  </div>
                  <span className="material-symbols-outlined text-[var(--primary)]/40">auto_awesome</span>
                </div>

                {/* Middle: Message */}
                <div className="flex flex-col gap-4">
                  <div className="h-px w-12 bg-[var(--primary)]" />
                  <p className="text-xl leading-relaxed font-medium text-[var(--text)]">
                    {fortune.message}
                  </p>
                </div>

                {/* Yi / Ji Tags */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">{t('chat.fortune_yi')}</span>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                      <span className="text-emerald-400 font-bold text-sm">{fortune.yi}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">{t('chat.fortune_ji')}</span>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                      <span className="text-red-400 font-bold text-sm">{fortune.ji}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-2 text-center">
                  <span className="text-[10px] text-[var(--muted)] tracking-widest uppercase">{t('chat.fortune_oracle')} · {new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5 backdrop-blur-xl flex items-center justify-center hover:bg-white/10 transition-colors"
      >
        <span className="material-symbols-outlined text-[var(--text)]">close</span>
      </button>
    </div>
  )
}
