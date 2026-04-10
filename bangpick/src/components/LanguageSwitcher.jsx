import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const current = LANGUAGES.find(l => i18n.language?.startsWith(l.code)) || LANGUAGES[0]

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors hover:bg-white/10"
        style={{ color: '#a8abb3', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span className="material-symbols-outlined text-[14px]">language</span>
        {current.label}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden shadow-xl z-50"
          style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', minWidth: '100px' }}
        >
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => { i18n.changeLanguage(l.code); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/10"
              style={{ color: i18n.language?.startsWith(l.code) ? '#b6a0ff' : '#a8abb3' }}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
