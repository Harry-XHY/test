import { useState, useRef } from 'react'

export default function FileUpload({ onFileProcessed, disabled }) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const validateFile = (file) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const validExts = ['pdf', 'docx', 'xlsx', 'xls', 'csv']
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ]
    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      return '不支持的格式，请上传 PDF、DOCX、XLSX、XLS 或 CSV 文件'
    }
    if (file.size > 10 * 1024 * 1024) return '文件大小超过 10MB 限制'
    return null
  }

  const handleFile = (file) => {
    setError('')
    const err = validateFile(file)
    if (err) { setError(err); return }
    onFileProcessed(file)
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
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
  }

  return (
    <div>
      <div
        className="glass-card glow-border relative cursor-pointer transition-all duration-300"
        style={{
          padding: '48px 32px',
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
        {/* 图标 */}
        <div className="mb-5">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto" style={{ opacity: 0.6 }}>
            <rect x="8" y="4" width="32" height="40" rx="4" stroke="url(#grad)" strokeWidth="2" />
            <path d="M16 20h16M16 26h12M16 32h8" stroke="url(#grad)" strokeWidth="2" strokeLinecap="round" />
            <defs>
              <linearGradient id="grad" x1="8" y1="4" x2="40" y2="44">
                <stop stopColor="#3b82f6" />
                <stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <p className="text-base mb-1" style={{ color: 'var(--text-primary)' }}>
          拖拽文件到此处，或点击选择
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          支持 PDF / DOCX / XLSX / CSV 格式，最大 10MB
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {error && (
        <div
          className="mt-3 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
        >
          {error}
        </div>
      )}
    </div>
  )
}
