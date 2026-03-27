import { useState } from 'react'

export default function SortableFileList({ files, onReorder, onRemove }) {
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)

  const handleDragStart = (e, idx) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, idx) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverIdx(idx)
  }

  const handleDrop = (e, idx) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const updated = [...files]
    const [moved] = updated.splice(dragIdx, 1)
    updated.splice(idx, 0, moved)
    onReorder(updated)
    setDragIdx(null)
    setOverIdx(null)
  }

  const handleDragEnd = () => {
    setDragIdx(null)
    setOverIdx(null)
  }

  if (files.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          已添加 {files.length} 份文档
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          拖拽调整版本顺序（上旧下新）
        </span>
      </div>
      {files.map((file, idx) => (
        <div
          key={file.id}
          draggable
          onDragStart={(e) => handleDragStart(e, idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={(e) => handleDrop(e, idx)}
          onDragEnd={handleDragEnd}
          className="glass-card px-4 py-3 flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all duration-150"
          style={{
            opacity: dragIdx === idx ? 0.4 : 1,
            borderColor: overIdx === idx && dragIdx !== idx ? 'rgba(99,102,241,0.5)' : undefined,
            transform: overIdx === idx && dragIdx !== idx ? 'scale(1.02)' : undefined,
          }}
        >
          <span className="text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>⠿</span>
          <span
            className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
          >
            {idx + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {file.name}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {file.version != null && `v${file.version}`}
              {file.version != null && file.date && ' · '}
              {file.date && file.date.toLocaleDateString('zh-CN')}
              {!file.version && !file.date && '未检测到版本信息'}
            </div>
          </div>
          <button
            onClick={() => onRemove(idx)}
            className="text-xs bg-transparent border-none cursor-pointer shrink-0 transition-colors"
            style={{ color: 'var(--text-muted)', padding: '4px' }}
            onMouseEnter={(e) => (e.target.style.color = '#f87171')}
            onMouseLeave={(e) => (e.target.style.color = 'var(--text-muted)')}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
