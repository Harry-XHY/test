import { useMemo } from 'react'
import { getTodayFortune, isFortuneDrawn } from '../lib/fortunes'

export default function FortuneCard({ onOpen }) {
  const drawn = isFortuneDrawn()
  const fortune = useMemo(() => drawn ? getTodayFortune() : null, [drawn])

  return (
    <button
      onClick={onOpen}
      className="glass-card p-4 rounded-2xl flex flex-col items-start group cursor-pointer hover:bg-[rgba(32,38,47,0.6)] transition-all duration-300 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-[50px] opacity-15 -translate-y-1/2 translate-x-1/3 group-hover:opacity-30 transition-opacity" style={{ background: 'var(--primary)' }} />
      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--primary)]/20 to-[var(--tertiary)]/20 flex items-center justify-center text-[var(--primary)] mb-2.5">
        <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>flare</span>
      </div>
      <h5 className="text-[15px] font-bold text-[var(--text)] mb-0.5">
        {drawn ? fortune.level : '每日一签'}
      </h5>
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
        {drawn
          ? (fortune.message.length > 10 ? fortune.message.slice(0, 10) + '…' : fortune.message)
          : '看看决策运势'}
      </p>
    </button>
  )
}
