import { useState } from 'react'
import { getProviders } from '../lib/deepseek'

const providers = getProviders()

// 迁移旧版 key
;(() => {
  const oldKey = localStorage.getItem('deepseek_api_key')
  if (oldKey && !localStorage.getItem('ai_api_key')) {
    localStorage.setItem('ai_api_key', oldKey)
    localStorage.setItem('ai_provider', 'deepseek')
    localStorage.removeItem('deepseek_api_key')
  }
})()

export default function SettingsPage() {
  const [provider, setProvider] = useState(localStorage.getItem('ai_provider') || 'deepseek')
  const [apiKey, setApiKey] = useState(localStorage.getItem('ai_api_key') || '')
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null) // null | 'ok' | 'fail'

  const currentProvider = providers[provider]

  const handleProviderChange = (key) => {
    setProvider(key)
    setApiKey('')
    setTestResult(null)
  }

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('ai_api_key', apiKey.trim())
      localStorage.setItem('ai_provider', provider)
    } else {
      localStorage.removeItem('ai_api_key')
      localStorage.removeItem('ai_provider')
    }
    setSaved(true)
    setTestResult(null)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async () => {
    if (!apiKey.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      // 保存后测试
      localStorage.setItem('ai_api_key', apiKey.trim())
      localStorage.setItem('ai_provider', provider)

      const { generateChecklist } = await import('../lib/deepseek')
      await generateChecklist('测试文档：用户登录功能，输入用户名和密码登录。')
      setTestResult('ok')
    } catch {
      setTestResult('fail')
    }
    setTesting(false)
  }

  const handleClearData = () => {
    if (!confirm('确定清除所有本地数据？包括验收记录和设置。')) return
    localStorage.clear()
    window.location.reload()
  }

  const storageSize = (() => {
    let total = 0
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        total += localStorage.getItem(key).length
      }
    }
    return (total / 1024).toFixed(1)
  })()

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>设置</h1>

      {/* AI 模型配置 */}
      <div className="glass-card p-6 mb-4">
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>AI 模型</h2>

        {/* 供应商卡片选择器 */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {Object.entries(providers).map(([key, p]) => {
            const isSelected = provider === key
            return (
              <button
                key={key}
                onClick={() => handleProviderChange(key)}
                className="rounded-xl p-3 text-left cursor-pointer transition-all duration-200"
                style={{
                  background: isSelected ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                  border: isSelected
                    ? '1.5px solid rgba(99,102,241,0.5)'
                    : '1px solid var(--border-subtle)',
                  boxShadow: isSelected ? '0 0 16px rgba(99,102,241,0.1)' : 'none',
                }}
              >
                <div className="text-sm font-semibold mb-1" style={{ color: isSelected ? '#818cf8' : 'var(--text-primary)' }}>
                  {p.name}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {p.model}
                </div>
              </button>
            )
          })}
        </div>

        {/* API Key */}
        <div className="mb-3">
          <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
            API Key
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              className="flex-1 px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              placeholder={currentProvider?.keyPrefix ? `${currentProvider.keyPrefix}...` : 'API Key'}
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setTestResult(null) }}
            />
            <button onClick={handleSave} className="btn-gradient" style={{ padding: '8px 16px', fontSize: '13px' }}>
              {saved ? '✓ 已保存' : '保存'}
            </button>
          </div>
        </div>

        {/* 测试连接 */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTest}
            disabled={!apiKey.trim() || testing}
            className="btn-ghost text-xs"
            style={{ padding: '6px 12px' }}
          >
            {testing ? '测试中...' : '测试连接'}
          </button>

          {testResult === 'ok' && (
            <span className="text-xs font-medium" style={{ color: '#22c55e' }}>✓ 连接成功</span>
          )}
          {testResult === 'fail' && (
            <span className="text-xs font-medium" style={{ color: '#ef4444' }}>✗ 连接失败，请检查 Key</span>
          )}
        </div>

        {/* 获取 Key 链接 */}
        <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <a
            href={currentProvider?.getKey}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs no-underline transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.target.style.color = '#818cf8')}
            onMouseLeave={(e) => (e.target.style.color = 'var(--text-muted)')}
          >
            获取 {currentProvider?.name} API Key →
          </a>
        </div>

        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
          Key 仅保存在浏览器本地，不会上传到任何服务器
        </p>
      </div>

      {/* 数据管理 */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>数据管理</h2>
        <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
          数据保存在浏览器本地存储
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          已用空间：{storageSize} KB
        </p>
        <button
          onClick={handleClearData}
          className="text-xs cursor-pointer rounded-lg transition-colors"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.15)',
            color: '#f87171',
            padding: '8px 16px',
          }}
        >
          清除所有数据
        </button>
      </div>
    </div>
  )
}
