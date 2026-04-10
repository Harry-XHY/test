// SVG radar chart for 4 dimensions

const SIZE = 200
const CX = SIZE / 2
const CY = SIZE / 2
const R = 70 // max radius

function polarToXY(angle, radius) {
  const rad = (angle - 90) * (Math.PI / 180)
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)]
}

export default function RadarChart({ dimensions, scores, labels, color = '#B6A0FF' }) {
  const n = dimensions.length
  const angleStep = 360 / n
  const maxPerDim = 4

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1]

  // Data points
  const points = dimensions.map((dim, i) => {
    const val = Math.min((scores[dim] || 0) / maxPerDim, 1)
    const angle = i * angleStep
    return polarToXY(angle, val * R)
  })

  const dataPath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z'

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} className="mx-auto">
      {/* Grid */}
      {rings.map((r) => {
        const ringPath = dimensions
          .map((_, i) => {
            const [x, y] = polarToXY(i * angleStep, r * R)
            return `${i === 0 ? 'M' : 'L'}${x},${y}`
          })
          .join(' ') + ' Z'
        return <path key={r} d={ringPath} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      })}

      {/* Axis lines */}
      {dimensions.map((_, i) => {
        const [x, y] = polarToXY(i * angleStep, R)
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      })}

      {/* Data area */}
      <path d={dataPath} fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />

      {/* Data points */}
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill={color} />
      ))}

      {/* Labels */}
      {dimensions.map((dim, i) => {
        const [x, y] = polarToXY(i * angleStep, R + 18)
        return (
          <text key={dim} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fill="rgba(255,255,255,0.7)" fontSize="12" fontWeight="600">
            {labels[dim]}
          </text>
        )
      })}
    </svg>
  )
}
