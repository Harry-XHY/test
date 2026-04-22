import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getDietaryProfile, saveDietaryProfile, getDefaultProfile, ALLERGEN_OPTIONS } from '../lib/dietaryProfile'

export default function DietaryProfileModal({ isOpen, onClose }) {
  const { t } = useTranslation()
  const [profile, setProfile] = useState(getDefaultProfile())
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const existing = getDietaryProfile()
      setProfile(existing || getDefaultProfile())
      setSaved(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  function toggle(key) {
    setProfile(p => ({ ...p, [key]: !p[key] }))
    setSaved(false)
  }

  function setField(key, value) {
    setProfile(p => ({ ...p, [key]: value }))
    setSaved(false)
  }

  function toggleAllergen(key) {
    setProfile(p => {
      const next = p.allergens.includes(key)
        ? p.allergens.filter(a => a !== key)
        : [...p.allergens, key]
      return { ...p, allergens: next }
    })
    setSaved(false)
  }

  function handleSave() {
    saveDietaryProfile(profile)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const boolFields = [
    { key: 'vegetarian', icon: 'eco' },
    { key: 'vegan', icon: 'forest' },
    { key: 'halal', icon: 'mosque' },
    { key: 'glutenFree', icon: 'bakery_dining' },
  ]

  const spiceOptions = [
    { value: 'none', label: t('dietary.spice_none'), icon: 'block' },
    { value: 'mild', label: t('dietary.spice_mild'), icon: 'water_drop' },
    { value: 'medium', label: t('dietary.spice_medium'), icon: 'local_fire_department' },
    { value: 'hot', label: t('dietary.spice_hot'), icon: 'whatshot' },
  ]

  const budgetOptions = [
    { value: 'cheap', label: t('dietary.budget_cheap'), icon: 'savings' },
    { value: 'moderate', label: t('dietary.budget_moderate'), icon: 'payments' },
    { value: 'expensive', label: t('dietary.budget_expensive'), icon: 'diamond' },
    { value: 'any', label: t('dietary.budget_any'), icon: 'all_inclusive' },
  ]

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col"
        style={{ background: '#0f141a', border: '1px solid rgba(255,255,255,0.06)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <h2 className="text-[16px] font-bold" style={{ color: '#f1f3fc' }}>{t('dietary.title')}</h2>
            <p className="text-[11px] mt-0.5" style={{ color: '#52555c' }}>{t('dietary.subtitle')}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg grid place-items-center hover:bg-white/5 transition-colors" style={{ color: '#52555c' }}>
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5">
          {/* Boolean toggles */}
          <div className="grid grid-cols-2 gap-2">
            {boolFields.map(({ key, icon }) => (
              <button
                key={key}
                onClick={() => toggle(key)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all text-left"
                style={{
                  background: profile[key] ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${profile[key] ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <span className="material-symbols-outlined text-[16px]" style={{ color: profile[key] ? '#4ade80' : '#52555c', fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                <span className="text-[12px] font-medium" style={{ color: profile[key] ? '#4ade80' : '#a8abb3' }}>{t(`dietary.${key}`)}</span>
              </button>
            ))}
          </div>

          {/* Allergens */}
          <div>
            <label className="text-[11px] font-medium mb-2 block" style={{ color: '#72757d' }}>{t('dietary.allergens')}</label>
            <div className="flex flex-wrap gap-1.5">
              {ALLERGEN_OPTIONS.map(({ key, labelKey }) => {
                const active = profile.allergens.includes(key)
                return (
                  <button
                    key={key}
                    onClick={() => toggleAllergen(key)}
                    className="text-[11px] px-2.5 py-1 rounded-lg transition-all"
                    style={{
                      background: active ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)',
                      color: active ? '#f87171' : '#72757d',
                      border: `1px solid ${active ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    {t(`dietary.${labelKey}`)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Spice tolerance */}
          <div>
            <label className="text-[11px] font-medium mb-2 block" style={{ color: '#72757d' }}>{t('dietary.spice_tolerance')}</label>
            <div className="flex gap-1.5">
              {spiceOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setField('spiceTolerance', opt.value)}
                  className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all"
                  style={{
                    background: profile.spiceTolerance === opt.value ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${profile.spiceTolerance === opt.value ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]" style={{ color: profile.spiceTolerance === opt.value ? '#f59e0b' : '#52555c', fontVariationSettings: "'FILL' 1" }}>{opt.icon}</span>
                  <span className="text-[10px]" style={{ color: profile.spiceTolerance === opt.value ? '#f59e0b' : '#72757d' }}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Budget preference */}
          <div>
            <label className="text-[11px] font-medium mb-2 block" style={{ color: '#72757d' }}>{t('dietary.budget_preference')}</label>
            <div className="flex gap-1.5">
              {budgetOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setField('budgetPreference', opt.value)}
                  className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all"
                  style={{
                    background: profile.budgetPreference === opt.value ? 'rgba(91,140,255,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${profile.budgetPreference === opt.value ? 'rgba(91,140,255,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]" style={{ color: profile.budgetPreference === opt.value ? '#5b8cff' : '#52555c', fontVariationSettings: "'FILL' 1" }}>{opt.icon}</span>
                  <span className="text-[10px]" style={{ color: profile.budgetPreference === opt.value ? '#5b8cff' : '#72757d' }}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <button
            onClick={handleSave}
            className="w-full py-3 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.98]"
            style={{
              background: saved ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.12)',
              color: saved ? '#4ade80' : '#f59e0b',
              border: `1px solid ${saved ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.2)'}`,
            }}
          >
            {saved ? t('dietary.saved') : t('dietary.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
