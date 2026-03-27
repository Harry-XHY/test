import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { parseDocument } from '../lib/pdf-parser'
import { sortByVersion } from '../lib/version-detect'
import { mergeDocuments } from '../lib/merge-ai'
import { exportMarkdown, exportMergeHTML, exportWord } from '../lib/export-doc'
import { saveDoc, getDoc } from '../lib/db'
import SortableFileList from '../components/SortableFileList'
import MarkdownEditor from '../components/MarkdownEditor'

export default function MergePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const inputRef = useRef(null)

  const [stage, setStage] = useState('upload')
  const [files, setFiles] = useState([])
  const [progress, setProgress] = useState({ percent: 0, message: '' })
  const [markdown, setMarkdown] = useState('')
  const [error, setError] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const hasApiKey = !!localStorage.getItem('ai_api_key')

  // 从历史记录加载已保存的整合文档
  useEffect(() => {
    if (id) {
      getDoc(id).then((doc) => {
        if (doc?.type === 'merge' && doc.markdown) {
          setMarkdown(doc.markdown)
          setFiles((doc.sourceFiles || []).map((name, i) => ({
            id: String(i), name, text: '', version: null, date: null, sortKey: i,
          })))
          setStage('preview')
        }
      })
    }
  }, [id])

  const addFiles = async (fileList) => {
    setError('')
    const newFiles = []
    for (const file of fileList) {
      try {
        const { text } = await parseDocument(file)
        newFiles.push({
          id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
          name: file.name,
          text,
        })
      } catch (err) {
        setError(`${file.name}: ${err.message}`)
      }
    }
    if (newFiles.length === 0) return
    const all = [...files, ...newFiles]
    const sorted = sortByVersion(all)
    setFiles(sorted)
  }

  const handleFileInput = (e) => {
    if (e.target.files?.length) addFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.length) addFiles(Array.from(e.dataTransfer.files))
  }

  const handleMerge = async () => {
    if (files.length < 1) return
    setStage('processing')
    setProgress({ percent: 0, message: '准备中...' })
    setError('')
    try {
      const result = await mergeDocuments(
        files.map((f) => ({ name: f.name, text: f.text })),
        setProgress
      )
      setMarkdown(result)
      setStage('preview')
    } catch (err) {
      setError(err.message)
      setStage('upload')
    }
  }

  const handleSave = async () => {
    const doc = {
      id: Date.now().toString(),
      filename: '整合文档_' + new Date().toLocaleDateString('zh-CN'),
      type: 'merge',
      markdown,
      sourceFiles: files.map((f) => f.name),
      createdAt: new Date().toISOString(),
    }
    await saveDoc(doc)
    navigate('/history')
  }

  const handleExport = (format) => {
    setShowExportMenu(false)
    const name = '需求文档'
    if (format === 'md') exportMarkdown(markdown, name)
    else if (format === 'html') exportMergeHTML(markdown, name)
    else if (format === 'docx') exportWord(markdown, name)
  }

  // ── 上传阶段 ──
  if (stage === 'upload') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            文档整合
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            上传多版本需求文档，AI 自动整合为一份规范化 PRD
          </p>
        </div>

        {!hasApiKey && (
          <div
            className="glass-card mb-6 px-4 py-3 flex items-center justify-between"
            style={{ borderColor: 'rgba(234,179,8,0.2)' }}
          >
            <span className="text-sm" style={{ color: '#fbbf24' }}>未配置 API Key</span>
            <a href="/settings" className="btn-ghost text-xs no-underline" style={{ padding: '4px 12px' }}>去配置</a>
          </div>
        )}

        <div
          className="glass-card glow-border cursor-pointer transition-all duration-300 mb-6"
          style={{
            padding: '36px 24px',
            textAlign: 'center',
            borderColor: dragActive ? 'rgba(99,102,241,0.5)' : undefined,
            boxShadow: dragActive ? '0 0 40px rgba(99,102,241,0.15)' : 'none',
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="mb-4">
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none" className="mx-auto" style={{ opacity: 0.5 }}>
              <rect x="6" y="6" width="16" height="20" rx="3" stroke="url(#mg)" strokeWidth="2" />
              <rect x="16" y="10" width="16" height="20" rx="3" stroke="url(#mg)" strokeWidth="2" />
              <rect x="26" y="14" width="16" height="20" rx="3" stroke="url(#mg)" strokeWidth="2" />
              <path d="M20 38h8M24 34v8" stroke="url(#mg)" strokeWidth="2" strokeLinecap="round" />
              <defs>
                <linearGradient id="mg" x1="6" y1="6" x2="42" y2="42">
                  <stop stopColor="#3b82f6" /><stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <p className="text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
            拖拽文件到此处，或点击选择（支持多选）
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            PDF / DOCX / XLSX / CSV / MD / TXT
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.xlsx,.xls,.csv,.md,.markdown,.txt"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>

        <SortableFileList
          files={files}
          onReorder={setFiles}
          onRemove={(idx) => setFiles((prev) => prev.filter((_, i) => i !== idx))}
        />

        {error && (
          <div
            className="mt-4 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171' }}
          >
            {error}
          </div>
        )}

        {files.length >= 1 && (
          <button
            onClick={handleMerge}
            disabled={!hasApiKey}
            className="btn-gradient w-full mt-6"
            style={{ padding: '12px', fontSize: '15px' }}
          >
            开始整合（{files.length} 份文档）
          </button>
        )}
      </div>
    )
  }

  // ── 处理中 ──
  if (stage === 'processing') {
    return (
      <div className="max-w-xl mx-auto">
        <div className="glass-card p-8 text-center">
          <div className="text-4xl font-bold text-gradient mb-4">{progress.percent}%</div>
          <div className="w-full h-1.5 rounded-full overflow-hidden mb-4" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress.percent}%`, background: 'var(--gradient-primary)' }}
            />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{progress.message}</p>
        </div>
      </div>
    )
  }

  // ── 预览阶段 ──
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>整合结果</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            来源：{files.map((f) => f.name).join('、')}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setStage('upload'); setMarkdown('') }} className="btn-ghost" style={{ padding: '8px 16px', fontSize: '13px' }}>
            ← 重新整合
          </button>
          <button onClick={handleSave} className="btn-ghost" style={{ padding: '8px 16px', fontSize: '13px' }}>
            保存记录
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn-gradient"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              导出 ▾
            </button>
            {showExportMenu && (
              <div
                className="absolute right-0 mt-2 rounded-xl overflow-hidden z-50"
                style={{
                  background: 'var(--bg-elevated, #1e293b)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  minWidth: '160px',
                }}
              >
                {[
                  { key: 'md', label: 'Markdown', desc: '.md' },
                  { key: 'html', label: 'HTML', desc: '精排版可打印' },
                  { key: 'docx', label: 'Word', desc: '.docx' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => handleExport(opt.key)}
                    className="w-full text-left px-4 py-2.5 text-sm cursor-pointer bg-transparent border-none block transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <MarkdownEditor value={markdown} onChange={setMarkdown} />
    </div>
  )
}
