import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import RestaurantCard from './RestaurantCard'

export default function FoodVoteModal({ isOpen, restaurants, onClose, onCreate }) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(new Set())
  const [question, setQuestion] = useState('')
  const [deadlineMin, setDeadlineMin] = useState(120)

  if (!isOpen) return null

  const deadlineOptions = [
    { value: 15, label: t('foodVote.deadline_15m') },
    { value: 30, label: t('foodVote.deadline_30m') },
    { value: 60, label: t('foodVote.deadline_1h') },
    { value: 120, label: t('foodVote.deadline_2h') },
    { value: 360, label: t('foodVote.deadline_6h') },
    { value: 1440, label: t('foodVote.deadline_24h') },
  ]

  function togglePlace(placeId) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(placeId)) {
        next.delete(placeId)
      } else if (next.size < 4) {
        next.add(placeId)
      }
      return next
    })
  }

  const selectedRestaurants = restaurants.filter(r => selected.has(r.placeId))
  const canCreate = selectedRestaurants.length >= 2

  function handleCreate() {
    if (!canCreate) return
    onCreate({
      restaurants: selectedRestaurants,
      deadlineMinutes: deadlineMin,
      question: question.trim() || t('foodVote.default_question'),
    })
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col"
        style={{ background: '#0f141a', border: '1px solid rgba(255,255,255,0.06)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <h2 className="text-[16px] font-bold" style={{ color: '#f1f3fc' }}>{t('foodVote.title')}</h2>
            <p className="text-[11px] mt-0.5" style={{ color: '#52555c' }}>
              {selectedRestaurants.length} / 4 {t('foodVote.select_restaurants')}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg grid place-items-center hover:bg-white/5 transition-colors" style={{ color: '#52555c' }}>
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
          {/* Restaurant selection */}
          <div className="flex flex-col gap-2">
            {restaurants.slice(0, 20).map(r => {
              const isSelected = selected.has(r.placeId)
              return (
                <button
                  key={r.placeId}
                  onClick={() => togglePlace(r.placeId)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left w-full"
                  style={{
                    background: isSelected ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isSelected ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)'}`,
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isSelected ? '#f59e0b' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${isSelected ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
                    }}
                  >
                    {isSelected && <span className="material-symbols-outlined text-[14px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: isSelected ? '#f59e0b' : '#f1f3fc' }}>{r.name}</p>
                    <p className="text-[10px]" style={{ color: '#52555c' }}>{r.cuisine || (r.types?.slice(0,2).join(', '))} · {r.distance}m</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Deadline */}
          <div>
            <label className="text-[11px] font-medium mb-2 block" style={{ color: '#72757d' }}>{t('foodVote.deadline')}</label>
            <div className="flex flex-wrap gap-1.5">
              {deadlineOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDeadlineMin(opt.value)}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg transition-all"
                  style={{
                    background: deadlineMin === opt.value ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)',
                    color: deadlineMin === opt.value ? '#f59e0b' : '#72757d',
                    border: `1px solid ${deadlineMin === opt.value ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom question */}
          <div>
            <label className="text-[11px] font-medium mb-2 block" style={{ color: '#72757d' }}>{t('foodVote.custom_question')}</label>
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder={t('foodVote.default_question')}
              className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none"
              style={{ background: 'rgba(255,255,255,0.03)', color: '#f1f3fc', border: '1px solid rgba(255,255,255,0.06)' }}
            />
          </div>
        </div>

        <div className="px-5 pb-5 pt-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="w-full py-3 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.98] disabled:opacity-30"
            style={{
              background: canCreate ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.03)',
              color: '#f59e0b',
              border: `1px solid ${canCreate ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {canCreate ? t('foodVote.create_vote') : `${t('foodVote.min_restaurants')} (2-4)`}
          </button>
        </div>
      </div>
    </div>
  )
}
