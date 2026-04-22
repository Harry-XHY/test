import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { castVote, hasVoted, markVoted } from '../lib/foodVote'

export default function FoodVoteGuestView({ session, onVoted }) {
  const { t } = useTranslation()
  const [voting, setVoting] = useState(false)
  const [message, setMessage] = useState('')
  const [nickname] = useState(() => {
    try { return localStorage.getItem('bangpick_nickname') || '' } catch { return '' }
  })
  const alreadyVoted = hasVoted(session.id)

  async function handleVote(placeId) {
    if (alreadyVoted || voting) return
    setVoting(true)
    try {
      await castVote({ voteId: session.id, placeId, nickname, message: message.trim() || undefined })
      markVoted(session.id)
      onVoted?.()
    } catch (err) {
      console.error('[foodVote] cast failed:', err)
    } finally {
      setVoting(false)
    }
  }

  const expired = Date.now() > session.deadline

  return (
    <div className="space-y-4">
      <p className="text-center text-[13px]" style={{ color: '#a8abb3' }}>{session.question}</p>

      {expired && (
        <div className="text-center py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)' }}>
          <p className="text-[11px]" style={{ color: '#f87171' }}>{t('foodVote.expired')}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {session.restaurants.map(r => (
          <div
            key={r.placeId}
            className="rounded-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            {r.photo && (
              <img
                src={r.photo.startsWith('http') ? r.photo : `/api/food?action=photo&ref=${r.photo}&maxwidth=400`}
                alt={r.name}
                className="w-full h-32 object-cover"
                loading="lazy"
              />
            )}
            <div className="p-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[14px] font-bold" style={{ color: '#f1f3fc' }}>{r.name}</h3>
                <span className="text-[10px]" style={{ color: '#52555c' }}>{r.distance}m</span>
              </div>
              {r.cuisine && <p className="text-[11px] mb-2" style={{ color: '#72757d' }}>{r.cuisine}</p>}
              {!alreadyVoted && !expired && (
                <button
                  onClick={() => handleVote(r.placeId)}
                  disabled={voting}
                  className="w-full py-2 rounded-lg text-[12px] font-semibold transition-all active:scale-[0.98]"
                  style={{
                    background: 'rgba(245,158,11,0.1)',
                    color: '#f59e0b',
                    border: '1px solid rgba(245,158,11,0.2)',
                  }}
                >
                  {voting ? t('foodVote.submitting') || '提交中...' : t('foodVote.vote_now')}
                </button>
              )}
              {alreadyVoted && (
                <div className="text-center py-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.1)' }}>
                  <p className="text-[11px]" style={{ color: '#4ade80' }}>{t('foodVote.already_voted')}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {!alreadyVoted && !expired && (
        <div className="mt-2">
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t('foodVote.leave_message')}
            className="w-full px-3 py-2.5 rounded-xl text-[12px] outline-none"
            style={{ background: 'rgba(255,255,255,0.03)', color: '#f1f3fc', border: '1px solid rgba(255,255,255,0.06)' }}
          />
        </div>
      )}
    </div>
  )
}
