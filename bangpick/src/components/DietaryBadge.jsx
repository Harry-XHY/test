export default function DietaryBadge({ text }) {
  if (!text) return null
  return (
    <span
      className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium"
      style={{
        background: 'rgba(34,197,94,0.1)',
        color: '#4ade80',
        border: '1px solid rgba(34,197,94,0.2)',
      }}
    >
      <span className="material-symbols-outlined text-[11px] mr-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      {text}
    </span>
  )
}
