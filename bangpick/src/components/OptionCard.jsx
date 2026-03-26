export default function OptionCard({ option, rank, onVote, showVote }) {
  const rankEmojis = ['🥇', '🥈', '🥉']

  return (
    <div
      className="bg-slate-700/50 rounded-xl p-4 border border-slate-600 hover:border-blue-500 transition-colors"
      onClick={showVote ? () => onVote?.(option.id) : undefined}
      role={showVote ? 'button' : undefined}
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
