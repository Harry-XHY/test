import { useState } from 'react'
import ChecklistItem from './ChecklistItem'

export default function ChecklistView({
  modules, verifications, onVerify, onNoteChange, onRemoveItem,
  onPriorityChange, onAddItem, getModuleStats,
}) {
  const [collapsed, setCollapsed] = useState({})
  const [addingTo, setAddingTo] = useState(null)
  const [newItemDesc, setNewItemDesc] = useState('')

  const toggleCollapse = (idx) => setCollapsed((p) => ({ ...p, [idx]: !p[idx] }))

  const handleAddItem = (mi) => {
    if (!newItemDesc.trim()) return
    onAddItem(mi, {
      id: `${mi + 1}.${modules[mi].items.length + 1}`,
      description: newItemDesc.trim(),
      priority: 'P1',
      category: 'functional',
      expected_result: '',
    })
    setNewItemDesc('')
    setAddingTo(null)
  }

  // 模块状态颜色条
  const getModuleBarColor = (stats) => {
    if (stats.fail > 0) return '#ef4444'
    if (stats.total === stats.pass && stats.total > 0) return '#22c55e'
    if (stats.pass > 0) return '#3b82f6'
    return 'rgba(255,255,255,0.08)'
  }

  return (
    <div className="space-y-4">
      {modules.map((mod, mi) => {
        const stats = getModuleStats(mod)
        const isCollapsed = collapsed[mi]
        const barColor = getModuleBarColor(stats)

        return (
          <div key={mi} className="glass-card overflow-hidden" style={{ borderLeftWidth: '3px', borderLeftColor: barColor }}>
            {/* 模块标题 */}
            <button
              onClick={() => toggleCollapse(mi)}
              className="w-full px-5 py-4 flex items-center justify-between cursor-pointer border-none text-left transition-colors"
              style={{ background: 'transparent' }}
            >
              <div className="flex items-center gap-3">
                <svg
                  width="12" height="12" viewBox="0 0 12 12"
                  className="transition-transform duration-200"
                  style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', color: 'var(--text-muted)' }}
                >
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
                <span className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: '15px' }}>
                  {mod.name}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {mod.items.length} 项
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* 迷你进度条 */}
                <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.rate}%`,
                      background: stats.fail > 0 ? '#ef4444' : stats.rate > 0 ? '#22c55e' : 'transparent',
                    }}
                  />
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)', minWidth: '32px', textAlign: 'right' }}>
                  {stats.rate}%
                </span>
              </div>
            </button>

            {/* 检查项列表 */}
            {!isCollapsed && (
              <div className="px-4 pb-4 space-y-2">
                {mod.items.map((item, ii) => (
                  <ChecklistItem
                    key={item.id}
                    item={item}
                    verification={verifications[item.id]}
                    onVerify={(s) => onVerify(item.id, s)}
                    onNoteChange={(n) => onNoteChange(item.id, n)}
                    onRemove={() => onRemoveItem(mi, ii)}
                    onPriorityChange={(p) => onPriorityChange(mi, ii, p)}
                  />
                ))}

                {/* 添加检查项 */}
                {addingTo === mi ? (
                  <div className="flex gap-2 mt-2">
                    <input
                      className="flex-1 px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                      placeholder="输入新的检查项..."
                      value={newItemDesc}
                      onChange={(e) => setNewItemDesc(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddItem(mi)}
                      autoFocus
                    />
                    <button onClick={() => handleAddItem(mi)} className="btn-gradient" style={{ padding: '8px 16px', fontSize: '13px' }}>
                      添加
                    </button>
                    <button
                      onClick={() => { setAddingTo(null); setNewItemDesc('') }}
                      className="btn-ghost"
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingTo(mi)}
                    className="w-full mt-1 py-2 rounded-lg text-xs cursor-pointer border-none transition-colors"
                    style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => (e.target.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={(e) => (e.target.style.background = 'rgba(255,255,255,0.02)')}
                  >
                    + 添加检查项
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
