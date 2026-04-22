import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getFoodVoteById, setWinner } from '../lib/foodVote'
import FoodVotePanel from '../components/FoodVotePanel'
import ShareButton from '../components/ShareButton'

export default function FoodVoteHostPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [session, setSession] = useState(null)

  useEffect(() => {
    const s = getFoodVoteById(id)
    if (!s) {
      navigate('/food', { replace: true })
      return
    }
    setSession(s)
  }, [id, navigate])

  function handleReveal(winnerId) {
    if (!winnerId) return
    const updated = setWinner(id, winnerId)
    setSession(updated)
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-dvh bg-[#080b10]">
        <p className="text-sm" style={{ color: '#52555c' }}>{t('share.loading')}</p>
      </div>
    )
  }

  const shareDecision = {
    type: 'foodVote',
    id: session.id,
    question: session.question,
    deadline: session.deadline,
    restaurants: session.restaurants,
    hostDeviceId: session.hostDeviceId,
  }

  return (
    <div className="flex flex-col h-dvh bg-[#080b10]">
      <header className="flex-shrink-0 px-5 pt-[max(env(safe-area-inset-top),12px)] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/food')}
            className="w-8 h-8 rounded-lg grid place-items-center hover:bg-white/5 transition-colors"
            style={{ color: '#52555c' }}
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          </button>
          <span className="text-[13px] font-bold" style={{ color: '#f1f3fc' }}>{t('foodVote.title')}</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
        <FoodVotePanel session={session} onReveal={handleReveal} />

        {(!session.status || session.status === 'active') && (
          <ShareButton decision={shareDecision} />
        )}

        {session.status === 'revealed' && session.winner && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <div className="p-5 text-center">
              <p className="text-[11px] mb-2" style={{ color: '#f59e0b' }}>{t('foodVote.winner_is')}</p>
              <h2 className="text-[20px] font-bold" style={{ color: '#f1f3fc' }}>{session.winner.name}</h2>
              {session.winner.cuisine && (
                <p className="text-[12px] mt-1" style={{ color: '#72757d' }}>{session.winner.cuisine}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
