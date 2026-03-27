import { useState, useEffect } from 'react'
import { getProviders } from '../lib/deepseek'
import {
  getSetting, setSetting, deleteSetting,
  clearAllData, estimateStorageSize,
  exportAllData, importAllData,
} from '../lib/db'

const providers = getProviders()

export default function SettingsPage() {
  const [provider, setProvider] = useState('minimax-2.7')
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [storageSize, setStorageSize] = useState('0')
  const [importing, setImporting] = useState(false)

  const currentProvider = providers[provider]

  // 从 IndexedDB 加载设置
  useEffect(() => {
    Promise.all([getSetting('ai_provider'), getSetting('ai_api_key')]).then(([p, k]) => {
      if (p) setProvider(p)
      if (k) setApiKey(k)
    })
    estimateStorageSize().then((s) => setStorageSize((s.used / 1024).toFixed(1)))
  }, [])

  const handleProviderChange = (key) => {
    setProvider(key)
    setApiKey('')
    setTestResult(null)
  }

  const handleSave = async () => {
    if (apiKey.trim()) {
      await setSetting('ai_api_key', apiKey.trim())
      await setSetting('ai_provider', provider)
      // 同步到 localStorage 供 deepseek.js 读取
      localStorage.setItem('ai_api_key', apiKey.trim())
      localStorage.setItem('ai_provider', provider)
    } else {
      await deleteSetting('ai_api_key')
      await deleteSetting('ai_provider')
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
      await handleSave()
      const { testConnection } = await import('../lib/deepseek')
      await testConnection()
      setTestResult('ok')
    } catch {
      setTestResult('fail')
    }
    setTesting(false)
  }

  const handleClearData = async () => {
    if (!confirm('确定清除所有本地数据？包括验收记录和设置。')) return
    await clearAllData()
    localStorage.clear()
    window.location.reload()
  }

  // JSON 导出
  const handleExportBackup = async () => {
    const data = await exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `acceptbot_backup_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // JSON 导入
  const handleImportBackup = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      setImporting(true)
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        await importAllData(data)
        alert(`导入成功！共恢复 ${data.documents?.length || 0} 份文档`)
        window.location.reload()
      } catch (err) {
        alert('导入失败：' + err.message)
      }
      setImporting(false)
    }
    input.click()
  }

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
          数据保存在浏览器 IndexedDB（持久化存储）
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          已用空间：{storageSize} KB
        </p>

        {/* 备份/恢复 */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={handleExportBackup}
            className="text-xs cursor-pointer rounded-lg transition-colors"
            style={{
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.15)',
              color: '#60a5fa',
              padding: '8px 16px',
            }}
          >
            导出备份 (JSON)
          </button>
          <button
            onClick={handleImportBackup}
            disabled={importing}
            className="text-xs cursor-pointer rounded-lg transition-colors"
            style={{
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.15)',
              color: '#4ade80',
              padding: '8px 16px',
            }}
          >
            {importing ? '导入中...' : '导入备份 (JSON)'}
          </button>
        </div>

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
