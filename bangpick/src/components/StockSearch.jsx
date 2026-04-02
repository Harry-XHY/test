import { useState, useEffect, useRef } from 'react'
import { searchStock } from '../lib/stockApi'
import { getHoldings } from '../lib/stockStorage'

export default function StockSearch({ onSubmit, onSend, compact }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [selected, setSelected] = useState(null)
  const [costPrice, setCostPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1=search, 2=cost
  const debounceRef = useRef(null)
  const costRef = useRef(null)
  const holdings = getHoldings()

  useEffect(() => {
    if (!query || query.length < 1 || selected) { setSuggestions([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const results = await searchStock(query)
      const top = results.slice(0, 5)
      const exact = top.find(s => s.name === query || s.code === query)
      if (exact) {
        handleSelect(exact)
      } else if (top.length === 1) {
        handleSelect(top[0])
      } else {
        setSuggestions(top)
      }
      setLoading(false)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, selected])

  function handleSelect(stock) {
    setSelected(stock)
    setQuery(`${stock.name}(${stock.code})`)
    setSuggestions([])
    setStep(2)
    setTimeout(() => costRef.current?.focus(), 100)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!selected) return
    const hasCost = costPrice && parseFloat(costPrice) > 0
    if (onSend) {
      const msg = hasCost
        ? `帮我看看${selected.code} ${selected.name}，成本${costPrice}元`
        : `帮我看看${selected.code} ${selected.name}`
      onSend(msg)
    } else if (onSubmit) {
      onSubmit({ ...selected, costPrice: hasCost ? parseFloat(costPrice) : null })
    }
  }

  function handleClear() {
    setSelected(null)
    setQuery('')
    setCostPrice('')
    setSuggestions([])
    setStep(1)
  }

  function handleHoldingClick(h) {
    setSelected({ code: h.code, name: h.name, market: h.market })
    setQuery(`${h.name}(${h.code})`)
    setCostPrice(String(h.costPrice))
    setSuggestions([])
    setStep(2)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-1">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'rgba(182,160,255,0.2)', color: '#b6a0ff' }}>1</span>
          <span className="text-xs" style={{ color: step === 1 ? '#f1f3fc' : '#72757d' }}>选股票</span>
        </div>
        <div className="w-6 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: step >= 2 ? 'rgba(182,160,255,0.2)' : 'rgba(255,255,255,0.06)', color: step >= 2 ? '#b6a0ff' : '#72757d' }}>2</span>
          <span className="text-xs" style={{ color: step >= 2 ? '#f1f3fc' : '#72757d' }}>成本价<span style={{ color: '#72757d' }}>（选填）</span></span>
        </div>
      </div>

      {/* Quick holdings */}
      {step === 1 && holdings.length > 0 && !query && (
        <div>
          <div className="text-xs mb-2" style={{ color: '#72757d' }}>快捷选择持仓股</div>
          <div className="flex flex-wrap gap-1.5">
            {holdings.map(h => (
              <button key={h.code} type="button" onClick={() => handleHoldingClick(h)}
                className="px-2.5 py-1.5 rounded-lg text-xs transition-all active:scale-95"
                style={{ background: 'rgba(182,160,255,0.1)', border: '1px solid rgba(182,160,255,0.2)', color: '#b6a0ff' }}>
                {h.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        {/* Search input */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-base" style={{ color: '#72757d' }}>search</span>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null); setStep(1) }}
            placeholder="输入代码或名称，如 000001 或 平安银行"
            className="w-full rounded-xl pl-9 pr-9 py-2.5 text-sm outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${selected ? 'rgba(182,160,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
              color: '#f1f3fc',
            }}
          />
          {selected && (
            <button type="button" onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ color: '#72757d' }}>
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
          {/* Dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl overflow-hidden z-10 glass-card shadow-lg">
              {suggestions.map(s => (
                <button key={s.code} type="button" onClick={() => handleSelect(s)}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-white/5 transition-colors">
                  <span className="font-mono font-medium" style={{ color: '#b6a0ff' }}>{s.code}</span>
                  <span style={{ color: '#f1f3fc' }}>{s.name}</span>
                  <span className="ml-auto text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: '#72757d' }}>
                    {s.market === 1 ? '沪A' : '深A'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cost + submit (visible after selection) */}
        {selected && (
          <div className="flex gap-2 stock-fade-in">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#72757d' }}>¥</span>
              <input
                ref={costRef}
                type="number"
                value={costPrice}
                onChange={e => setCostPrice(e.target.value)}
                placeholder="买入成本价"
                min="0.01"
                step="0.01"
                className="w-full rounded-xl pl-7 pr-3 py-2.5 text-sm outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f1f3fc',
                }}
              />
            </div>
            <button type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #5B8CFF, #7A7CFF)', color: '#fff' }}>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">analytics</span>
                诊断
              </span>
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
