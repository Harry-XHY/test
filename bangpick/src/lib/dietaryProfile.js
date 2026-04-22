// Dietary profile CRUD + prompt builder + client-side matcher
import { schedulePush } from './cloudSync'

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
  } else if (profile.budgetPreference === 'expensive') {
    parts.push(isZh ? '用户愿意花更多钱享受美食，可推荐高档餐厅。' : 'User is willing to spend more. High-end recommendations welcome.')
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
  if (profile.budgetPreference === 'expensive') tags.push(t('dietary.budget_expensive'))
  return tags
}
