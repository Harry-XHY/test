import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import VotePanel from '../components/VotePanel'
import SpinWheel from '../components/SpinWheel'
import FoodVoteGuestView from '../components/FoodVoteGuestView'
import { getSharedDecision } from '../lib/share'

export default function SharePage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const [decision, setDecision] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('vote')
  const [nickname, setNickname] = useState('')
  const [joined, setJoined] = useState(false)
  const [voteRefresh, setVoteRefresh] = useState(0)

  useEffect(() => {
    getSharedDecision(id).then((data) => {
      setDecision(data)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-slate-900">
        <p className="text-slate-400">{t('share.loading')}</p>
      </div>
    )
  }

  if (!decision) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh bg-slate-900 p-4">
        <p className="text-2xl mb-2">😢</p>
        <p className="text-slate-400">{t('share.expired')}</p>
      </div>
    )
  }

  const isFoodVote = decision.type === 'foodVote'

  if (!joined) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh bg-slate-900 p-4 gap-4">
        <p className="text-white text-lg font-bold">{decision.question}</p>
        <p className="text-slate-400 text-sm">{t('share.enter_nickname')}</p>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={t('share.nickname_placeholder')}
          className="px-4 py-3 rounded-xl bg-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 w-48 text-center"
        />
        <button
          onClick={() => {
            if (!nickname.trim()) return
            try { localStorage.setItem('bangpick_nickname', nickname.trim()) } catch {}
            setJoined(true)
          }}
          disabled={!nickname.trim()}
          className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-30"
        >
          {t('share.join')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh bg-slate-900">
      <header className="px-4 py-3 bg-slate-800 border-b border-slate-700 text-center">
        <p className="text-sm text-slate-400">{isFoodVote ? t('foodVote.title') : t('share.help_choose')}</p>
        <h1 className="text-lg font-bold text-white">{decision.question}</h1>
        <p className="text-xs text-slate-500 mt-1">👤 {nickname}</p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isFoodVote ? (
          <FoodVoteGuestView
            key={voteRefresh}
            session={decision}
            onVoted={() => setVoteRefresh(n => n + 1)}
          />
        ) : (
          <>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setMode('vote')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  mode === 'vote' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {t('share.vote_tab')}
              </button>
              <button
                onClick={() => setMode('spin')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  mode === 'spin' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {t('share.spin_tab')}
              </button>
            </div>
            {mode === 'vote' ? (
              <VotePanel options={decision.options} />
            ) : (
              <SpinWheel options={decision.options} />
            )}
          </>
        )}
      </div>

      <div className="p-3 bg-slate-800 border-t border-slate-700 text-center">
        <a href="/" className="text-sm text-blue-400">{t('share.cta')}</a>
      </div>
    </div>
  )
}
