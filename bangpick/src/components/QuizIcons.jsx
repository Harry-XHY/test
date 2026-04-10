// Custom SVG icons for quiz personality types — gradient glassmorphism style

const defs = (id, c1, c2) => (
  <defs>
    <linearGradient id={`g-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor={c1} />
      <stop offset="100%" stopColor={c2} />
    </linearGradient>
    <radialGradient id={`glow-${id}`} cx="30%" cy="30%" r="70%">
      <stop offset="0%" stopColor={c1} stopOpacity="0.4" />
      <stop offset="100%" stopColor={c2} stopOpacity="0" />
    </radialGradient>
  </defs>
)

const Wrap = ({ id, c1, c2, size, children }) => (
  <svg viewBox="0 0 80 80" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    {defs(id, c1, c2)}
    {/* Background glow circle */}
    <circle cx="40" cy="40" r="38" fill={`url(#glow-${id})`} />
    <circle cx="40" cy="40" r="36" fill="rgba(255,255,255,0.04)" stroke={`url(#g-${id})`} strokeWidth="1.5" strokeOpacity="0.3" />
    {children}
  </svg>
)

// ── Decision Personalities ────────────────────────────────────────

function FlashIcon({ size = 80 }) {
  return (
    <Wrap id="flash" c1="#FFD700" c2="#FF8C00" size={size}>
      <path d="M44 18L28 42h10l-4 20 18-26H40l4-18z" fill="url(#g-flash)" />
      <path d="M44 18L28 42h10l-4 20 18-26H40l4-18z" fill="rgba(255,255,255,0.15)" />
    </Wrap>
  )
}

function StrategistIcon({ size = 80 }) {
  return (
    <Wrap id="strategist" c1="#7C98FF" c2="#5B6BFF" size={size}>
      {/* Brain shape */}
      <path d="M40 22c-8 0-14 5-14 12 0 3 1 5.5 3 7.5-1 2-1.5 4-1 6.5.5 3 3 5 6 5.5V58h12v-4.5c3-.5 5.5-2.5 6-5.5.5-2.5 0-4.5-1-6.5 2-2 3-4.5 3-7.5 0-7-6-12-14-12z"
        fill="url(#g-strategist)" />
      <path d="M40 22v36" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <path d="M33 34c3-1 5-3 7-6 2 3 4 5 7 6" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M33 42c3 1 5 2 7 1 2 1 4 0 7-1" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinecap="round" fill="none" />
    </Wrap>
  )
}

function GamblerIcon({ size = 80 }) {
  return (
    <Wrap id="gambler" c1="#FF6B6B" c2="#FF3366" size={size}>
      {/* Dice */}
      <rect x="24" y="28" width="24" height="24" rx="4" fill="url(#g-gambler)" transform="rotate(-10 36 40)" />
      <circle cx="30" cy="34" r="2" fill="rgba(255,255,255,0.8)" transform="rotate(-10 36 40)" />
      <circle cx="36" cy="40" r="2" fill="rgba(255,255,255,0.8)" transform="rotate(-10 36 40)" />
      <circle cx="42" cy="46" r="2" fill="rgba(255,255,255,0.8)" transform="rotate(-10 36 40)" />
      {/* Card behind */}
      <rect x="38" y="24" width="18" height="26" rx="3" fill="rgba(255,255,255,0.12)" stroke="url(#g-gambler)" strokeWidth="1" transform="rotate(12 47 37)" />
      <text x="44" y="40" fill="url(#g-gambler)" fontSize="14" fontWeight="bold" transform="rotate(12 47 37)">A</text>
    </Wrap>
  )
}

function DemocratIcon({ size = 80 }) {
  return (
    <Wrap id="democrat" c1="#22C55E" c2="#10B981" size={size}>
      {/* Ballot box */}
      <rect x="28" y="34" width="24" height="20" rx="3" fill="url(#g-democrat)" />
      <rect x="28" y="34" width="24" height="20" rx="3" fill="rgba(255,255,255,0.1)" />
      {/* Slot */}
      <rect x="35" y="32" width="10" height="4" rx="1" fill="rgba(0,0,0,0.3)" />
      {/* Paper going in */}
      <rect x="37" y="22" width="6" height="14" rx="1" fill="rgba(255,255,255,0.85)" />
      <path d="M39 26l1.5 2 3-3" stroke="url(#g-democrat)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* People dots */}
      <circle cx="26" cy="60" r="3" fill="url(#g-democrat)" opacity="0.4" />
      <circle cx="40" cy="62" r="3" fill="url(#g-democrat)" opacity="0.6" />
      <circle cx="54" cy="60" r="3" fill="url(#g-democrat)" opacity="0.4" />
    </Wrap>
  )
}

function PerfectionistIcon({ size = 80 }) {
  return (
    <Wrap id="perfectionist" c1="#B6A0FF" c2="#8B5CF6" size={size}>
      {/* Diamond gem */}
      <polygon points="40,18 54,34 40,62 26,34" fill="url(#g-perfectionist)" />
      <polygon points="40,18 54,34 40,34" fill="rgba(255,255,255,0.2)" />
      <polygon points="40,18 26,34 40,34" fill="rgba(255,255,255,0.1)" />
      <polygon points="40,34 54,34 40,62" fill="rgba(0,0,0,0.1)" />
      {/* Sparkles */}
      <path d="M20 24l1.5-3 1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5z" fill="rgba(255,255,255,0.6)" />
      <path d="M58 44l1-2 1 2 2 1-2 1-1 2-1-2-2-1z" fill="rgba(255,255,255,0.4)" />
    </Wrap>
  )
}

function ZenIcon({ size = 80 }) {
  return (
    <Wrap id="zen" c1="#57BCFF" c2="#38A3DB" size={size}>
      {/* Yin-yang inspired */}
      <circle cx="40" cy="40" r="18" fill="url(#g-zen)" />
      <path d="M40 22a18 18 0 0 1 0 36 9 9 0 0 1 0-18 9 9 0 0 0 0-18z" fill="rgba(255,255,255,0.2)" />
      <circle cx="40" cy="31" r="3" fill="rgba(255,255,255,0.15)" />
      <circle cx="40" cy="49" r="3" fill="rgba(255,255,255,0.5)" />
      {/* Ripples */}
      <circle cx="40" cy="40" r="22" fill="none" stroke="url(#g-zen)" strokeWidth="0.5" strokeOpacity="0.3" />
      <circle cx="40" cy="40" r="26" fill="none" stroke="url(#g-zen)" strokeWidth="0.5" strokeOpacity="0.15" />
    </Wrap>
  )
}

// ── Investor Personalities ────────────────────────────────────────

function DaytraderIcon({ size = 80 }) {
  return (
    <Wrap id="daytrader" c1="#FF6B6B" c2="#E84057" size={size}>
      {/* Crosshair/target */}
      <circle cx="40" cy="40" r="16" fill="none" stroke="url(#g-daytrader)" strokeWidth="2" />
      <circle cx="40" cy="40" r="10" fill="none" stroke="url(#g-daytrader)" strokeWidth="1.5" strokeOpacity="0.6" />
      <circle cx="40" cy="40" r="4" fill="url(#g-daytrader)" />
      <line x1="40" y1="20" x2="40" y2="30" stroke="url(#g-daytrader)" strokeWidth="2" />
      <line x1="40" y1="50" x2="40" y2="60" stroke="url(#g-daytrader)" strokeWidth="2" />
      <line x1="20" y1="40" x2="30" y2="40" stroke="url(#g-daytrader)" strokeWidth="2" />
      <line x1="50" y1="40" x2="60" y2="40" stroke="url(#g-daytrader)" strokeWidth="2" />
    </Wrap>
  )
}

function BuffettIcon({ size = 80 }) {
  return (
    <Wrap id="buffett" c1="#22C55E" c2="#16A34A" size={size}>
      {/* Temple / bank building */}
      <polygon points="40,20 58,32 22,32" fill="url(#g-buffett)" />
      <rect x="25" y="32" width="30" height="3" fill="url(#g-buffett)" opacity="0.8" />
      {/* Pillars */}
      <rect x="28" y="35" width="4" height="18" rx="1" fill="url(#g-buffett)" opacity="0.7" />
      <rect x="38" y="35" width="4" height="18" rx="1" fill="url(#g-buffett)" opacity="0.7" />
      <rect x="48" y="35" width="4" height="18" rx="1" fill="url(#g-buffett)" opacity="0.7" />
      {/* Base */}
      <rect x="24" y="53" width="32" height="4" rx="1" fill="url(#g-buffett)" />
      {/* Dollar sign */}
      <text x="40" y="30" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="8" fontWeight="bold">$</text>
    </Wrap>
  )
}

function QuantIcon({ size = 80 }) {
  return (
    <Wrap id="quant" c1="#7C98FF" c2="#5B6BFF" size={size}>
      {/* Robot/circuit head */}
      <rect x="28" y="26" width="24" height="22" rx="5" fill="url(#g-quant)" />
      {/* Eyes */}
      <circle cx="35" cy="36" r="3" fill="rgba(255,255,255,0.85)" />
      <circle cx="45" cy="36" r="3" fill="rgba(255,255,255,0.85)" />
      <circle cx="35" cy="36" r="1.5" fill="#0a0e14" />
      <circle cx="45" cy="36" r="1.5" fill="#0a0e14" />
      {/* Antenna */}
      <line x1="40" y1="26" x2="40" y2="20" stroke="url(#g-quant)" strokeWidth="2" />
      <circle cx="40" cy="18" r="3" fill="url(#g-quant)" />
      {/* Mouth - binary */}
      <text x="40" y="45" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="6" fontFamily="monospace">01010</text>
      {/* Circuit lines */}
      <path d="M24 52h8l4-4h8l4 4h8" stroke="url(#g-quant)" strokeWidth="1" strokeOpacity="0.5" fill="none" />
      <path d="M28 56h6l2-2h8l2 2h6" stroke="url(#g-quant)" strokeWidth="1" strokeOpacity="0.3" fill="none" />
    </Wrap>
  )
}

function ZenInvestorIcon({ size = 80 }) {
  return (
    <Wrap id="zen_investor" c1="#B6A0FF" c2="#9F7AEA" size={size}>
      {/* Meditation figure */}
      <circle cx="40" cy="26" r="6" fill="url(#g-zen_investor)" />
      <path d="M28 52c0-8 5-14 12-16 7 2 12 8 12 16" fill="url(#g-zen_investor)" opacity="0.7" />
      {/* Crossed legs */}
      <path d="M30 52q5-3 10 0q5 3 10 0" fill="none" stroke="url(#g-zen_investor)" strokeWidth="2" />
      {/* Aura rings */}
      <circle cx="40" cy="38" r="20" fill="none" stroke="url(#g-zen_investor)" strokeWidth="0.7" strokeOpacity="0.2" />
      <circle cx="40" cy="38" r="25" fill="none" stroke="url(#g-zen_investor)" strokeWidth="0.5" strokeOpacity="0.1" />
      {/* Coin */}
      <circle cx="40" cy="60" r="4" fill="url(#g-zen_investor)" opacity="0.5" />
      <text x="40" y="62" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="6" fontWeight="bold">¥</text>
    </Wrap>
  )
}

function AllrounderIcon({ size = 80 }) {
  return (
    <Wrap id="allrounder" c1="#FFD700" c2="#F59E0B" size={size}>
      {/* Crown */}
      <path d="M22 40l6-16 6 10 6-10 6 10 6-16v22H22z" fill="url(#g-allrounder)" />
      <path d="M22 40l6-16 6 10 6-10 6 10 6-16" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <rect x="22" y="48" width="36" height="5" rx="2" fill="url(#g-allrounder)" />
      {/* Gems on crown */}
      <circle cx="28" cy="40" r="2" fill="rgba(255,255,255,0.5)" />
      <circle cx="40" cy="38" r="2.5" fill="rgba(255,255,255,0.6)" />
      <circle cx="52" cy="40" r="2" fill="rgba(255,255,255,0.5)" />
      {/* Sparkle */}
      <path d="M58 22l1-2 1 2 2 1-2 1-1 2-1-2-2-1z" fill="rgba(255,255,255,0.5)" />
    </Wrap>
  )
}

function NewsTraderIcon({ size = 80 }) {
  return (
    <Wrap id="news_trader" c1="#57BCFF" c2="#3B9FDB" size={size}>
      {/* Satellite dish */}
      <path d="M26 48c0-14 14-26 26-26" fill="none" stroke="url(#g-news_trader)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M26 38c0-8 8-16 16-16" fill="none" stroke="url(#g-news_trader)" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6" />
      <path d="M26 28c0-2 2-6 6-6" fill="none" stroke="url(#g-news_trader)" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.3" />
      <circle cx="26" cy="50" r="4" fill="url(#g-news_trader)" />
      {/* Signal waves */}
      <circle cx="52" cy="22" r="2" fill="url(#g-news_trader)" />
      {/* News ticker line */}
      <rect x="22" y="56" width="36" height="6" rx="3" fill="rgba(255,255,255,0.08)" />
      <rect x="24" y="57.5" width="8" height="3" rx="1.5" fill="url(#g-news_trader)" opacity="0.5" />
      <rect x="34" y="57.5" width="12" height="3" rx="1.5" fill="url(#g-news_trader)" opacity="0.3" />
    </Wrap>
  )
}

// ── Quiz Type Icons ───────────────────────────────────────────────

function CrystalBallIcon({ size = 80 }) {
  return (
    <Wrap id="crystal" c1="#B6A0FF" c2="#7C3AED" size={size}>
      {/* Ball */}
      <circle cx="40" cy="36" r="16" fill="url(#g-crystal)" />
      <circle cx="40" cy="36" r="16" fill="rgba(255,255,255,0.08)" />
      {/* Shine */}
      <ellipse cx="34" cy="30" rx="4" ry="6" fill="rgba(255,255,255,0.2)" transform="rotate(-20 34 30)" />
      {/* Stars inside */}
      <path d="M38 32l0.8-1.6 0.8 1.6 1.6 0.8-1.6 0.8-0.8 1.6-0.8-1.6-1.6-0.8z" fill="rgba(255,255,255,0.6)" />
      <path d="M44 38l0.5-1 0.5 1 1 0.5-1 0.5-0.5 1-0.5-1-1-0.5z" fill="rgba(255,255,255,0.4)" />
      {/* Base */}
      <path d="M30 52h20l3-4H27z" fill="url(#g-crystal)" opacity="0.6" />
      <rect x="27" y="52" width="26" height="4" rx="2" fill="url(#g-crystal)" opacity="0.8" />
    </Wrap>
  )
}

function ChartIcon({ size = 80 }) {
  return (
    <Wrap id="chart" c1="#22C55E" c2="#10B981" size={size}>
      {/* Chart line going up */}
      <polyline points="20,54 30,46 36,50 44,34 50,38 60,22"
        fill="none" stroke="url(#g-chart)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Area under chart */}
      <polygon points="20,54 30,46 36,50 44,34 50,38 60,22 60,58 20,58"
        fill="url(#g-chart)" fillOpacity="0.15" />
      {/* Arrow at end */}
      <polygon points="60,22 56,26 58,28" fill="url(#g-chart)" />
      {/* Grid lines */}
      <line x1="20" y1="58" x2="60" y2="58" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <line x1="20" y1="46" x2="60" y2="46" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="3 3" />
      <line x1="20" y1="34" x2="60" y2="34" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="3 3" />
    </Wrap>
  )
}

// ── Icon Map ──────────────────────────────────────────────────────

const ICON_MAP = {
  // Decision personalities
  flash: FlashIcon,
  strategist: StrategistIcon,
  gambler: GamblerIcon,
  democrat: DemocratIcon,
  perfectionist: PerfectionistIcon,
  zen: ZenIcon,
  // Investor personalities
  daytrader: DaytraderIcon,
  buffett: BuffettIcon,
  quant: QuantIcon,
  zen_investor: ZenInvestorIcon,
  allrounder: AllrounderIcon,
  news_trader: NewsTraderIcon,
  // Quiz types
  crystal: CrystalBallIcon,
  chart: ChartIcon,
}

export default function QuizIcon({ id, size = 80 }) {
  const Icon = ICON_MAP[id]
  if (!Icon) return <span style={{ fontSize: size * 0.6 }}>?</span>
  return <Icon size={size} />
}

export { CrystalBallIcon, ChartIcon }
