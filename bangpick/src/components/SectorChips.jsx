import { SECTORS } from '../lib/stockPrompts'

export default function SectorChips({ onSelect, selected }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SECTORS.map(sector => (
        <button
          key={sector}
          type="button"
          onClick={() => onSelect(sector)}
          className="px-3 py-1.5 rounded-full text-sm transition-all"
          style={{
            background: selected === sector ? 'rgba(182,160,255,0.2)' : 'rgba(255,255,255,0.06)',
            border: selected === sector ? '1px solid rgba(182,160,255,0.5)' : '1px solid rgba(255,255,255,0.08)',
            color: selected === sector ? '#b6a0ff' : '#a8abb3'
          }}
        >
          {sector}
        </button>
      ))}
    </div>
  )
}
