import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getHistory, clearHistory } from '../lib/storage'
import { generateSyncCode, redeemSyncCode } from '../lib/cloudSync'
import { exportHistoryAsMarkdown, buildWeeklyReview } from '../lib/export'

export default function HistoryPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
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
    if (confirm(t('history.clear_confirm'))) {
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
      setSyncMsg({ type: 'error', text: t('history.gen_failed') + (e?.message || t('history.unknown_error')) })
    } finally {
      setSyncBusy(false)
    }
  }

  async function handleRedeem() {
    const code = redeemInput.trim()
    if (!/^\d{6}$/.test(code)) {
      setSyncMsg({ type: 'error', text: t('history.invalid_code') })
      return
    }
    setSyncBusy(true)
    setSyncMsg(null)
    try {
      const summary = await redeemSyncCode(code)
      const total = Object.values(summary).reduce((s, n) => s + (n || 0), 0)
      setSyncMsg({ type: 'ok', text: t('history.merge_done', { total }) })
      setRedeemInput('')
      // Refresh in-memory history view since merge may have added entries
      setHistory(getHistory())
    } catch (e) {
      setSyncMsg({ type: 'error', text: t('history.sync_failed') + (e?.message || t('history.unknown_error')) })
    } finally {
      setSyncBusy(false)
    }
  }

  return (
    <div className="flex flex-col h-dvh bg-slate-900">
      <header className="flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white">←</button>
        <h1 className="text-lg font-bold text-white flex-1">{t('history.title')}</h1>
        <button
          onClick={() => setReviewOpen(o => !o)}
          className="text-sm text-purple-300 hover:text-purple-200"
          title={t('history.weekly_review')}
        >
          {reviewOpen ? t('history.collapse') : t('history.review')}
        </button>
        {history.length > 0 && (
          <button
            onClick={() => exportHistoryAsMarkdown()}
            className="text-sm text-purple-300 hover:text-purple-200"
            title={t('history.export')}
          >
            {t('history.export')}
          </button>
        )}
        <button
          onClick={() => { setSyncOpen(s => !s); setSyncMsg(null) }}
          className="text-sm text-purple-300 hover:text-purple-200"
          title={t('history.sync')}
        >
          {syncOpen ? t('history.close') : t('history.sync')}
        </button>
        {history.length > 0 && (
          <button onClick={handleClear} className="text-sm text-red-400 hover:text-red-300">{t('history.clear')}</button>
        )}
      </header>

      {syncOpen && (
        <div className="bg-slate-800/60 border-b border-slate-700 px-4 py-3">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => { setSyncMode('generate'); setSyncMsg(null) }}
              className={`flex-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${syncMode === 'generate' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              {t('history.generate_code')}
            </button>
            <button
              onClick={() => { setSyncMode('redeem'); setSyncMsg(null) }}
              className={`flex-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${syncMode === 'redeem' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              {t('history.enter_code')}
            </button>
          </div>

          {syncMode === 'generate' ? (
            <div>
              {genCode ? (
                <div className="text-center py-2">
                  <div className="text-3xl font-mono tracking-[0.4em] text-white font-bold">{genCode}</div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {t('history.code_hint')}
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={syncBusy}
                  className="w-full text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-lg py-2"
                >
                  {syncBusy ? t('history.generating') : t('history.generate_btn')}
                </button>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={redeemInput}
                onChange={e => setRedeemInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={t('history.digit_placeholder')}
                inputMode="numeric"
                maxLength={6}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-center font-mono tracking-[0.3em] text-lg focus:border-purple-500 outline-none"
              />
              <button
                onClick={handleRedeem}
                disabled={syncBusy || redeemInput.length !== 6}
                className="px-4 text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-lg"
              >
                {syncBusy ? t('history.syncing') : t('history.sync_btn')}
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
            <h2 className="text-sm font-bold text-purple-200">{t('history.weekly_review')}</h2>
            <span className="text-[10px] text-slate-500">{t('history.last_7_days')}</span>
          </div>
          {!review ? (
            <p className="text-xs text-slate-400">{t('history.no_records_7d')}</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-900/50 rounded-lg py-2 text-center">
                  <div className="text-lg font-bold text-white tabular-nums">{review.totalDecisions}</div>
                  <div className="text-[10px] text-slate-400">{t('history.decisions_count')}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg py-2 text-center">
                  <div className="text-lg font-bold text-white tabular-nums">{review.totalOptions}</div>
                  <div className="text-[10px] text-slate-400">{t('history.options_count')}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg py-2 text-center">
                  <div className="text-lg font-bold text-white tabular-nums">{review.avgOptionsPerDecision}</div>
                  <div className="text-[10px] text-slate-400">{t('history.avg_per')}</div>
                </div>
              </div>
              {review.topTags.length > 0 && (
                <div>
                  <div className="text-[10px] text-slate-500 mb-1">{t('history.top_tags')}</div>
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
                  {t('history.friend_mode_count', { count: review.friendModeCount })}
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
            <p className="mb-4">{t('history.no_records')}</p>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #b6a0ff, #8b5cf6)' }}
            >
              {t('history.go_decide') || 'Make a decision'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((d) => (
              <div key={d.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-white font-medium flex-1">{d.question}</p>
                  {d.mode === 'friend' && (
                    <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded-full ml-2">{t('history.friend_badge')}</span>
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
                    {new Date(d.createdAt).toLocaleDateString(t('history.date_locale'), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
