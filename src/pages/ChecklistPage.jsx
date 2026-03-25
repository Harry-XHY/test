import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ChecklistView from '../components/ChecklistView'
import { useChecklist } from '../hooks/useChecklist'
import { exportReport } from '../lib/export-report'

function DonutChart({ percent, size = 80, stroke = 6 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ
  const color = percent >= 80 ? '#22c55e' : percent >= 50 ? '#eab308' : percent > 0 ? '#3b82f6' : 'rgba(255,255,255,0.08)'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          className="transition-all duration-700"
          style={{ filter: `drop-shadow(0 0 4px ${color}60)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold" style={{ color }}>{percent}%</span>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="glass-card px-4 py-3 flex items-center gap-3 flex-1">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
        style={{ background: `${color}15`, color }}
      >
        {icon}
      </div>
      <div>
        <div className="text-xl font-bold" style={{ color }}>{value}</div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
      </div>
    </div>
  )
}

export default function ChecklistPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [doc, setDoc] = useState(null)

  const {
    modules, verifications, loadChecklist, addItem, removeItem,
    updatePriority, setVerification, setNote, getStats, getModuleStats,
  } = useChecklist()

  useEffect(() => {
    const docs = JSON.parse(localStorage.getItem('documents') || '[]')
    const found = docs.find((d) => d.id === id)
    if (found) { setDoc(found); loadChecklist(found.checklist, found.id) }
    else navigate('/')
  }, [id, navigate, loadChecklist])

  const stats = getStats()
  const passRate = stats.total > 0 ? Math.round((stats.pass / stats.total) * 100) : 0

  const handleExport = () => {
    exportReport(doc.filename, modules, verifications)
  }

  if (!doc) return null

  return (
    <>
      <div>
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{doc.filename}</h1>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {new Date(doc.createdAt).toLocaleString('zh-CN')}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/')} className="btn-ghost" style={{ padding: '8px 16px', fontSize: '13px' }}>
              ← 返回
            </button>
            <button onClick={handleExport} className="btn-gradient" style={{ padding: '8px 16px', fontSize: '13px' }}>
              导出报告
            </button>
          </div>
        </div>

        {/* 统计区 */}
        <div className="glass-card p-5 mb-6">
          <div className="flex items-center gap-5">
            {/* 左侧：统计卡片 */}
            <div className="flex-1 grid grid-cols-4 gap-3">
              <StatCard icon="✓" label="通过" value={stats.pass} color="#22c55e" />
              <StatCard icon="✗" label="不通过" value={stats.fail} color="#ef4444" />
              <StatCard icon="—" label="跳过" value={stats.skip} color="#64748b" />
              <StatCard icon="⏳" label="待验收" value={stats.pending} color="#6366f1" />
            </div>

            {/* 右侧：圆环图 */}
            <div className="shrink-0">
              <DonutChart percent={passRate} />
            </div>
          </div>

          {/* 进度条 */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                验收进度 {stats.verified}/{stats.total}
              </span>
              {stats.pending === 0 && (
                <span className="text-xs font-medium" style={{ color: '#22c55e' }}>
                  ✅ 全部完成
                </span>
              )}
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${stats.total > 0 ? (stats.verified / stats.total) * 100 : 0}%`,
                  background: 'var(--gradient-primary)',
                }}
              />
            </div>
          </div>
        </div>

        {/* 清单列表 */}
        <ChecklistView
          modules={modules}
          verifications={verifications}
          onVerify={setVerification}
          onNoteChange={setNote}
          onRemoveItem={removeItem}
          onPriorityChange={updatePriority}
          onAddItem={addItem}
          getModuleStats={getModuleStats}
        />
      </div>
    </>
  )
}
