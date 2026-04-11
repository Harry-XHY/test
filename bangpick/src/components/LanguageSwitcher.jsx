import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)
  const menuRef = useRef(null)

  const current = LANGUAGES.find(l => i18n.language?.startsWith(l.code)) || LANGUAGES[0]

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (btnRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const rect = open && btnRef.current ? btnRef.current.getBoundingClientRect() : null

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all active:scale-95"
        style={{
          color: open ? '#b6a0ff' : '#a8abb3',
          background: open ? 'rgba(182,160,255,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? 'rgba(182,160,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
        }}
      >
        <span className="text-[13px] leading-none">{current.flag}</span>
        <span>{current.label}</span>
        <span className="material-symbols-outlined text-[12px] transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }}>expand_more</span>
      </button>

      {open && rect && createPortal(
        <div
          ref={menuRef}
          className="fixed rounded-2xl overflow-hidden"
          style={{
            top: rect.bottom + 6,
            right: window.innerWidth - rect.right,
            background: 'rgba(22,27,38,0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
            zIndex: 9999,
            minWidth: '140px',
            animation: 'langDropIn 0.2s ease-out',
          }}
        >
          <div className="p-1.5">
            {LANGUAGES.map(l => {
              const active = i18n.language?.startsWith(l.code)
              return (
                <button
                  key={l.code}
                  onClick={() => { i18n.changeLanguage(l.code); setOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all active:scale-[0.97]"
                  style={{
                    color: active ? '#f1f3fc' : '#8b8e96',
                    background: active ? 'rgba(182,160,255,0.12)' : 'transparent',
                  }}
                >
                  <span className="text-[15px] leading-none">{l.flag}</span>
                  <span className="flex-1 text-left">{l.label}</span>
                  {active && (
                    <span className="material-symbols-outlined text-[14px]" style={{ color: '#b6a0ff', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  )}
                </button>
              )
            })}
          </div>
          <style>{`
            @keyframes langDropIn {
              from { opacity: 0; transform: translateY(-6px) scale(0.96); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>,
        document.body
      )}
    </>
  )
}
