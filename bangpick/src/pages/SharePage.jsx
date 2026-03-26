import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import VotePanel from '../components/VotePanel'
import SpinWheel from '../components/SpinWheel'
import { getSharedDecision } from '../lib/share'

export default function SharePage() {
  const { id } = useParams()
  const [decision, setDecision] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('vote')
  const [nickname, setNickname] = useState('')
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    getSharedDecision(id).then((data) => {
      setDecision(data)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-slate-900">
        <p className="text-slate-400">加载中...</p>
      </div>
    )
  }

  if (!decision) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh bg-slate-900 p-4">
        <p className="text-2xl mb-2">😢</p>
        <p className="text-slate-400">决策已过期或不存在</p>
      </div>
    )
  }

  if (!joined) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh bg-slate-900 p-4 gap-4">
        <p className="text-white text-lg font-bold">{decision.question}</p>
        <p className="text-slate-400 text-sm">输入昵称参与投票</p>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="你的昵称"
          className="px-4 py-3 rounded-xl bg-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 w-48 text-center"
        />
        <button
          onClick={() => nickname.trim() && setJoined(true)}
          disabled={!nickname.trim()}
          className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-30"
        >
          参与
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh bg-slate-900">
      <header className="px-4 py-3 bg-slate-800 border-b border-slate-700 text-center">
        <p className="text-sm text-slate-400">帮我选一个：</p>
        <h1 className="text-lg font-bold text-white">{decision.question}</h1>
        <p className="text-xs text-slate-500 mt-1">👤 {nickname}</p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setMode('vote')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              mode === 'vote' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            🗳️ 投票
          </button>
          <button
            onClick={() => setMode('spin')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              mode === 'spin' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            🎰 转盘
          </button>
        </div>

        {mode === 'vote' ? (
          <VotePanel options={decision.options} />
        ) : (
          <SpinWheel options={decision.options} />
        )}
      </div>

      <div className="p-3 bg-slate-800 border-t border-slate-700 text-center">
        <a href="/" className="text-sm text-blue-400">我也有选择困难 → 帮我选</a>
      </div>
    </div>
  )
}
