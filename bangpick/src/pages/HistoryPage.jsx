import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHistory, clearHistory } from '../lib/storage'
import { generateSyncCode, redeemSyncCode } from '../lib/cloudSync'
import { exportHistoryAsMarkdown, buildWeeklyReview } from '../lib/export'

export default function HistoryPage() {
  const navigate = useNavigate()
  const [history, setHistory] = useState(() => getHistory())

  // ── Sync code UI state ────────────────────────────────────────
  // 自由切换：generate 模式展示本机生成的同步码（10 分钟有效）；
  // redeem 模式输入另一台设备的同步码，把其数据合并进来。
  const [syncOpen, setSyncOpen] = useState(false)
  const [syncMode, setSyncMode] = useState('generate') // 'generate' | 'redeem'
  const [genCode, setGenCode] = useState(null)
  const [genExpire, setGenExpire] = useState(null)
  const [redeemInput, setRedeemInput] = useState('')
  const [syncBusy, setSyncBusy] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)

  // 周度复盘 — built on demand from local history, no cron required.
  const [reviewOpen, setReviewOpen] = useState(false)
  const review = reviewOpen ? buildWeeklyReview(history) : null

  function handleClear() {
    if (confirm('确定清空所有历史？')) {
      clearHistory()
      setHistory([])
    }
  }

  async function handleGenerate() {
    setSyncBusy(true)
    setSyncMsg(null)
    try {
      const r = await generateSyncCode()
      setGenCode(r.code)
      setGenExpire(Date.now() + (r.expiresInSec || 600) * 1000)
    } catch (e) {
      setSyncMsg({ type: 'error', text: '生成失败：' + (e?.message || '未知错误') })
    } finally {
      setSyncBusy(false)
    }
  }

  async function handleRedeem() {
    const code = redeemInput.trim()
    if (!/^\d{6}$/.test(code)) {
      setSyncMsg({ type: 'error', text: '请输入 6 位数字同步码' })
      return
    }
    setSyncBusy(true)
    setSyncMsg(null)
    try {
      const summary = await redeemSyncCode(code)
      const total = Object.values(summary).reduce((s, n) => s + (n || 0), 0)
      setSyncMsg({ type: 'ok', text: `合并完成，共 ${total} 条数据已同步到本机` })
      setRedeemInput('')
      // Refresh in-memory history view since merge may have added entries
      setHistory(getHistory())
    } catch (e) {
      setSyncMsg({ type: 'error', text: '同步失败：' + (e?.message || '未知错误') })
    } finally {
      setSyncBusy(false)
    }
  }

  return (
    <div className="flex flex-col h-dvh bg-slate-900">
      <header className="flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white">←</button>
        <h1 className="text-lg font-bold text-white flex-1">历史记录</h1>
        <button
          onClick={() => setReviewOpen(o => !o)}
          className="text-sm text-purple-300 hover:text-purple-200"
          title="本周决策复盘"
        >
          {reviewOpen ? '收起' : '复盘'}
        </button>
        {history.length > 0 && (
          <button
            onClick={() => exportHistoryAsMarkdown()}
            className="text-sm text-purple-300 hover:text-purple-200"
            title="导出为 Markdown"
          >
            导出
          </button>
        )}
        <button
          onClick={() => { setSyncOpen(s => !s); setSyncMsg(null) }}
          className="text-sm text-purple-300 hover:text-purple-200"
          title="跨设备同步"
        >
          {syncOpen ? '关闭' : '同步'}
        </button>
        {history.length > 0 && (
          <button onClick={handleClear} className="text-sm text-red-400 hover:text-red-300">清空</button>
        )}
      </header>

      {syncOpen && (
        <div className="bg-slate-800/60 border-b border-slate-700 px-4 py-3">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => { setSyncMode('generate'); setSyncMsg(null) }}
              className={`flex-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${syncMode === 'generate' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              生成同步码
            </button>
            <button
              onClick={() => { setSyncMode('redeem'); setSyncMsg(null) }}
              className={`flex-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${syncMode === 'redeem' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              输入同步码
            </button>
          </div>

          {syncMode === 'generate' ? (
            <div>
              {genCode ? (
                <div className="text-center py-2">
                  <div className="text-3xl font-mono tracking-[0.4em] text-white font-bold">{genCode}</div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    在另一台设备打开「历史 → 同步 → 输入同步码」并输入此码（10 分钟内有效，仅可使用一次）
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={syncBusy}
                  className="w-full text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-lg py-2"
                >
                  {syncBusy ? '生成中…' : '生成 6 位同步码'}
                </button>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={redeemInput}
                onChange={e => setRedeemInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6 位数字"
                inputMode="numeric"
                maxLength={6}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-center font-mono tracking-[0.3em] text-lg focus:border-purple-500 outline-none"
              />
              <button
                onClick={handleRedeem}
                disabled={syncBusy || redeemInput.length !== 6}
                className="px-4 text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-lg"
              >
                {syncBusy ? '同步中…' : '同步'}
              </button>
            </div>
          )}

          {syncMsg && (
            <p className={`text-[11px] mt-2 ${syncMsg.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
              {syncMsg.text}
            </p>
          )}
        </div>
      )}

      {reviewOpen && (
        <div className="bg-slate-800/60 border-b border-slate-700 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-purple-200">本周决策复盘</h2>
            <span className="text-[10px] text-slate-500">最近 7 天</span>
          </div>
          {!review ? (
            <p className="text-xs text-slate-400">最近 7 天还没有决策记录。</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-900/50 rounded-lg py-2 text-center">
                  <div className="text-lg font-bold text-white tabular-nums">{review.totalDecisions}</div>
                  <div className="text-[10px] text-slate-400">次决策</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg py-2 text-center">
                  <div className="text-lg font-bold text-white tabular-nums">{review.totalOptions}</div>
                  <div className="text-[10px] text-slate-400">个选项</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg py-2 text-center">
                  <div className="text-lg font-bold text-white tabular-nums">{review.avgOptionsPerDecision}</div>
                  <div className="text-[10px] text-slate-400">平均/次</div>
                </div>
              </div>
              {review.topTags.length > 0 && (
                <div>
                  <div className="text-[10px] text-slate-500 mb-1">高频标签</div>
                  <div className="flex flex-wrap gap-1.5">
                    {review.topTags.map(({ tag, count }) => (
                      <span key={tag} className="text-[11px] bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded">
                        {tag} <span className="text-purple-300/60">×{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {review.friendModeCount > 0 && (
                <p className="text-[11px] text-slate-400">
                  其中 {review.friendModeCount} 次是朋友模式
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {history.length === 0 ? (
          <div className="text-center text-slate-500 mt-20">
            <p className="text-2xl mb-2">📭</p>
            <p>还没有决策记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((d) => (
              <div key={d.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-white font-medium flex-1">{d.question}</p>
                  {d.mode === 'friend' && (
                    <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded-full ml-2">朋友</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {d.options.map((o) => (
                    <span key={o.id} className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded">
                      {o.name}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {new Date(d.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {d.result && <span className="text-xs text-green-400">→ {d.result}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
