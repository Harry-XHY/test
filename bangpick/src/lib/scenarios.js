const ALL_SCENARIOS = [
  { emoji: '🍜', key: 'eat_what' },
  { emoji: '☕', key: 'drink_what' },
  { emoji: '🍺', key: 'late_night' },
  { emoji: '🎁', key: 'gift' },
  { emoji: '🛒', key: 'buy_which' },
  { emoji: '🎮', key: 'play_what' },
  { emoji: '🎬', key: 'watch_show' },
  { emoji: '👗', key: 'wear_what' },
  { emoji: '🧥', key: 'buy_clothes' },
  { emoji: '🚗', key: 'travel_how' },
  { emoji: '✈️', key: 'go_where' },
  { emoji: '💼', key: 'career' },
  { emoji: '📚', key: 'learn_what' },
  { emoji: '💪', key: 'fitness' },
  { emoji: '🏠', key: 'home_decor' },
  { emoji: '👫', key: 'social' },
  { emoji: '💰', key: 'finance' },
  { emoji: '🐱', key: 'pet' },
  { emoji: '💇', key: 'hairstyle' },
  { emoji: '📱', key: 'phone' },
]

const EXAMPLE_COUNT = 20

export function getDateStr() {
  const d = new Date()
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
}

export function seedFromDate() {
  const str = getDateStr()
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function seededShuffle(arr, seed) {
  const copy = [...arr]
  let s = seed
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const j = s % (i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function getRandomContent() {
  const seed = seedFromDate()
  return {
    scenarios: seededShuffle(ALL_SCENARIOS, seed).slice(0, 2),
    examples: seededShuffle(Array.from({ length: EXAMPLE_COUNT }, (_, i) => i), seed + 1).slice(0, 4),
  }
}
