import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

export default function RandomPicker({ options, onPick }) {
  const { t } = useTranslation()
  const [state, setState] = useState('idle')
  const [current, setCurrent] = useState('')
  const [winner, setWinner] = useState(null)
  const timerRef = useRef(null)

  function start() {
    if (state === 'spinning') return
    setState('spinning')
    setWinner(null)

    const names = options.map((o) => o.name)
    let count = 0
    const totalCycles = 15 + Math.floor(Math.random() * 10)
    const winIdx = Math.floor(Math.random() * names.length)

    function tick() {
      setCurrent(names[count % names.length])
      count++
      if (count >= totalCycles) {
        setCurrent(names[winIdx])
        setWinner(options[winIdx])
        setState('done')
        return
      }
      const delay = 60 + count * 12
      timerRef.current = setTimeout(tick, delay)
    }
    tick()
  }

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  if (options.length < 2) return null

  return (
    <div className="mt-1">
      {state === 'idle' && (
        <button onClick={start}
          className="glass-card w-full py-2.5 rounded-[16px] text-sm font-bold text-[var(--primary)] active:scale-[0.98] transition-transform cursor-pointer">
          {t('random.pick')}
        </button>
      )}

      {state === 'spinning' && (
        <div className="glass-card text-center py-3 rounded-[16px]">
          <p className="text-xs text-[var(--muted)] mb-1">{t('random.picking')}</p>
          <p className="text-lg font-extrabold text-white animate-pulse">{current}</p>
        </div>
      )}

      {state === 'done' && winner && (
        <div className="text-center py-3 px-4 rounded-[16px]"
          style={{
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.25)',
          }}
        >
          <p className="text-xs text-[#86efac] mb-1">{t('random.result')}</p>
          <p className="text-lg font-extrabold text-white">{winner.name}</p>
          {winner.reason && <p className="text-xs text-[var(--muted)] mt-1">{winner.reason}</p>}
          <div className="flex justify-center gap-3 mt-2.5">
            <button onClick={() => { setState('idle'); setWinner(null) }}
              className="text-xs text-[var(--primary)]">{t('random.again')}</button>
            {onPick && (
              <button onClick={() => onPick(winner.name)}
                className="text-xs text-[#86efac] font-bold">{t('random.choose')}</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
