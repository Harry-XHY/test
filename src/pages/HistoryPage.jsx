import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAllDocs, deleteDoc as dbDeleteDoc } from '../lib/db'

export default function HistoryPage() {
  const [docs, setDocs] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    getAllDocs().then((d) => { setDocs(d); setLoading(false) })
  }, [])

  const filtered = docs
    .filter((d) => typeFilter === 'all' || (d.type || 'checklist') === typeFilter)
    .filter((d) => !search || d.filename.toLowerCase().includes(search.toLowerCase()))

  const handleDelete = async (id) => {
    if (!confirm('确定删除这条记录？')) return
    await dbDeleteDoc(id)
    setDocs((prev) => prev.filter((d) => d.id !== id))
  }

  const relativeTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins} 分钟前`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} 小时前`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `${days} 天前`
    return new Date(dateStr).toLocaleDateString('zh-CN')
  }

  if (loading) {
    return <div className="text-center py-24" style={{ color: 'var(--text-muted)' }}>加载中...</div>
  }

  if (docs.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="mb-6">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="mx-auto" style={{ opacity: 0.3 }}>
            <rect x="12" y="8" width="40" height="48" rx="6" stroke="url(#hg)" strokeWidth="2" />
            <path d="M22 24h20M22 32h16M22 40h10" stroke="url(#hg)" strokeWidth="2" strokeLinecap="round" />
            <defs>
              <linearGradient id="hg" x1="12" y1="8" x2="52" y2="56">
                <stop stopColor="#3b82f6" /><stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <p className="text-lg mb-2" style={{ color: 'var(--text-secondary)' }}>还没有验收记录</p>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>上传需求文档开始第一次验收</p>
        <Link to="/" className="btn-gradient no-underline inline-block">上传文档</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>历史记录</h1>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{docs.length} 份文档</span>
      </div>

      {/* 搜索 */}
      <div className="mb-6">
        <input
          className="w-full px-4 py-2.5 rounded-xl text-sm"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
          placeholder="搜索文件名..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 类型筛选 */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'all', label: '全部' },
          { key: 'checklist', label: '验收' },
          { key: 'merge', label: '整合' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTypeFilter(tab.key)}
            className="text-xs px-3 py-1 rounded-md cursor-pointer border-none transition-colors"
            style={{
              background: typeFilter === tab.key ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: typeFilter === tab.key ? '#818cf8' : 'var(--text-muted)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((doc) => {
          const total = doc.checklist?.summary?.total_items || 0
          const modules = doc.checklist?.modules?.length || 0

          return (
            <Link
              key={doc.id}
              to={doc.type === 'merge' ? `/merge/${doc.id}` : `/checklist/${doc.id}`}
              className="glass-card p-5 no-underline transition-all duration-200 block"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {doc.filename}
                  </h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {relativeTime(doc.createdAt)}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(doc.id) }}
                  className="text-xs bg-transparent border-none cursor-pointer ml-2 shrink-0 transition-colors"
                  style={{ color: 'var(--text-muted)', padding: '4px' }}
                  onMouseEnter={(e) => (e.target.style.color = '#f87171')}
                  onMouseLeave={(e) => (e.target.style.color = 'var(--text-muted)')}
                >
                  ✕
                </button>
              </div>

              {/* 数据摘要 */}
              <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>{total} 检查项</span>
                <span>{modules} 模块</span>
              </div>

              {/* 迷你进度指示 */}
              {total > 0 && (
                <div className="mt-3 w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: '100%', background: 'var(--gradient-primary)', opacity: 0.5 }}
                  />
                </div>
              )}
            </Link>
          )
        })}
      </div>

      {filtered.length === 0 && search && (
        <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
          没有找到匹配「{search}」的文档
        </p>
      )}
    </div>
  )
}
