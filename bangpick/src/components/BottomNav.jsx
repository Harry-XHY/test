import { Link, useLocation } from 'react-router-dom'

export default function BottomNav() {
  const { pathname } = useLocation()
  return (
    <nav style={{ background: 'rgba(10,14,20,0.95)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
         className="fixed bottom-0 left-0 right-0 flex z-50">
      <Link to="/" className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${pathname === '/' ? 'text-[#b6a0ff]' : 'text-[#72757d]'}`}>
        <span className="material-symbols-outlined text-xl">psychology</span>
        帮我选
      </Link>
      <Link to="/stock" className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${pathname === '/stock' ? 'text-[#b6a0ff]' : 'text-[#72757d]'}`}>
        <span className="material-symbols-outlined text-xl">candlestick_chart</span>
        炒股助手
      </Link>
      <Link to="/watchlist" className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${pathname === '/watchlist' ? 'text-[#b6a0ff]' : 'text-[#72757d]'}`}>
        <span className="material-symbols-outlined text-xl">bookmark_star</span>
        自选股
      </Link>
    </nav>
  )
}
