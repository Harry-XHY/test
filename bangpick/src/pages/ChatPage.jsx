import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ChatInput from '../components/ChatInput'
import OptionCard from '../components/OptionCard'
import { sendMessage } from '../lib/minimax'
import { buildSystemPrompt } from '../lib/prompt'
import { getPreferences, saveDecision } from '../lib/storage'

export default function ChatPage() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend(text) {
    const userMsg = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const systemPrompt = buildSystemPrompt(getPreferences())
      const apiMessages = [...messages, userMsg]
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : m.raw || '' }))

      const result = await sendMessage(systemPrompt, apiMessages)

      let decision = null
      if (result.structured && result.data.type === 'recommendation') {
        decision = {
          id: crypto.randomUUID(),
          question: text,
          options: result.data.options.map((o) => ({
            id: crypto.randomUUID(),
            name: o.name,
            reason: o.reason,
            tags: o.tags || [],
            votes: 0,
          })),
          mode: 'quick',
          createdAt: Date.now(),
        }
        saveDecision(decision)
      }

      const assistantMsg = {
        role: 'assistant',
        content: result.raw,
        parsed: result.structured ? result.data : null,
        decision,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: err.message, error: true },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleFriendMode(decision) {
    navigate(`/friend/${decision.id}`, { state: { decision } })
  }

  return (
    <div className="flex flex-col h-dvh bg-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white">帮我选</h1>
        <button
          onClick={() => navigate('/history')}
          className="text-sm text-slate-400 hover:text-white"
        >
          历史
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 mt-20">
            <p className="text-2xl mb-2">🤔</p>
            <p>今天吃什么？周末去哪？买哪个？</p>
            <p className="text-sm mt-1">问我，帮你秒决定</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-blue-600 rounded-2xl rounded-br-md px-4 py-2.5 text-white' : ''}`}>
              {msg.role === 'assistant' && msg.error && (
                <p className="text-red-400 text-sm">{msg.content}</p>
              )}
              {msg.role === 'assistant' && !msg.error && msg.parsed?.type === 'recommendation' && (
                <div className="space-y-3">
                  {msg.parsed.options.map((opt, idx) => (
                    <OptionCard key={idx} option={{ ...opt, id: '', votes: 0 }} rank={idx} />
                  ))}
                  {msg.decision && (
                    <button
                      onClick={() => handleFriendMode(msg.decision)}
                      className="w-full py-2.5 rounded-xl bg-purple-600/80 text-white text-sm font-medium active:bg-purple-700"
                    >
                      👥 朋友来选
                    </button>
                  )}
                </div>
              )}
              {msg.role === 'assistant' && !msg.error && msg.parsed?.type === 'question' && (
                <p className="text-slate-200 bg-slate-700/50 rounded-2xl rounded-bl-md px-4 py-2.5">{msg.parsed.question}</p>
              )}
              {msg.role === 'assistant' && !msg.error && !msg.parsed && (
                <p className="text-slate-200 bg-slate-700/50 rounded-2xl rounded-bl-md px-4 py-2.5">{msg.content}</p>
              )}
              {msg.role === 'user' && <p>{msg.content}</p>}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-700/50 rounded-2xl rounded-bl-md px-4 py-2.5 text-slate-400">
              思考中...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  )
}
