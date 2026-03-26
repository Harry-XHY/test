import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import VotePanel from '../components/VotePanel'
import SpinWheel from '../components/SpinWheel'
import ShareButton from '../components/ShareButton'
import { getHistory } from '../lib/storage'

export default function FriendPage() {
  const { state } = useLocation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [mode, setMode] = useState('vote')

  // Fall back to localStorage if page refreshed (location state lost)
  const decision = state?.decision || getHistory().find((d) => d.id === id)

  if (!decision) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh bg-slate-900 p-4">
        <p className="text-slate-400 mb-4">决策数据丢失</p>
        <button onClick={() => navigate('/')} className="text-blue-400">返回首页</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh bg-slate-900">
      <header className="flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white">←</button>
        <h1 className="text-lg font-bold text-white flex-1 truncate">朋友来选</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center">
          <p className="text-slate-400 text-sm">我在纠结：</p>
          <p className="text-white text-xl font-bold mt-1">{decision.question}</p>
        </div>

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

      <div className="p-3 bg-slate-800 border-t border-slate-700">
        <ShareButton decision={decision} />
      </div>
    </div>
  )
}
