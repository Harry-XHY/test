// Quiz questions, options, scoring rules, and personality definitions
// All display text uses i18n keys — resolve with t() in components

// ── Decision Personality Quiz ──────────────────────────────────────────

const DECISION_DIMENSIONS = ['speed', 'basis', 'risk', 'social']

const DECISION_QUESTIONS = [
  {
    q: 'quiz_data.decision.q0',
    options: [
      { text: 'quiz_data.decision.q0_a', scores: { speed: 2, basis: 0 } },
      { text: 'quiz_data.decision.q0_b', scores: { speed: 0, basis: 2 } },
      { text: 'quiz_data.decision.q0_c', scores: { speed: 1, social: 2 } },
      { text: 'quiz_data.decision.q0_d', scores: { speed: 0, basis: 1 } },
    ],
  },
  {
    q: 'quiz_data.decision.q1',
    options: [
      { text: 'quiz_data.decision.q1_a', scores: { speed: 0, risk: 0 } },
      { text: 'quiz_data.decision.q1_b', scores: { speed: 2, risk: 2 } },
      { text: 'quiz_data.decision.q1_c', scores: { speed: 0, basis: 2 } },
      { text: 'quiz_data.decision.q1_d', scores: { speed: 0, social: 2 } },
    ],
  },
  {
    q: 'quiz_data.decision.q2',
    options: [
      { text: 'quiz_data.decision.q2_a', scores: { risk: 2, speed: 2 } },
      { text: 'quiz_data.decision.q2_b', scores: { risk: 0, basis: 2 } },
      { text: 'quiz_data.decision.q2_c', scores: { risk: 0, social: 2 } },
      { text: 'quiz_data.decision.q2_d', scores: { risk: 0, speed: 1 } },
    ],
  },
  {
    q: 'quiz_data.decision.q3',
    options: [
      { text: 'quiz_data.decision.q3_a', scores: { speed: 2, risk: 2 } },
      { text: 'quiz_data.decision.q3_b', scores: { speed: 0, basis: 2 } },
      { text: 'quiz_data.decision.q3_c', scores: { social: 2, speed: 1 } },
      { text: 'quiz_data.decision.q3_d', scores: { social: 1, basis: 1 } },
    ],
  },
  {
    q: 'quiz_data.decision.q4',
    options: [
      { text: 'quiz_data.decision.q4_a', scores: { risk: 2, speed: 2 } },
      { text: 'quiz_data.decision.q4_b', scores: { risk: 0, speed: 0 } },
      { text: 'quiz_data.decision.q4_c', scores: { basis: 2, speed: 0 } },
      { text: 'quiz_data.decision.q4_d', scores: { social: 2, speed: 0 } },
    ],
  },
  {
    q: 'quiz_data.decision.q5',
    options: [
      { text: 'quiz_data.decision.q5_a', scores: { social: 0, speed: 1 } },
      { text: 'quiz_data.decision.q5_b', scores: { social: 1, basis: 1 } },
      { text: 'quiz_data.decision.q5_c', scores: { social: 2, speed: 1 } },
      { text: 'quiz_data.decision.q5_d', scores: { social: 2, speed: 2 } },
    ],
  },
  {
    q: 'quiz_data.decision.q6',
    options: [
      { text: 'quiz_data.decision.q6_a', scores: { speed: 2, risk: 1 } },
      { text: 'quiz_data.decision.q6_b', scores: { speed: 0, basis: 2 } },
      { text: 'quiz_data.decision.q6_c', scores: { speed: 1, basis: 1 } },
      { text: 'quiz_data.decision.q6_d', scores: { social: 2, speed: 0 } },
    ],
  },
  {
    q: 'quiz_data.decision.q7',
    options: [
      { text: 'quiz_data.decision.q7_a', scores: { speed: 2, risk: 1 } },
      { text: 'quiz_data.decision.q7_b', scores: { speed: 0, basis: 1 } },
      { text: 'quiz_data.decision.q7_c', scores: { basis: 2, speed: 0 } },
      { text: 'quiz_data.decision.q7_d', scores: { social: 2, speed: 1 } },
    ],
  },
]

const DECISION_PERSONALITIES = [
  {
    id: 'flash',
    name: 'quiz_data.decision.p_flash_name',
    emoji: '⚡',
    color: '#FFD700',
    ideal: { speed: 2, basis: 0, risk: 2, social: 0 },
    desc: 'quiz_data.decision.p_flash_desc',
    fallback: 'quiz_data.decision.p_flash_fallback',
  },
  {
    id: 'strategist',
    name: 'quiz_data.decision.p_strategist_name',
    emoji: '🧠',
    color: '#7C98FF',
    ideal: { speed: 0, basis: 2, risk: 0, social: 0 },
    desc: 'quiz_data.decision.p_strategist_desc',
    fallback: 'quiz_data.decision.p_strategist_fallback',
  },
  {
    id: 'gambler',
    name: 'quiz_data.decision.p_gambler_name',
    emoji: '🎲',
    color: '#FF6B6B',
    ideal: { speed: 2, basis: 0, risk: 2, social: 0 },
    desc: 'quiz_data.decision.p_gambler_desc',
    fallback: 'quiz_data.decision.p_gambler_fallback',
  },
  {
    id: 'democrat',
    name: 'quiz_data.decision.p_democrat_name',
    emoji: '🗳️',
    color: '#22C55E',
    ideal: { speed: 0, basis: 0, risk: 0, social: 2 },
    desc: 'quiz_data.decision.p_democrat_desc',
    fallback: 'quiz_data.decision.p_democrat_fallback',
  },
  {
    id: 'perfectionist',
    name: 'quiz_data.decision.p_perfectionist_name',
    emoji: '💎',
    color: '#B6A0FF',
    ideal: { speed: 0, basis: 2, risk: 0, social: 0 },
    desc: 'quiz_data.decision.p_perfectionist_desc',
    fallback: 'quiz_data.decision.p_perfectionist_fallback',
  },
  {
    id: 'zen',
    name: 'quiz_data.decision.p_zen_name',
    emoji: '☯️',
    color: '#57BCFF',
    ideal: { speed: 2, basis: 0, risk: 0, social: 1 },
    desc: 'quiz_data.decision.p_zen_desc',
    fallback: 'quiz_data.decision.p_zen_fallback',
  },
]

// ── Investor Style Quiz ────────────────────────────────────────────────

const INVESTOR_DIMENSIONS = ['horizon', 'analysis', 'mentality', 'frequency']

const INVESTOR_QUESTIONS = [
  {
    q: 'quiz_data.investor.q0',
    options: [
      { text: 'quiz_data.investor.q0_a', scores: { horizon: 0, frequency: 2 } },
      { text: 'quiz_data.investor.q0_b', scores: { horizon: 1, mentality: 1 } },
      { text: 'quiz_data.investor.q0_c', scores: { horizon: 2, analysis: 2 } },
      { text: 'quiz_data.investor.q0_d', scores: { mentality: 2, horizon: 0 } },
    ],
  },
  {
    q: 'quiz_data.investor.q1',
    options: [
      { text: 'quiz_data.investor.q1_a', scores: { analysis: 0, frequency: 1 } },
      { text: 'quiz_data.investor.q1_b', scores: { analysis: 2, horizon: 2 } },
      { text: 'quiz_data.investor.q1_c', scores: { analysis: 0, frequency: 2 } },
      { text: 'quiz_data.investor.q1_d', scores: { analysis: 2, horizon: 1 } },
    ],
  },
  {
    q: 'quiz_data.investor.q2',
    options: [
      { text: 'quiz_data.investor.q2_a', scores: { mentality: 0, frequency: 2 } },
      { text: 'quiz_data.investor.q2_b', scores: { mentality: 2, horizon: 1 } },
      { text: 'quiz_data.investor.q2_c', scores: { analysis: 2, mentality: 1 } },
      { text: 'quiz_data.investor.q2_d', scores: { horizon: 2, mentality: 1 } },
    ],
  },
  {
    q: 'quiz_data.investor.q3',
    options: [
      { text: 'quiz_data.investor.q3_a', scores: { frequency: 2, horizon: 0 } },
      { text: 'quiz_data.investor.q3_b', scores: { frequency: 1, horizon: 0 } },
      { text: 'quiz_data.investor.q3_c', scores: { frequency: 0, horizon: 1 } },
      { text: 'quiz_data.investor.q3_d', scores: { frequency: 0, horizon: 2 } },
    ],
  },
  {
    q: 'quiz_data.investor.q4',
    options: [
      { text: 'quiz_data.investor.q4_a', scores: { mentality: 2, analysis: 0 } },
      { text: 'quiz_data.investor.q4_b', scores: { analysis: 2, mentality: 0 } },
      { text: 'quiz_data.investor.q4_c', scores: { analysis: 0, frequency: 1 } },
      { text: 'quiz_data.investor.q4_d', scores: { mentality: 0, analysis: 1 } },
    ],
  },
  {
    q: 'quiz_data.investor.q5',
    options: [
      { text: 'quiz_data.investor.q5_a', scores: { horizon: 0, frequency: 2 } },
      { text: 'quiz_data.investor.q5_b', scores: { horizon: 2, frequency: 0 } },
      { text: 'quiz_data.investor.q5_c', scores: { mentality: 0, frequency: 1 } },
      { text: 'quiz_data.investor.q5_d', scores: { mentality: 2, analysis: 0 } },
    ],
  },
  {
    q: 'quiz_data.investor.q6',
    options: [
      { text: 'quiz_data.investor.q6_a', scores: { mentality: 2, horizon: 0 } },
      { text: 'quiz_data.investor.q6_b', scores: { mentality: 1, analysis: 1 } },
      { text: 'quiz_data.investor.q6_c', scores: { mentality: 0, analysis: 1 } },
      { text: 'quiz_data.investor.q6_d', scores: { horizon: 2, mentality: 0 } },
    ],
  },
  {
    q: 'quiz_data.investor.q7',
    options: [
      { text: 'quiz_data.investor.q7_a', scores: { horizon: 2, analysis: 2 } },
      { text: 'quiz_data.investor.q7_b', scores: { horizon: 0, frequency: 2 } },
      { text: 'quiz_data.investor.q7_c', scores: { mentality: 2, analysis: 1 } },
      { text: 'quiz_data.investor.q7_d', scores: { analysis: 2, horizon: 1 } },
    ],
  },
]

const INVESTOR_PERSONALITIES = [
  {
    id: 'daytrader',
    name: 'quiz_data.investor.p_daytrader_name',
    emoji: '🎯',
    color: '#FF6B6B',
    ideal: { horizon: 0, analysis: 0, mentality: 2, frequency: 2 },
    desc: 'quiz_data.investor.p_daytrader_desc',
    fallback: 'quiz_data.investor.p_daytrader_fallback',
  },
  {
    id: 'buffett',
    name: 'quiz_data.investor.p_buffett_name',
    emoji: '🏛️',
    color: '#22C55E',
    ideal: { horizon: 2, analysis: 2, mentality: 0, frequency: 0 },
    desc: 'quiz_data.investor.p_buffett_desc',
    fallback: 'quiz_data.investor.p_buffett_fallback',
  },
  {
    id: 'quant',
    name: 'quiz_data.investor.p_quant_name',
    emoji: '🤖',
    color: '#7C98FF',
    ideal: { horizon: 0, analysis: 0, mentality: 0, frequency: 1 },
    desc: 'quiz_data.investor.p_quant_desc',
    fallback: 'quiz_data.investor.p_quant_fallback',
  },
  {
    id: 'zen_investor',
    name: 'quiz_data.investor.p_zen_investor_name',
    emoji: '🧘',
    color: '#B6A0FF',
    ideal: { horizon: 2, analysis: 1, mentality: 0, frequency: 0 },
    desc: 'quiz_data.investor.p_zen_investor_desc',
    fallback: 'quiz_data.investor.p_zen_investor_fallback',
  },
  {
    id: 'allrounder',
    name: 'quiz_data.investor.p_allrounder_name',
    emoji: '👑',
    color: '#FFD700',
    ideal: { horizon: 1, analysis: 1, mentality: 2, frequency: 1 },
    desc: 'quiz_data.investor.p_allrounder_desc',
    fallback: 'quiz_data.investor.p_allrounder_fallback',
  },
  {
    id: 'news_trader',
    name: 'quiz_data.investor.p_news_trader_name',
    emoji: '📡',
    color: '#57BCFF',
    ideal: { horizon: 0, analysis: 2, mentality: 1, frequency: 2 },
    desc: 'quiz_data.investor.p_news_trader_desc',
    fallback: 'quiz_data.investor.p_news_trader_fallback',
  },
]

// ── Exports ────────────────────────────────────────────────────────────

export const QUIZZES = {
  decision: {
    title: 'quiz_data.decision.title',
    subtitle: 'quiz_data.decision.subtitle',
    icon: '🔮',
    color: '#B6A0FF',
    dimensions: DECISION_DIMENSIONS,
    dimensionLabels: { speed: 'quiz_data.decision.dim_speed', basis: 'quiz_data.decision.dim_basis', risk: 'quiz_data.decision.dim_risk', social: 'quiz_data.decision.dim_social' },
    questions: DECISION_QUESTIONS,
    personalities: DECISION_PERSONALITIES,
  },
  investor: {
    title: 'quiz_data.investor.title',
    subtitle: 'quiz_data.investor.subtitle',
    icon: '📈',
    color: '#22C55E',
    dimensions: INVESTOR_DIMENSIONS,
    dimensionLabels: { horizon: 'quiz_data.investor.dim_horizon', analysis: 'quiz_data.investor.dim_analysis', mentality: 'quiz_data.investor.dim_mentality', frequency: 'quiz_data.investor.dim_frequency' },
    questions: INVESTOR_QUESTIONS,
    personalities: INVESTOR_PERSONALITIES,
  },
}
