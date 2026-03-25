import { Link, useLocation } from 'react-router-dom'

export default function Layout({ children }) {
  const location = useLocation()
  const hasApiKey = !!localStorage.getItem('ai_api_key')

  const navItems = [
    { path: '/', label: '上传文档' },
    { path: '/history', label: '历史记录' },
    { path: '/settings', label: '设置' },
  ]

  return (
    <div className="min-h-screen no-print" style={{ background: 'var(--bg-primary)' }}>
      {/* 毛玻璃吸顶导航 */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: 'rgba(10, 10, 15, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 no-underline">
            <img
              src="/logo.jpg"
              alt="Logo"
              className="rounded-lg"
              style={{ width: '32px', height: '32px', objectFit: 'cover' }}
            />
            <span className="text-lg font-bold text-gradient">Harry的验收助手</span>
          </Link>

          {/* 导航链接 */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="no-underline px-4 py-1.5 rounded-lg text-sm transition-all duration-200"
                  style={{
                    background: isActive
                      ? 'var(--gradient-primary)'
                      : 'transparent',
                    color: isActive ? 'white' : 'var(--text-secondary)',
                    fontWeight: isActive ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.target.style.background = 'rgba(255,255,255,0.05)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.target.style.background = 'transparent'
                  }}
                >
                  {item.label}
                </Link>
              )
            })}

            {/* API 状态指示 */}
            <div className="ml-3 flex items-center gap-1.5" title={hasApiKey ? 'API 已配置' : 'API 未配置'}>
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: hasApiKey ? '#22c55e' : '#475569',
                  boxShadow: hasApiKey ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* 底部渐变线 */}
        <div
          className="h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)' }}
        />
      </nav>

      {/* 内容区 */}
      <main className="max-w-5xl mx-auto px-6 pt-20 pb-12">{children}</main>
    </div>
  )
}
