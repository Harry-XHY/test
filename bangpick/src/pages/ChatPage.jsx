import { useState, useRef, useEffect, useMemo } from 'react'
import ChatInput from '../components/ChatInput'
import OptionCard from '../components/OptionCard'
import RandomPicker from '../components/RandomPicker'
import FortuneCard from '../components/FortuneCard'
import FortuneModal from '../components/FortuneModal'
import { sendMessage } from '../lib/minimax'
import { buildSystemPrompt } from '../lib/prompt'
import { saveDecision } from '../lib/storage'
import { getRandomContent } from '../lib/scenarios'
import { requestLocation, getLocation, formatLocation } from '../lib/location'

/* ===== Landing View ===== */
function LandingView({ scenarios, examples, onFill, onOpenFortune }) {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="space-y-3">
        <h2 className="text-[34px] font-bold leading-tight tracking-tight">
          纠结的时候，<span className="text-gradient">交给我 ⚡</span>
        </h2>
        <p className="text-sm text-[var(--text-secondary)] opacity-70 font-medium leading-relaxed">
          告诉我你的候选项和偏好，我会帮你更快做决定
        </p>
      </section>

      {/* Daily Fortune */}
      <FortuneCard onOpen={onOpenFortune} />

      {/* Quick Scenes */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <h3 className="text-[var(--text)] font-semibold">快速场景</h3>
          <span className="flex items-center gap-1 text-xs text-[var(--primary)]">
            <span className="material-symbols-outlined text-sm">auto_fix_high</span>
            自动填入
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {scenarios.map((s) => (
            <button key={s.title} onClick={() => onFill(s.fill)}
              className="glass-card p-4 rounded-[20px] text-left cursor-pointer active:scale-[0.97] transition-transform">
              <h4 className="text-[16px] font-semibold text-[var(--text)]">{s.title}</h4>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{s.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Example Questions */}
      <section className="space-y-4">
        <h3 className="text-[var(--text)] font-semibold px-1">你可以这样问</h3>
        <div className="space-y-3">
          {examples.map((ex) => (
            <button key={ex} onClick={() => onFill(ex)}
              className="glass-card flex items-center justify-between w-full p-4 rounded-[20px] text-left cursor-pointer active:scale-[0.98] transition-transform">
              <span className="text-[15px] font-medium text-[var(--text-secondary)]">{ex}</span>
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-[var(--secondary)]">
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

/* ===== Chat View ===== */
function ChatView({ messages, loading, onSend, onRetry, bottomRef }) {
  return (
    <div className="space-y-4 pt-1">
      {messages.map((msg, i) => (
        <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
          <div className={`max-w-[85%] ${msg.role === 'user' ? 'rounded-[20px] rounded-br-md px-4 py-2.5 text-white' : ''}`}
            style={msg.role === 'user' ? { background: 'linear-gradient(135deg, #5B8CFF, #7A7CFF)' } : undefined}
          >
            {msg.role === 'assistant' && msg.error && (
              <div className="glass-card rounded-[20px] rounded-bl-md px-4 py-3">
                <p className="text-red-400 text-sm">{msg.content}</p>
                <button onClick={() => onRetry(msg)} className="mt-2 text-xs text-[var(--primary)] font-medium">
                  🔄 重新发送
                </button>
              </div>
            )}
            {msg.role === 'assistant' && !msg.error && msg.parsed?.type === 'recommendation' && (
              <div className="space-y-3">
                {msg.parsed.options.map((opt, idx) => (
                  <OptionCard key={idx} option={opt} rank={idx} onSelect={onSend} />
                ))}
                {msg.parsed.options.length >= 2 && (
                  <RandomPicker options={msg.parsed.options} onPick={(name) => onSend(`就选${name}`)} />
                )}
              </div>
            )}
            {msg.role === 'assistant' && !msg.error && msg.parsed?.type === 'question' && (
              <div className="space-y-3">
                <p className="text-slate-200 glass-card rounded-[20px] rounded-bl-md px-4 py-2.5">{msg.parsed.question}</p>
                {msg.parsed.choices?.length >= 2 && (
                  <>
                    <div className="grid gap-2">
                      {msg.parsed.choices.map((c) => (
                        <button key={c} onClick={() => onSend(c)}
                          disabled={loading}
                          className="glass-card text-left px-4 py-3 rounded-[16px] text-sm text-[var(--text-secondary)] font-medium active:scale-[0.98] transition-transform disabled:opacity-50"
                        >{c}</button>
                      ))}
                    </div>
                    <RandomPicker options={msg.parsed.choices.map((c) => ({ name: c, reason: '' }))} onPick={(name) => onSend(name)} />
                  </>
                )}
              </div>
            )}
            {msg.role === 'assistant' && !msg.error && !msg.parsed && (
              <p className="text-slate-200 glass-card rounded-[20px] rounded-bl-md px-4 py-2.5">{msg.content}</p>
            )}
            {msg.role === 'user' && <p className="m-0">{msg.content}</p>}
          </div>
        </div>
      ))}

      {loading && (
        <div className="flex justify-start">
          <div className="glass-card rounded-[20px] rounded-bl-md px-4 py-3 flex items-center gap-2">
            <span className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            <span className="text-[var(--muted)] text-sm">思考中</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}

/* ===== Main Page ===== */
export default function ChatPage() {
  const { scenarios, examples } = useMemo(() => getRandomContent(), [])
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [locationText, setLocationText] = useState('')
  const [appHeight, setAppHeight] = useState('100%')
  const [showFortune, setShowFortune] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    requestLocation().then((loc) => {
      if (loc) setLocationText(formatLocation(loc))
    })
  }, [])

  // Track visualViewport to handle iOS keyboard
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    function updateHeight() {
      setAppHeight(`${vv.height}px`)
      // Prevent iOS scroll offset
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
    }

    updateHeight()
    vv.addEventListener('resize', updateHeight)
    return () => vv.removeEventListener('resize', updateHeight)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend(text) {
    const userMsg = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const systemPrompt = buildSystemPrompt(locationText)
      const apiMessages = [...messages, userMsg]
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : '' }))

      const result = await sendMessage(systemPrompt, apiMessages)

      if (result.structured && result.data.type === 'recommendation') {
        saveDecision({
          id: Math.random().toString(36).slice(2) + Date.now().toString(36),
          question: text,
          options: result.data.options.map((o) => ({
            name: o.name, reason: o.reason, tags: o.tags || [],
          })),
          createdAt: Date.now(),
        })
      }

      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: result.raw,
        parsed: result.structured ? result.data : null,
      }])
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: err.message,
        error: true,
        _retryText: text,
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleRetry(errorMsg) {
    setMessages((prev) => prev.filter((m) => m !== errorMsg))
    handleSend(errorMsg._retryText)
  }

  function handleFill(text) {
    inputRef.current?.fill(text)
  }

  const inChat = messages.length > 0
  const cityName = getLocation()?.city

  return (
    <div className="flex flex-col" style={{ height: appHeight }}>
      {/* Header */}
      <header className="flex-shrink-0 bg-[#0a0e14]/80 backdrop-blur-xl flex justify-between items-center px-6 py-4 w-full z-50">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--primary)]">bubble_chart</span>
          <h1 className="text-[var(--primary)] font-black tracking-tighter text-xl">帮我选</h1>
        </div>
        <div className="flex items-center gap-2">
          {cityName && (
            <div className="flex items-center gap-1 text-slate-400 text-sm">
              <span className="material-symbols-outlined text-sm">location_on</span>
              <span className="font-bold">{cityName}</span>
            </div>
          )}
          {inChat && (
            <button
              onClick={() => setMessages([])}
              className="w-8 h-8 rounded-full grid place-items-center text-[var(--muted)] text-sm hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </header>

      {/* Content — scrollable */}
      <main className="flex-1 overflow-y-auto max-w-xl mx-auto w-full px-6 pt-6 pb-4">
        {!inChat ? (
          <LandingView scenarios={scenarios} examples={examples} onFill={handleFill} onOpenFortune={() => setShowFortune(true)} />
        ) : (
          <ChatView messages={messages} loading={loading} onSend={handleSend} onRetry={handleRetry} bottomRef={bottomRef} />
        )}
      </main>

      {/* Input — stays at bottom of flex, no fixed positioning */}
      <ChatInput ref={inputRef} onSend={handleSend} disabled={loading} />
      {showFortune && <FortuneModal onClose={() => setShowFortune(false)} />}
    </div>
  )
}
