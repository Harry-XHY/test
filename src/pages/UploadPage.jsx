import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import FileUpload from '../components/FileUpload'
import { parseDocument } from '../lib/pdf-parser'
import { generateChecklist, generateMockChecklist } from '../lib/deepseek'
import { saveDoc, getSetting } from '../lib/db'

const STEPS = [
  { key: 'upload', label: '上传' },
  { key: 'parse', label: '解析' },
  { key: 'generate', label: 'AI 生成' },
  { key: 'save', label: '完成' },
]

function useElapsedTime(running) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(null)
  useEffect(() => {
    if (running) {
      startRef.current = Date.now()
      setElapsed(0)
      const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
      return () => clearInterval(t)
    }
  }, [running])
  return elapsed
}

function formatTime(s) {
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

export default function UploadPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle')
  const [currentStep, setCurrentStep] = useState(0)
  const [percent, setPercent] = useState(0)
  const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState('')
  const [textMode, setTextMode] = useState(false)
  const [pasteText, setPasteText] = useState('')

  const isProcessing = ['parsing', 'generating', 'saving'].includes(status)
  const elapsed = useElapsedTime(isProcessing)
  const [hasApiKey, setHasApiKey] = useState(false)

  useEffect(() => {
    getSetting('ai_api_key').then((k) => setHasApiKey(!!k))
  }, [])

  const saveAndNavigate = async (filename, text, checklist) => {
    setStatus('saving')
    setCurrentStep(3)
    setPercent(95)
    const doc = {
      id: Date.now().toString(),
      filename, text, checklist,
      createdAt: new Date().toISOString(),
    }
    await saveDoc(doc)
    setPercent(100)
    setTimeout(() => navigate(`/checklist/${doc.id}`), 400)
  }

  const processDocument = async (text, filename) => {
    setStatus('generating')
    setCurrentStep(2)
    setPercent(40)
    try {
      const checklist = await generateChecklist(text, ({ current, total }) => {
        setChunkProgress({ current, total })
        setPercent(40 + Math.round((current / total) * 50))
      })
      saveAndNavigate(filename, text, checklist)
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  const handleFile = async (file) => {
    setError('')
    setStatus('parsing')
    setCurrentStep(1)
    setPercent(10)
    try {
      const { text } = await parseDocument(file)
      setPercent(30)
      if (hasApiKey) {
        await processDocument(text, file.name)
      } else {
        saveAndNavigate(file.name, text, generateMockChecklist())
      }
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return
    if (hasApiKey) {
      await processDocument(pasteText, '粘贴文本')
    } else {
      saveAndNavigate('粘贴文本', pasteText, generateMockChecklist())
    }
  }

  const handleDemo = () => {
    saveAndNavigate('演示文档.pdf', '演示用 PRD 内容', generateMockChecklist())
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* 标题 */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          上传需求文档
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          上传 PRD，AI 自动生成验收测试清单
        </p>
      </div>

      {/* API 未配置提示 */}
      {!hasApiKey && status === 'idle' && (
        <div
          className="glass-card mb-6 px-4 py-3 flex items-center justify-between"
          style={{ borderColor: 'rgba(234,179,8,0.2)' }}
        >
          <span className="text-sm" style={{ color: '#fbbf24' }}>
            未配置 API Key，将使用演示数据
          </span>
          <a href="/settings" className="btn-ghost text-xs no-underline" style={{ padding: '4px 12px' }}>
            去配置
          </a>
        </div>
      )}

      {/* 主内容区 */}
      {status === 'idle' || status === 'error' ? (
        <>
          {!textMode ? (
            <FileUpload onFileProcessed={handleFile} disabled={false} />
          ) : (
            <div className="glass-card p-5">
              <textarea
                className="w-full p-4 rounded-xl text-sm resize-none"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  minHeight: '200px',
                }}
                placeholder="将需求文档内容粘贴到这里..."
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <div className="flex gap-3 mt-4">
                <button onClick={handlePasteSubmit} disabled={!pasteText.trim()} className="btn-gradient flex-1">
                  生成验收清单
                </button>
                <button onClick={() => setTextMode(false)} className="btn-ghost">
                  返回
                </button>
              </div>
            </div>
          )}

          {/* 底部操作 */}
          <div className="flex items-center justify-center gap-6 mt-8">
            {!textMode && (
              <button
                onClick={() => setTextMode(true)}
                className="text-sm bg-transparent border-none cursor-pointer transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.target.style.color = 'var(--text-secondary)')}
                onMouseLeave={(e) => (e.target.style.color = 'var(--text-muted)')}
              >
                直接粘贴文本
              </button>
            )}
            <button
              onClick={handleDemo}
              className="text-sm bg-transparent border-none cursor-pointer transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.target.style.color = 'var(--text-secondary)')}
              onMouseLeave={(e) => (e.target.style.color = 'var(--text-muted)')}
            >
              查看演示
            </button>
          </div>

          {/* 错误提示 */}
          {error && (
            <div
              className="mt-6 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171' }}
            >
              <p>{error}</p>
              <button
                onClick={() => { setError(''); setStatus('idle') }}
                className="mt-2 text-xs bg-transparent border-none cursor-pointer"
                style={{ color: '#60a5fa' }}
              >
                重试
              </button>
            </div>
          )}
        </>
      ) : (
        /* 进度视图 */
        <div className="glass-card p-8">
          {/* 步骤指示器 */}
          <div className="flex items-center justify-between mb-8 px-4">
            {STEPS.map((step, i) => (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500"
                    style={{
                      background: i < currentStep
                        ? '#22c55e'
                        : i === currentStep
                          ? 'var(--gradient-primary)'
                          : 'rgba(255,255,255,0.05)',
                      color: i <= currentStep ? 'white' : 'var(--text-muted)',
                      boxShadow: i === currentStep ? '0 0 0 4px rgba(99,102,241,0.2)' : 'none',
                    }}
                  >
                    {i < currentStep ? '✓' : i + 1}
                  </div>
                  <span
                    className="text-xs mt-2 whitespace-nowrap"
                    style={{ color: i <= currentStep ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className="w-16 h-px mx-2"
                    style={{
                      marginTop: '-18px',
                      background: i < currentStep
                        ? '#22c55e'
                        : 'rgba(255,255,255,0.08)',
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* 百分比 */}
          <div className="text-center mb-4">
            <span className="text-4xl font-bold text-gradient">{percent}%</span>
          </div>

          {/* 进度条 */}
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${percent}%`,
                background: percent === 100
                  ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                  : 'var(--gradient-primary)',
                boxShadow: '0 0 12px rgba(99,102,241,0.4)',
              }}
            />
          </div>

          {/* 状态文字 */}
          <div className="flex items-center justify-between mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>{formatTime(elapsed)}</span>
            <span>
              {status === 'parsing' && '正在提取文档内容...'}
              {status === 'generating' && (
                chunkProgress.total > 1
                  ? `AI 分析中 (${chunkProgress.current}/${chunkProgress.total} 段)`
                  : 'AI 正在分析需求...'
              )}
              {status === 'saving' && '即将完成...'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
