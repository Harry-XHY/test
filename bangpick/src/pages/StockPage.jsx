import { useState, useEffect } from 'react'
import SectorChips from '../components/SectorChips'
import StockSearch from '../components/StockSearch'
import StockDataCard from '../components/StockDataCard'
import StockChat from '../components/StockChat'
import BottomNav from '../components/BottomNav'
import { analyzeStock } from '../lib/stockApi'
import { getHoldings, addHolding, removeHolding } from '../lib/stockStorage'

const TABS = ['选股推荐', '持仓跟踪', '消息解读']

export default function StockPage() {
  const [activeTab, setActiveTab] = useState('选股推荐')

  // Tab 1 state
  const [selectedSector, setSelectedSector] = useState(null)
  const [freeInput, setFreeInput] = useState('')

  // Tab 2 state
  const [holdings, setHoldings] = useState(() => getHoldings())

  // Tab 3 state
  const [newsContent, setNewsContent] = useState('')

  // Shared state
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function switchTab(tab) {
    setActiveTab(tab)
    setResponse('')
    setError(null)
  }

  // Tab 1: recommend submit
  async function handleRecommendSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setResponse('')
    setError(null)
    try {
      const result = await analyzeStock({
        type: 'recommend',
        sector: selectedSector || '综合',
        query: freeInput || '推荐短线机会',
      })
      if (result.type === 'no_opportunity') {
        setResponse(result.message)
      } else {
        setResponse(result.text)
      }
    } catch (err) {
      setError(err.message || '分析失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // Tab 2: add holding + analyze
  async function handleHoldingSubmit(stockInfo) {
    addHolding(stockInfo)
    setHoldings(getHoldings())
    await analyzeHolding(stockInfo)
  }

  async function analyzeHolding(stockInfo) {
    setLoading(true)
    setResponse('')
    setError(null)
    try {
      const result = await analyzeStock({
        type: 'holding',
        code: stockInfo.code,
        market: stockInfo.market,
        name: stockInfo.name,
        costPrice: stockInfo.costPrice,
      })
      if (result.type === 'no_opportunity') {
        setResponse(result.message)
      } else {
        setResponse(result.text)
      }
    } catch (err) {
      setError(err.message || '分析失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  function handleRemoveHolding(code) {
    removeHolding(code)
    setHoldings(getHoldings())
  }

  // Tab 3: news submit
  async function handleNewsSubmit(e) {
    e.preventDefault()
    if (!newsContent.trim()) return
    setLoading(true)
    setResponse('')
    setError(null)
    try {
      const result = await analyzeStock({
        type: 'news',
        content: newsContent,
      })
      if (result.type === 'no_opportunity') {
        setResponse(result.message)
      } else {
        setResponse(result.text)
      }
    } catch (err) {
      setError(err.message || '解读失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'var(--bg-app, linear-gradient(135deg, #0a0e14 0%, #0f141a 50%, #0a0e14 100%))' }}
    >
      <div className="max-w-xl mx-auto px-4 pt-8 pb-20">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-2xl" style={{ color: '#b6a0ff', fontVariationSettings: "'FILL' 1" }}>candlestick_chart</span>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: '#f1f3fc' }}>炒股助手</h1>
          </div>
          <p className="text-sm mb-3" style={{ color: '#72757d' }}>基于真实行情数据的短线分析</p>
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: 'rgba(248,161,113,0.1)', border: '1px solid rgba(248,161,113,0.25)', color: '#f8a171' }}
          >
            <span>⚠️</span>
            <span>数据仅供参考，不构成投资建议</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={
                activeTab === tab
                  ? {
                      background: 'rgba(182,160,255,0.15)',
                      border: '1px solid rgba(182,160,255,0.4)',
                      color: '#b6a0ff',
                    }
                  : {
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#72757d',
                    }
              }
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab 1: 选股推荐 */}
        {activeTab === '选股推荐' && (
          <form onSubmit={handleRecommendSubmit} className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#72757d' }}>选择板块</p>
              <SectorChips selected={selectedSector} onSelect={val => setSelectedSector(prev => prev === val ? null : val)} />
            </div>
            <div>
              <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#72757d' }}>或描述你的问题</p>
              <textarea
                value={freeInput}
                onChange={e => setFreeInput(e.target.value)}
                placeholder="或描述你的问题..."
                rows={3}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f1f3fc',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{
                background: 'rgba(182,160,255,0.15)',
                border: '1px solid rgba(182,160,255,0.3)',
                color: '#b6a0ff',
              }}
            >
              {loading ? '分析中...' : '开始分析'}
            </button>
          </form>
        )}

        {/* Tab 2: 持仓跟踪 */}
        {activeTab === '持仓跟踪' && (
          <div className="flex flex-col gap-5">
            <StockSearch onSubmit={handleHoldingSubmit} />

            {holdings.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#72757d' }}>已保存持仓</p>
                {holdings.map(h => (
                  <div
                    key={h.code}
                    className="glass-card rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
                    onClick={() => analyzeHolding(h)}
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: '#f1f3fc' }}>{h.name}</span>
                        <span className="text-xs" style={{ color: '#b6a0ff' }}>{h.code}</span>
                      </div>
                      <span className="text-xs" style={{ color: '#72757d' }}>成本: {h.costPrice} 元</span>
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleRemoveHolding(h.code) }}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                      style={{ color: '#72757d' }}
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: 消息解读 */}
        {activeTab === '消息解读' && (
          <form onSubmit={handleNewsSubmit} className="flex flex-col gap-4">
            <textarea
              value={newsContent}
              onChange={e => setNewsContent(e.target.value)}
              placeholder="粘贴新闻或公告内容..."
              rows={6}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#f1f3fc',
              }}
            />
            <button
              type="submit"
              disabled={loading || !newsContent.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{
                background: 'rgba(182,160,255,0.15)',
                border: '1px solid rgba(182,160,255,0.3)',
                color: '#b6a0ff',
              }}
            >
              {loading ? '解读中...' : '解读'}
            </button>
          </form>
        )}

        {/* Response area */}
        {(response || loading || error) && (
          <div className="mt-6 flex flex-col gap-3">
            <StockDataCard data={null} />
            <StockChat response={response} loading={loading} error={error} />
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
