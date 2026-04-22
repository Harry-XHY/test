import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import OptionCard from './OptionCard'

export default function VotePanel({ options: initialOptions, onVoteComplete }) {
  const [options, setOptions] = useState(initialOptions)
  const [voted, setVoted] = useState(false)
  const { t } = useTranslation()

  function handleVote(optionId) {
    if (voted) return
    setOptions((prev) =>
      prev.map((o) => (o.id === optionId ? { ...o, votes: o.votes + 1 } : o))
    )
    setVoted(true)
    onVoteComplete?.(optionId)
  }

  return (
    <div className="space-y-3">
      {options.map((opt, idx) => (
        <OptionCard
          key={opt.id}
          option={opt}
          rank={idx}
          showVote
          onVote={handleVote}
        />
      ))}
      {voted && (
        <p className="text-center text-sm text-green-400 mt-2">{t('vote.voted')}</p>
      )}
      {!voted && (
        <p className="text-center text-xs text-slate-500">{t('vote.click_to_vote')}</p>
      )}
    </div>
  )
}
