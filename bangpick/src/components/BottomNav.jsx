import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function BottomNav() {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  return (
    <nav style={{ background: 'rgba(10,14,20,0.95)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
         className="fixed bottom-0 left-0 right-0 flex z-50">
      <Link to="/" className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${pathname === '/' ? 'text-[#b6a0ff]' : 'text-[#72757d]'}`}>
        <span className="material-symbols-outlined text-xl">psychology</span>
        {t('nav.home')}
      </Link>
      <Link to="/stock" className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${pathname === '/stock' ? 'text-[#b6a0ff]' : 'text-[#72757d]'}`}>
        <span className="material-symbols-outlined text-xl">candlestick_chart</span>
        {t('nav.stock')}
      </Link>
      <Link to="/food" className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${pathname === '/food' ? 'text-[#b6a0ff]' : 'text-[#72757d]'}`}>
        <span className="material-symbols-outlined text-xl">restaurant</span>
        {t('nav.food')}
      </Link>
    </nav>
  )
}
