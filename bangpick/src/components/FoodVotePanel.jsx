import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getVoteTallies } from '../lib/foodVote'

function formatTimeLeft(ms) {
  if (ms <= 0) return '00:00'
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function FoodVotePanel({ session, onReveal }) {
  const { t } = useTranslation()
  const [tallies, setTallies] = useState({})
  const [messages, setMessages] = useState([])
  const [totalVotes, setTotalVotes] = useState(0)
  const [timeLeft, setTimeLeft] = useState(session.deadline - Date.now())

  async function fetchTallies() {
    try {
      const data = await getVoteTallies(session.id)
      setTallies(data.restaurants || {})
      setMessages(data.messages || [])
      setTotalVotes(data.totalVotes || 0)
    } catch (err) {
      console.error('[foodVote] fetch tallies:', err)
    }
  }

  useEffect(() => {
    fetchTallies()
    const interval = setInterval(fetchTallies, 10000)
    return () => clearInterval(interval)
  }, [session.id])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(session.deadline - Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [session.deadline])

  const expired = timeLeft <= 0
  const maxVotes = Math.max(...Object.values(tallies), 1)

  function handleReveal() {
    let winnerId = null
    let max = -1
    for (const [placeId, count] of Object.entries(tallies)) {
      if (count > max) {
        max = count
        winnerId = placeId
      }
    }
    onReveal?.(winnerId)
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-[16px] font-bold" style={{ color: '#f1f3fc' }}>{session.question}</h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-[12px] font-mono" style={{ color: expired ? '#f87171' : '#f59e0b' }}>
            {expired ? t('foodVote.expired') : formatTimeLeft(timeLeft)}
          </span>
          <span className="text-[11px]" style={{ color: '#52555c' }}>
            {totalVotes} {t('foodVote.votes_count', { count: totalVotes })}
          </span>
        </div>
      </div>

      {/* Vote bars */}
      <div className="flex flex-col gap-2">
        {session.restaurants.map(r => {
          const count = tallies[r.placeId] || 0
          const pct = maxVotes > 0 ? (count / maxVotes) * 100 : 0
          return (
            <div key={r.placeId} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-medium truncate" style={{ color: '#f1f3fc' }}>{r.name}</span>
                  <span className="text-[11px] font-mono flex-shrink-0 ml-2" style={{ color: '#f59e0b' }}>{count}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: '#f59e0b' }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Messages */}
      {messages.length > 0 && (
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="text-[10px] font-medium mb-2" style={{ color: '#52555c' }}>{t('foodVote.messages')}</p>
          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
            {messages.map((m, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] font-medium flex-shrink-0" style={{ color: '#72757d' }}>{m.nickname}</span>
                <span className="text-[11px]" style={{ color: '#a8abb3' }}>{m.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reveal button */}
      {!session.status || session.status === 'active' ? (
        <button
          onClick={handleReveal}
          disabled={totalVotes === 0}
          className="w-full py-3 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.98] disabled:opacity-30"
          style={{
            background: totalVotes > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.03)',
            color: '#f59e0b',
            border: `1px solid ${totalVotes > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'}`,
          }}
        >
          {totalVotes === 0 ? t('foodVote.no_votes_yet') : t('foodVote.reveal_winner')}
        </button>
      ) : (
        <div className="text-center py-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.1)' }}>
          <p className="text-[11px]" style={{ color: '#4ade80' }}>{t('foodVote.revealed')}</p>
        </div>
      )}
    </div>
  )
}
