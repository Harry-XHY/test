import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

export default function RestaurantDetail({ detail: d, loading, onClose }) {
  const { t } = useTranslation()
  if (!d) return null

  const navUrl = d.location
    ? `https://www.google.com/maps/dir/?api=1&destination=${d.location.lat},${d.location.lng}&destination_place_id=${d.placeId || ''}`
    : null

  const content = (
    <div className="fixed inset-0 z-[2000] flex flex-col justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative max-h-[75vh] rounded-t-2xl overflow-y-auto"
        style={{ background: '#12161e', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="sticky top-0 z-10 flex justify-center pt-3 pb-2" style={{ background: '#12161e' }}>
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pb-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold" style={{ color: '#f1f3fc' }}>{d.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                {d.rating && (
                  <span className="text-sm font-semibold" style={{ color: '#f59e0b' }}>
                    ⭐ {d.rating}
                    {d.userRatingsTotal > 0 && (
                      <span className="text-[11px] font-normal ml-1" style={{ color: '#72757d' }}>
                        ({d.userRatingsTotal})
                      </span>
                    )}
                  </span>
                )}
                {d.priceLevel != null && (
                  <span className="text-sm" style={{ color: '#72757d' }}>{'¥'.repeat(d.priceLevel || 1)}</span>
                )}
                {d.isOpen != null && (
                  <span className="text-[11px] font-medium" style={{ color: d.isOpen ? '#22c55e' : '#ef4444' }}>
                    {d.isOpen ? t('food.open_now') : t('food.closed')}
                  </span>
                )}
              </div>
              {d.cuisine && (
                <span className="inline-block mt-1.5 text-[11px] px-2 py-0.5 rounded-md"
                  style={{ background: 'rgba(182,160,255,0.1)', color: '#b6a0ff' }}>
                  {d.cuisine}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full grid place-items-center flex-shrink-0 hover:bg-white/10 transition-colors"
              style={{ color: '#72757d' }}
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <span className="material-symbols-outlined animate-spin text-[var(--primary)]">refresh</span>
            </div>
          )}

          {!loading && (
            <>
              {/* Info rows */}
              <div className="flex flex-col gap-2.5 mb-5">
                {d.address && (
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[16px] mt-0.5" style={{ color: '#72757d' }}>location_on</span>
                    <span className="text-sm" style={{ color: '#a8abb3' }}>{d.address}</span>
                  </div>
                )}
                {d.phone && (
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[16px]" style={{ color: '#72757d' }}>call</span>
                    <a href={`tel:${d.phone}`} className="text-sm" style={{ color: '#5B8CFF' }}>{d.phone}</a>
                  </div>
                )}
                {d.website && (
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[16px]" style={{ color: '#72757d' }}>language</span>
                    <a href={d.website} target="_blank" rel="noopener noreferrer" className="text-sm truncate" style={{ color: '#5B8CFF' }}>{d.website}</a>
                  </div>
                )}
                {d.openingHours && Array.isArray(d.openingHours) && (
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[16px] mt-0.5" style={{ color: '#72757d' }}>schedule</span>
                    <div className="flex flex-col gap-0.5">
                      {d.openingHours.map((line, i) => (
                        <span key={i} className="text-[11px]" style={{ color: '#a8abb3' }}>{line}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mb-5">
                {navUrl && (
                  <a
                    href={navUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium"
                    style={{ background: 'linear-gradient(135deg, #5B8CFF, #7A7CFF)', color: '#fff' }}
                  >
                    <span className="material-symbols-outlined text-[18px]">navigation</span>
                    {t('food.navigate')}
                  </a>
                )}
                {d.phone && (
                  <a
                    href={`tel:${d.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f3fc' }}
                  >
                    <span className="material-symbols-outlined text-[18px]">call</span>
                    {t('food.call')}
                  </a>
                )}
              </div>

              {/* Reviews */}
              {d.reviews && d.reviews.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: '#a8abb3' }}>{t('food.reviews')}</h3>
                  <div className="flex flex-col gap-3">
                    {d.reviews.map((rv, i) => (
                      <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium" style={{ color: '#f1f3fc' }}>{rv.author}</span>
                          <span className="text-[10px]" style={{ color: '#f59e0b' }}>{'⭐'.repeat(rv.rating || 0)}</span>
                        </div>
                        <p className="text-[12px] leading-relaxed" style={{ color: '#72757d' }}>{rv.text}</p>
                        {rv.time && <p className="text-[10px] mt-1" style={{ color: '#52555c' }}>{rv.time}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
