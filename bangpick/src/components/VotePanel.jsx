import { useState } from 'react'
import OptionCard from './OptionCard'

export default function VotePanel({ options: initialOptions, onVoteComplete }) {
  const [options, setOptions] = useState(initialOptions)
  const [voted, setVoted] = useState(false)

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
        <p className="text-center text-sm text-green-400 mt-2">✓ 已投票！</p>
      )}
      {!voted && (
        <p className="text-center text-xs text-slate-500">点击选项进行投票</p>
      )}
    </div>
  )
}
