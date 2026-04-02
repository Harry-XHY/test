import { useState, useEffect, useRef } from 'react'
import { searchStock } from '../lib/stockApi'

export default function StockSearch({ onSubmit, onSend, compact }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [selected, setSelected] = useState(null)
  const [costPrice, setCostPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!query || query.length < 1 || selected) { setSuggestions([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const results = await searchStock(query)
      const top = results.slice(0, 5)
      // Auto-select if only one result or exact name/code match
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
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!selected || !costPrice || parseFloat(costPrice) <= 0) return
    if (onSend) {
      onSend(`帮我看看${selected.code} ${selected.name}，成本${costPrice}元`)
    } else if (onSubmit) {
      onSubmit({ ...selected, costPrice: parseFloat(costPrice) })
    }
  }

  function handleClear() {
    setSelected(null)
    setQuery('')
    setSuggestions([])
  }

  const inputCls = compact
    ? 'w-full rounded-lg px-3 py-2 text-xs outline-none'
    : 'w-full rounded-xl px-4 py-3 text-sm outline-none'
  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f3fc' }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="relative">
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null) }}
          placeholder="搜索股票代码或名称"
          className={inputCls}
          style={inputStyle}
        />
        {selected && (
          <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#72757d' }}>
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
        {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#72757d'}}>...</span>}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10 glass-card">
            {suggestions.map(s => (
              <button key={s.code} type="button" onClick={() => handleSelect(s)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
                      style={{ color: '#f1f3fc' }}>
                <span style={{ color: '#b6a0ff' }}>{s.code}</span>
                <span className="ml-2">{s.name}</span>
                <span className="ml-2 text-xs" style={{ color: '#72757d' }}>{s.market === 1 ? '沪' : '深'}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          value={costPrice}
          onChange={e => setCostPrice(e.target.value)}
          placeholder="成本价（元）"
          min="0.01"
          step="0.01"
          className={compact ? 'flex-1 rounded-lg px-3 py-2 text-xs outline-none' : 'flex-1 rounded-xl px-4 py-3 text-sm outline-none'}
          style={inputStyle}
        />
        <button type="submit"
                disabled={!selected || !costPrice || parseFloat(costPrice) <= 0}
                className={`${compact ? 'px-3 py-2 text-xs' : 'px-5 py-3 text-sm'} rounded-xl font-medium transition-all disabled:opacity-40`}
                style={{ background: 'rgba(182,160,255,0.15)', border: '1px solid rgba(182,160,255,0.3)', color: '#b6a0ff' }}>
          分析
        </button>
      </div>
    </form>
  )
}
