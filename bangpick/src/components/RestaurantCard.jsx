export default function RestaurantCard({ restaurant: r, selected, onClick }) {
  const cuisineTag = r.cuisine || (r.types || []).find(t => !['restaurant', 'food', 'point_of_interest', 'establishment'].includes(t))

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all active:scale-[0.98]"
      style={{
        background: selected ? 'rgba(91,140,255,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${selected ? 'rgba(91,140,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-lg"
        style={{ background: 'rgba(239,68,68,0.08)' }}>
        🍴
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate" style={{ color: '#f1f3fc' }}>{r.name}</span>
          {r.rating && (
            <span className="text-[10px] font-bold flex-shrink-0" style={{ color: '#f59e0b' }}>
              ⭐ {r.rating}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {cuisineTag && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md"
              style={{ background: 'rgba(182,160,255,0.1)', color: '#b6a0ff' }}>
              {cuisineTag}
            </span>
          )}
          {r.vicinity && (
            <span className="text-[10px] truncate" style={{ color: '#52555c' }}>{r.vicinity}</span>
          )}
        </div>
      </div>

      {/* Distance */}
      <div className="flex-shrink-0 text-right">
        <div className="text-xs font-mono font-semibold" style={{ color: '#a8abb3' }}>
          {r.distance < 1000 ? `${r.distance}m` : `${(r.distance / 1000).toFixed(1)}km`}
        </div>
        {r.priceLevel != null && (
          <div className="text-[10px] mt-0.5" style={{ color: '#72757d' }}>
            {'¥'.repeat(r.priceLevel || 1)}
          </div>
        )}
      </div>
    </button>
  )
}
