import { useMemo } from 'react'
import { getTodayFortune, isFortuneDrawn } from '../lib/fortunes'

export default function FortuneCard({ onOpen }) {
  const drawn = isFortuneDrawn()
  const fortune = useMemo(() => drawn ? getTodayFortune() : null, [drawn])

  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-3 rounded-xl p-3 border cursor-pointer active:scale-[0.98] transition-transform"
      style={{
        background: 'linear-gradient(135deg, rgba(182,160,255,0.1), rgba(91,140,255,0.1))',
        borderColor: 'rgba(182,160,255,0.15)',
      }}
    >
      <span className="text-[22px]">🔮</span>
      <div className="flex-1 text-left">
        {drawn ? (
          <>
            <div className="text-sm font-semibold text-[var(--text)]">
              {fortune.level} · {fortune.message.length > 12 ? fortune.message.slice(0, 12) + '…' : fortune.message}
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">点击查看详情</div>
          </>
        ) : (
          <>
            <div className="text-sm font-semibold text-[var(--text)]">今日一签</div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">看看决策运势</div>
          </>
        )}
      </div>
      <span className="text-[var(--primary)] text-base">→</span>
    </button>
  )
}
