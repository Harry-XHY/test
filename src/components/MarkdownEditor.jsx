import { useState, useMemo } from 'react'
import { marked } from 'marked'

export default function MarkdownEditor({ value, onChange }) {
  const [showSource, setShowSource] = useState(false)

  const html = useMemo(() => {
    try {
      return marked.parse(value || '')
    } catch {
      return '<p>渲染错误</p>'
    }
  }, [value])

  const highlightedHtml = html.replace(
    /⚠️[^<]*/g,
    (match) => `<mark style="background:rgba(234,179,8,0.2);padding:2px 6px;border-radius:4px;border:1px solid rgba(234,179,8,0.3)">${match}</mark>`
  )

  return (
    <div className="glass-card overflow-hidden" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex gap-2">
          <button
            onClick={() => setShowSource(false)}
            className="text-xs px-3 py-1 rounded-md cursor-pointer border-none transition-colors"
            style={{
              background: !showSource ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: !showSource ? '#818cf8' : 'var(--text-muted)',
            }}
          >
            预览
          </button>
          <button
            onClick={() => setShowSource(true)}
            className="text-xs px-3 py-1 rounded-md cursor-pointer border-none transition-colors"
            style={{
              background: showSource ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: showSource ? '#818cf8' : 'var(--text-muted)',
            }}
          >
            编辑源码
          </button>
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {value?.length || 0} 字符
        </span>
      </div>

      {showSource ? (
        <textarea
          className="flex-1 w-full p-4 text-sm resize-none font-mono"
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            lineHeight: 1.6,
          }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div
          className="flex-1 overflow-auto p-6 prose-preview"
          style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: 1.8 }}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      )}
    </div>
  )
}
