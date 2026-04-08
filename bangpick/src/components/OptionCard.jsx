export default function OptionCard({ option, rank, onVote, showVote, onSelect }) {
  const rankEmojis = ['🥇', '🥈', '🥉']

  // Two click modes:
  //   showVote=true  → vote panel (SharePage) — clicking casts a vote
  //   onSelect given → chat recommendation (ChatPage) — clicking confirms pick
  const handleClick = showVote
    ? () => onVote?.(option.id)
    : onSelect
      ? () => onSelect(`就选${option.name}`)
      : undefined

  const clickable = Boolean(handleClick)

  return (
    <div
      className={`bg-slate-700/50 rounded-xl p-4 border border-slate-600 transition-colors ${
        clickable ? 'hover:border-blue-500 cursor-pointer active:scale-[0.98]' : ''
      }`}
      onClick={handleClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } } : undefined}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold text-white">
          {rankEmojis[rank] || ''} {option.name}
        </h3>
        {showVote && option.votes > 0 && (
          <span className="text-sm text-blue-400 font-medium">{option.votes} 票</span>
        )}
      </div>
      <p className="text-slate-300 text-sm mb-3">{option.reason}</p>
      <div className="flex gap-2 flex-wrap">
        {option.tags.map((tag) => (
          <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-slate-600 text-slate-300">
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}
