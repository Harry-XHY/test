import { useState, useEffect, useRef } from 'react'
import { searchStock } from '../lib/stockApi'

export default function StockSearch({ onSubmit }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [selected, setSelected] = useState(null)  // { code, name, market }
  const [costPrice, setCostPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!query || query.length < 1 || selected) { setSuggestions([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const results = await searchStock(query)
      setSuggestions(results.slice(0, 5))
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
    onSubmit({ ...selected, costPrice: parseFloat(costPrice) })
  }

  function handleClear() {
    setSelected(null)
    setQuery('')
    setSuggestions([])
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="relative">
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null) }}
          placeholder="搜索股票代码或名称（如 000001 或 平安银行）"
          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f3fc' }}
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
          className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f3fc' }}
        />
        <button type="submit"
                disabled={!selected || !costPrice || parseFloat(costPrice) <= 0}
                className="px-5 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                style={{ background: 'rgba(182,160,255,0.15)', border: '1px solid rgba(182,160,255,0.3)', color: '#b6a0ff' }}>
          分析
        </button>
      </div>
    </form>
  )
}
