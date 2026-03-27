import { useMemo } from 'react'
import { getTodayFortune, isFortuneDrawn } from '../lib/fortunes'

export default function FortuneCard({ onOpen }) {
  const drawn = isFortuneDrawn()
  const fortune = useMemo(() => drawn ? getTodayFortune() : null, [drawn])

  return (
    <section className="mb-12">
      <button
        onClick={onOpen}
        className="w-full glass-card p-6 rounded-[20px] flex items-center justify-between group cursor-pointer hover:bg-[rgba(32,38,47,0.6)] transition-all duration-500 shadow-2xl shadow-[var(--primary)]/5"
      >
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[var(--primary)]/20 to-[var(--tertiary)]/20 flex items-center justify-center text-[var(--primary)]">
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>flare</span>
          </div>
          <div className="text-left">
            {drawn ? (
              <>
                <h3 className="text-xl font-bold text-[var(--text)] tracking-tight mb-0.5">
                  {fortune.level}
                </h3>
                <p className="text-[var(--text-secondary)] text-sm font-medium">
                  {fortune.message.length > 16 ? fortune.message.slice(0, 16) + '…' : fortune.message}
                </p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-[var(--text)] tracking-tight mb-0.5">每日一签</h3>
                <p className="text-[var(--text-secondary)] text-sm font-medium">今日一签 · 看看决策运势</p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[var(--primary)]/60 group-hover:text-[var(--primary)] transition-colors">
          <span className="text-xs font-bold uppercase tracking-widest">Draw Oracle</span>
          <span className="material-symbols-outlined text-xl">chevron_right</span>
        </div>
      </button>
    </section>
  )
}
