// Dietary profile CRUD + prompt builder + list matcher
import { schedulePush } from './cloudSync.js'

const STORAGE_KEY = 'bangpick_dietary_profile'

const ALLERGENS = [
  { key: 'peanuts', labelKey: 'allergen_peanuts' },
  { key: 'treeNuts', labelKey: 'allergen_tree_nuts' },
  { key: 'dairy', labelKey: 'allergen_dairy' },
  { key: 'eggs', labelKey: 'allergen_eggs' },
  { key: 'shellfish', labelKey: 'allergen_shellfish' },
  { key: 'fish', labelKey: 'allergen_fish' },
  { key: 'soy', labelKey: 'allergen_soy' },
  { key: 'wheat', labelKey: 'allergen_wheat' },
  { key: 'sesame', labelKey: 'allergen_sesame' },
]

const DIETARY_TERMS = {
  vegetarian: ['vegetarian', 'veggie', '素食'],
  vegan: ['vegan', 'plant-based', '纯素'],
  halal: ['halal', '清真'],
  glutenFree: ['gluten free', 'gluten-free', '无麸质'],
}

const MEAT_HEAVY_TERMS = ['bbq', 'barbecue', 'barbeque', 'steak', 'steakhouse', 'grill', 'yakitori', 'churrasco', '烧烤', '烤肉', '牛排']
const SPICY_TERMS = ['spicy', 'chili', 'chilli', 'pepper', 'hotpot', 'malatang', 'sichuan', 'hunan', '麻辣', '辣', '川菜', '湘菜', '火锅']
const GLUTEN_HEAVY_TERMS = ['bakery', 'boulangerie', 'pastry', 'pizza', 'pasta', 'noodle', 'ramen', 'udon', '面', '面包', '披萨']
const ALLERGEN_CONFLICT_TERMS = {
  shellfish: ['shellfish', 'seafood', 'oyster', 'crab', 'lobster', 'shrimp', '海鲜', '贝类', '螃蟹', '虾'],
  fish: ['fish', 'seafood', 'sushi', '海鲜', '鱼', '寿司'],
  wheat: ['bakery', 'bread', 'pizza', 'pasta', 'noodle', 'ramen', 'udon', '面包', '披萨', '面'],
  dairy: ['ice cream', 'gelato', 'pizza', 'cheese', '奶', '芝士'],
}

export const ALLERGEN_OPTIONS = ALLERGENS

export function getDefaultProfile() {
  return {
    vegetarian: false,
    vegan: false,
    halal: false,
    glutenFree: false,
    allergens: [],
    spiceTolerance: 'medium',
    budgetPreference: 'any',
    updatedAt: Date.now(),
  }
}

export function getDietaryProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return { ...getDefaultProfile(), ...JSON.parse(raw) }
  } catch {
    return null
  }
}

export function saveDietaryProfile(profile) {
  const data = { ...profile, updatedAt: Date.now() }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch { /* ignore */ }
  schedulePush('dietaryProfile', () => data)
  return data
}

export function isProfileActive(profile) {
  if (!profile) return false
  return profile.vegetarian || profile.vegan || profile.halal || profile.glutenFree ||
    (profile.allergens?.length > 0) || profile.spiceTolerance !== 'medium' ||
    (profile.budgetPreference && profile.budgetPreference !== 'any')
}

function normalizeText(value) {
  return String(value || '').toLowerCase()
}

function getRestaurantText(restaurant) {
  return normalizeText([
    restaurant?.name,
    restaurant?.cuisine,
    restaurant?.vicinity,
    ...(Array.isArray(restaurant?.types) ? restaurant.types : []),
  ].filter(Boolean).join(' | '))
}

function hasAny(text, terms) {
  return terms.some(term => text.includes(term))
}

export function evaluateRestaurantDietaryFit(profile, restaurant) {
  if (!isProfileActive(profile) || !restaurant) {
    return { status: 'maybe', scoreDelta: 0, reasons: [], matchedTags: [] }
  }

  const text = getRestaurantText(restaurant)
  const reasons = []
  const matchedTags = []
  let scoreDelta = 0
  let hasStrongConflict = false
  let hasPositiveMatch = false
  let hasUncertainConstraint = false

  const addPositive = (tag, reason, delta) => {
    hasPositiveMatch = true
    scoreDelta += delta
    matchedTags.push(tag)
    reasons.push(reason)
  }

  const addConflict = (reason, delta, strong = false) => {
    scoreDelta += delta
    reasons.push(reason)
    if (strong) hasStrongConflict = true
  }

  if (profile.vegetarian) {
    if (hasAny(text, DIETARY_TERMS.vegetarian) || hasAny(text, DIETARY_TERMS.vegan)) addPositive('vegetarian', 'vegetarian_match', 0.55)
    else if (hasAny(text, MEAT_HEAVY_TERMS)) addConflict('vegetarian_conflict', -1.1, true)
    else hasUncertainConstraint = true
  }

  if (profile.vegan) {
    if (hasAny(text, DIETARY_TERMS.vegan)) addPositive('vegan', 'vegan_match', 0.7)
    else if (hasAny(text, MEAT_HEAVY_TERMS)) addConflict('vegan_conflict', -1.25, true)
    else hasUncertainConstraint = true
  }

  if (profile.halal) {
    if (hasAny(text, DIETARY_TERMS.halal)) addPositive('halal', 'halal_match', 0.75)
    else hasUncertainConstraint = true
  }

  if (profile.glutenFree) {
    if (hasAny(text, DIETARY_TERMS.glutenFree)) addPositive('glutenFree', 'gluten_free_match', 0.65)
    else if (hasAny(text, GLUTEN_HEAVY_TERMS)) addConflict('gluten_free_risk', -0.35)
    else hasUncertainConstraint = true
  }

  for (const allergen of profile.allergens || []) {
    const terms = ALLERGEN_CONFLICT_TERMS[allergen]
    if (terms && hasAny(text, terms)) addConflict(`allergen_${allergen}_risk`, -0.45)
    else hasUncertainConstraint = true
  }

  if (profile.spiceTolerance === 'none') {
    if (hasAny(text, SPICY_TERMS)) addConflict('spice_conflict', -0.75)
    else addPositive('spice_none', 'spice_safe', 0.15)
  } else if (profile.spiceTolerance === 'mild') {
    if (hasAny(text, SPICY_TERMS)) addConflict('spice_mild_risk', -0.35)
    else addPositive('spice_mild', 'spice_mild_match', 0.1)
  } else if (profile.spiceTolerance === 'hot') {
    if (hasAny(text, SPICY_TERMS)) addPositive('spice_hot', 'spice_hot_match', 0.35)
    else hasUncertainConstraint = true
  }

  const priceLevel = Number.isFinite(restaurant?.priceLevel) ? restaurant.priceLevel : null
  if (profile.budgetPreference === 'cheap') {
    if (priceLevel != null) {
      if (priceLevel <= 1) addPositive('budget_cheap', 'budget_cheap_match', 0.4)
      else if (priceLevel >= 3) addConflict('budget_cheap_conflict', -0.6)
    } else {
      hasUncertainConstraint = true
    }
  } else if (profile.budgetPreference === 'moderate') {
    if (priceLevel != null) {
      if (priceLevel === 2) addPositive('budget_moderate', 'budget_moderate_match', 0.3)
      else if (priceLevel >= 4) addConflict('budget_moderate_conflict', -0.35)
    } else {
      hasUncertainConstraint = true
    }
  } else if (profile.budgetPreference === 'expensive') {
    if (priceLevel != null) {
      if (priceLevel >= 3) addPositive('budget_expensive', 'budget_expensive_match', 0.4)
      else if (priceLevel <= 1) addConflict('budget_expensive_conflict', -0.2)
    } else {
      hasUncertainConstraint = true
    }
  }

  let status = 'maybe'
  if (hasStrongConflict) status = 'exclude'
  else if (hasPositiveMatch && scoreDelta > 0) status = 'match'
  else if (!hasUncertainConstraint && scoreDelta >= 0) status = 'match'

  return {
    status,
    scoreDelta: Math.max(-2, Math.min(2, scoreDelta)),
    reasons,
    matchedTags,
  }
}

export function buildDietaryPromptFragment(profile, lang) {
  if (!profile || !isProfileActive(profile)) return ''
  const isZh = !lang || lang.startsWith('zh')
  const parts = []

  if (profile.vegetarian) {
    parts.push(isZh
      ? '用户是素食者，优先推荐有素食选项的餐厅，排除纯肉店/烧烤店。'
      : 'User is vegetarian. Prioritize restaurants with vegetarian options. Exclude BBQ/steak houses.')
  }
  if (profile.vegan) {
    parts.push(isZh
      ? '用户是纯素者，只推荐有纯素选项的餐厅。'
      : 'User is vegan. Only recommend restaurants with clear vegan options.')
  }
  if (profile.halal) {
    parts.push(isZh
      ? '用户需要清真食品。'
      : 'User requires halal food.')
  }
  if (profile.glutenFree) {
    parts.push(isZh
      ? '用户需要无麸质选项。'
      : 'User needs gluten-free options.')
  }
  if (profile.allergens?.length) {
    const allergenNames = profile.allergens.map(a => {
      const opt = ALLERGENS.find(o => o.key === a)
      return opt ? opt.key : a
    })
    parts.push(isZh
      ? `用户对以下食物过敏，必须排除含有这些食材的菜品：${allergenNames.join('、')}。`
      : `User is allergic to: ${allergenNames.join(', ')}. Exclude dishes containing these.`)
  }
  if (profile.spiceTolerance === 'none') {
    parts.push(isZh ? '用户完全不能吃辣。' : 'User cannot tolerate spicy food at all.')
  } else if (profile.spiceTolerance === 'mild') {
    parts.push(isZh ? '用户只能接受微辣。' : 'User prefers mild spice only.')
  } else if (profile.spiceTolerance === 'hot') {
    parts.push(isZh ? '用户喜欢吃辣，优先推荐辣味餐厅。' : 'User loves spicy food. Prioritize spicy cuisine.')
  }
  if (profile.budgetPreference === 'cheap') {
    parts.push(isZh ? '用户预算有限，优先推荐平价餐厅。' : 'User is budget-conscious. Prioritize inexpensive options.')
  } else if (profile.budgetPreference === 'moderate') {
    parts.push(isZh ? '用户更偏好价格适中的餐厅。' : 'User prefers moderately priced restaurants.')
  } else if (profile.budgetPreference === 'expensive') {
    parts.push(isZh ? '用户愿意花钱享受美食，可推荐高档餐厅。' : 'User is willing to spend more. High-end recommendations welcome.')
  }

  return parts.join('\n')
}

export function getDietaryTags(profile, t) {
  if (!profile) return []
  const tags = []
  if (profile.vegetarian) tags.push(t('dietary.vegetarian'))
  if (profile.vegan) tags.push(t('dietary.vegan'))
  if (profile.halal) tags.push(t('dietary.halal'))
  if (profile.glutenFree) tags.push(t('dietary.glutenFree'))
  profile.allergens?.forEach(a => {
    const opt = ALLERGENS.find(o => o.key === a)
    if (opt) tags.push(t(`dietary.${opt.labelKey}`))
  })
  if (profile.spiceTolerance === 'none') tags.push(t('dietary.spice_none'))
  if (profile.spiceTolerance === 'hot') tags.push(t('dietary.spice_hot'))
  if (profile.budgetPreference === 'cheap') tags.push(t('dietary.budget_cheap'))
  if (profile.budgetPreference === 'moderate') tags.push(t('dietary.budget_moderate'))
  if (profile.budgetPreference === 'expensive') tags.push(t('dietary.budget_expensive'))
  return tags
}
