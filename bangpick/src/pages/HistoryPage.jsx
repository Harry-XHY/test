import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHistory, clearHistory } from '../lib/storage'

export default function HistoryPage() {
  const navigate = useNavigate()
  const [history, setHistory] = useState(() => getHistory())

  function handleClear() {
    if (confirm('确定清空所有历史？')) {
      clearHistory()
      setHistory([])
    }
  }

  return (
    <div className="flex flex-col h-dvh bg-slate-900">
      <header className="flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white">←</button>
        <h1 className="text-lg font-bold text-white flex-1">历史记录</h1>
        {history.length > 0 && (
          <button onClick={handleClear} className="text-sm text-red-400 hover:text-red-300">清空</button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {history.length === 0 ? (
          <div className="text-center text-slate-500 mt-20">
            <p className="text-2xl mb-2">📭</p>
            <p>还没有决策记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((d) => (
              <div key={d.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-white font-medium flex-1">{d.question}</p>
                  {d.mode === 'friend' && (
                    <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded-full ml-2">朋友</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {d.options.map((o) => (
                    <span key={o.id} className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded">
                      {o.name}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {new Date(d.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {d.result && <span className="text-xs text-green-400">→ {d.result}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
