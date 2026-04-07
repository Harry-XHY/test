import { useEffect, useState } from 'react'
import { pullNotifications, clearNotifications } from '../lib/cloudSync'

// Polls the user's notifications queue once on mount, displays unread alert
// hits as a stack of dismissable banners. After dismissal we tell the server
// to clear the queue so they don't come back on next boot.

export default function NotificationBanner() {
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    pullNotifications().then(list => {
      if (cancelled) return
      const unread = list.filter(n => !n?.read)
      setItems(unread)
      setLoaded(true)
    }).catch(() => setLoaded(true))
    return () => { cancelled = true }
  }, [])

  function dismissAll() {
    setItems([])
    clearNotifications()
  }

  function dismissOne(id) {
    setItems(prev => {
      const next = prev.filter(n => n.id !== id)
      if (next.length === 0) clearNotifications()
      return next
    })
  }

  if (!loaded || items.length === 0) return null

  return (
    <div className="fixed top-3 left-3 right-3 z-[200] flex flex-col gap-2 max-w-md mx-auto pointer-events-none">
      {items.slice(0, 3).map(n => (
        <div
          key={n.id}
          className="pointer-events-auto rounded-2xl px-4 py-3 flex items-start gap-3 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(123,61,255,0.95), rgba(91,140,255,0.95))',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <span className="material-symbols-outlined text-white text-[20px] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
            notifications_active
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium leading-snug break-words">{n.message}</p>
            <p className="text-white/60 text-[10px] mt-1">
              {new Date(n.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </p>
          </div>
          <button
            onClick={() => dismissOne(n.id)}
            className="text-white/80 hover:text-white text-lg leading-none px-1"
            title="知道了"
          >
            ×
          </button>
        </div>
      ))}
      {items.length > 3 && (
        <button
          onClick={dismissAll}
          className="pointer-events-auto self-center text-[11px] text-white/80 bg-black/40 backdrop-blur px-3 py-1 rounded-full"
        >
          还有 {items.length - 3} 条 · 全部知道了
        </button>
      )}
    </div>
  )
}
