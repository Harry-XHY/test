// Scoring and personality matching logic for quizzes

import { QUIZZES } from './quizData'

/**
 * Calculate dimension scores from user answers.
 * @param {string} type - 'decision' or 'investor'
 * @param {number[]} answers - array of chosen option indices (0-3) for each question
 * @returns {Object} dimension scores, e.g. { speed: 8, basis: 3, risk: 5, social: 2 }
 */
export function calcScores(type, answers) {
  const quiz = QUIZZES[type]
  const scores = Object.fromEntries(quiz.dimensions.map((d) => [d, 0]))

  answers.forEach((optIdx, qIdx) => {
    const option = quiz.questions[qIdx]?.options[optIdx]
    if (!option) return
    for (const [dim, pts] of Object.entries(option.scores)) {
      scores[dim] = (scores[dim] || 0) + pts
    }
  })

  return scores
}

/**
 * Match scores to the closest personality type using Euclidean distance.
 * Each personality has an `ideal` vector (per dimension, 0-2 scale).
 * We normalize user scores to 0-2 range (max possible per dimension = 4, from 2 questions × 2 pts).
 */
export function matchPersonality(type, scores) {
  const quiz = QUIZZES[type]
  const maxPerDim = 4 // 2 questions × max 2 pts each

  // Normalize scores to 0-2 scale
  const normalized = {}
  for (const dim of quiz.dimensions) {
    normalized[dim] = (scores[dim] / maxPerDim) * 2
  }

  let bestMatch = quiz.personalities[0]
  let bestDist = Infinity

  for (const p of quiz.personalities) {
    let dist = 0
    for (const dim of quiz.dimensions) {
      const diff = (normalized[dim] || 0) - (p.ideal[dim] || 0)
      dist += diff * diff
    }
    if (dist < bestDist) {
      bestDist = dist
      bestMatch = p
    }
  }

  return bestMatch
}

/**
 * Build AI prompt for personality interpretation.
 * @param {string} lang - current i18n language code (e.g. 'zh', 'en', 'fr')
 * @param {Function} t - i18next t() function to resolve i18n keys
 */
export function buildQuizPrompt(type, personality, scores, lang, t) {
  const quiz = QUIZZES[type]
  const resolvedTitle = t ? t(quiz.title) : quiz.title
  const resolvedName = t ? t(personality.name) : personality.name
  const resolvedDesc = t ? t(personality.desc) : personality.desc
  const dimDesc = quiz.dimensions
    .map((d) => `${t ? t(quiz.dimensionLabels[d]) : quiz.dimensionLabels[d]}: ${scores[d]}`)
    .join(', ')

  const isZh = !lang || lang.startsWith('zh')

  if (isZh) {
    return {
      system: `你是一个幽默毒舌的分析师。用户刚做了一个人格测试，你需要根据他的测试结果给出一段个性化、有趣、有梗的解读。
要求：
1. 返回纯 JSON，格式：{"title":"一句话标题（15字以内，要有梗）","description":"100字左右的个性化解读，幽默有梗，让人想截图","tip":"一句实用建议"}
2. title 要像朋友圈文案一样吸引人
3. description 要具体、有画面感，不要泛泛而谈
4. 只返回 JSON，不要其他内容`,
      messages: [
        {
          role: 'user',
          content: `测试类型：${resolvedTitle}\n结果人格：${resolvedName}（${resolvedDesc}）\n各维度得分：${dimDesc}\n请给出个性化解读。`,
        },
      ],
    }
  }

  const langNames = { en: 'English', ja: '日本語', es: 'español', fr: 'français' }
  const langName = langNames[lang] || lang

  return {
    system: `You are a witty, sharp personality analyst. The user just completed a personality quiz and you need to give a personalized, fun, and memorable interpretation.
Requirements:
1. Return pure JSON: {"title":"catchy one-liner (max 15 words)","description":"~80 words personalized interpretation, humorous and vivid","tip":"one practical tip"}
2. The title should be attention-grabbing like a social media caption
3. The description should be specific and vivid, not generic
4. Return ONLY JSON, nothing else
5. IMPORTANT: Respond entirely in ${langName}`,
    messages: [
      {
        role: 'user',
        content: `Quiz: ${resolvedTitle}\nPersonality: ${resolvedName} (${resolvedDesc})\nDimension scores: ${dimDesc}\nGive a personalized interpretation in ${langName}.`,
      },
    ],
  }
}

/**
 * Save quiz result to localStorage.
 */
export function saveQuizResult(type, result) {
  try {
    const key = 'quiz_results'
    const existing = JSON.parse(localStorage.getItem(key) || '{}')
    existing[type] = { ...result, timestamp: Date.now() }
    localStorage.setItem(key, JSON.stringify(existing))
  } catch { /* quota */ }
}

/**
 * Load quiz result from localStorage.
 */
export function loadQuizResult(type) {
  try {
    const existing = JSON.parse(localStorage.getItem('quiz_results') || '{}')
    return existing[type] || null
  } catch { return null }
}
