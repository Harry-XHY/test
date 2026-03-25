import { useState } from 'react'

const priorityDot = {
  P0: { bg: '#ef4444', shadow: '0 0 6px rgba(239,68,68,0.4)', label: '紧急' },
  P1: { bg: '#eab308', shadow: '0 0 6px rgba(234,179,8,0.4)', label: '重要' },
  P2: { bg: '#475569', shadow: 'none', label: '一般' },
}

const categoryLabels = { functional: '功能', boundary: '边界', security: '安全', performance: '性能' }

const statusColors = {
  pass: { dot: '#22c55e', bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.15)' },
  fail: { dot: '#ef4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.15)' },
  skip: { dot: '#64748b', bg: 'rgba(100,116,139,0.06)', border: 'rgba(100,116,139,0.15)' },
  pending: { dot: 'rgba(255,255,255,0.1)', bg: 'transparent', border: 'var(--border-subtle)' },
}

export default function ChecklistItem({ item, verification, onVerify, onNoteChange, onRemove, onPriorityChange }) {
  const [showNote, setShowNote] = useState(false)
  const [showExpected, setShowExpected] = useState(false)
  const [hovered, setHovered] = useState(false)

  const status = verification?.status || 'pending'
  const sc = statusColors[status]
  const pd = priorityDot[item.priority] || priorityDot.P2

  return (
    <div
      className="group rounded-xl px-4 py-3 transition-all duration-200"
      style={{ background: sc.bg, border: `1px solid ${sc.border}` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start gap-3">
        {/* 状态圆点 */}
        <div
          className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 transition-all duration-300"
          style={{ background: sc.dot, boxShadow: status !== 'pending' ? `0 0 6px ${sc.dot}` : 'none' }}
        />

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{item.description}</span>

            {/* 优先级圆点 + tooltip */}
            <div className="relative" title={`${item.priority} - ${pd.label}`}>
              <div
                className="w-2 h-2 rounded-full cursor-pointer"
                style={{ background: pd.bg, boxShadow: pd.shadow }}
                onClick={() => {
                  const next = { P0: 'P1', P1: 'P2', P2: 'P0' }
                  onPriorityChange(next[item.priority])
                }}
              />
            </div>

            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {categoryLabels[item.category] || item.category}
            </span>
          </div>

          {/* 预期结果 */}
          {item.expected_result && (
            <>
              <button
                onClick={() => setShowExpected(!showExpected)}
                className="text-xs bg-transparent border-none cursor-pointer mt-1 transition-colors"
                style={{ color: 'var(--text-muted)', padding: 0 }}
              >
                {showExpected ? '收起' : '预期结果'}
              </button>
              {showExpected && (
                <p
                  className="text-xs mt-1 pl-3 py-1"
                  style={{
                    color: 'var(--text-secondary)',
                    borderLeft: '2px solid rgba(99,102,241,0.3)',
                  }}
                >
                  {item.expected_result}
                </p>
              )}
            </>
          )}

          {/* 备注 */}
          {(showNote || verification?.note) && (
            <textarea
              className="w-full mt-2 p-2.5 text-xs rounded-lg resize-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
              rows={2}
              placeholder="输入备注..."
              value={verification?.note || ''}
              onChange={(e) => onNoteChange(e.target.value)}
            />
          )}
        </div>

        {/* 操作按钮 — hover 显示完整，默认只显示状态 */}
        <div
          className="flex gap-1 shrink-0 transition-opacity duration-200"
          style={{ opacity: hovered ? 1 : (status === 'pending' ? 0.3 : 0.6) }}
        >
          {[
            { s: 'pass', icon: '✓', color: '#22c55e' },
            { s: 'fail', icon: '✗', color: '#ef4444' },
            { s: 'skip', icon: '—', color: '#64748b' },
          ].map((btn) => (
            <button
              key={btn.s}
              onClick={() => {
                onVerify(btn.s)
                if (btn.s === 'fail') setShowNote(true)
              }}
              className="w-7 h-7 rounded-lg text-xs cursor-pointer border-none transition-all duration-200"
              style={{
                background: status === btn.s ? btn.color : 'rgba(255,255,255,0.04)',
                color: status === btn.s ? 'white' : 'var(--text-muted)',
                boxShadow: status === btn.s ? `0 0 8px ${btn.color}40` : 'none',
              }}
            >
              {btn.icon}
            </button>
          ))}

          {/* 备注 & 删除 — 仅 hover 显示 */}
          {hovered && (
            <>
              <button
                onClick={() => setShowNote(!showNote)}
                className="w-7 h-7 rounded-lg text-xs cursor-pointer border-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}
              >
                💬
              </button>
              <button
                onClick={onRemove}
                className="w-7 h-7 rounded-lg text-xs cursor-pointer border-none transition-colors"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}
              >
                ✕
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
