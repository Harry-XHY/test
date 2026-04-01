import { useState, useRef, useEffect, useMemo } from 'react'
import ChatInput from '../components/ChatInput'
import OptionCard from '../components/OptionCard'
import RandomPicker from '../components/RandomPicker'
import FortuneCard from '../components/FortuneCard'
import FortuneModal from '../components/FortuneModal'
import BottomNav from '../components/BottomNav'
import { sendMessage } from '../lib/minimax'
import { buildSystemPrompt } from '../lib/prompt'
import { saveDecision } from '../lib/storage'
import { getRandomContent } from '../lib/scenarios'
import { requestLocation, getLocation, formatLocation } from '../lib/location'

/* ===== Scenario Icons ===== */
const SCENARIO_ICONS = {
  '🍜': 'restaurant', '☕': 'local_cafe', '🍺': 'nightlife', '🎁': 'redeem',
  '🛒': 'shopping_cart', '🎮': 'sports_esports', '🎬': 'movie', '👗': 'checkroom',
  '🧥': 'dry_cleaning', '🚗': 'directions_car', '✈️': 'flight', '💼': 'work',
  '📚': 'school', '💪': 'fitness_center', '🏠': 'home', '👫': 'group',
  '💰': 'account_balance_wallet', '🐱': 'pets', '💇': 'content_cut', '📱': 'smartphone',
}

const SCENARIO_COLORS = [
  'var(--primary)', 'var(--secondary)', 'var(--tertiary)', '#22c55e',
]

/* ===== Landing View ===== */
function LandingView({ scenarios, examples, onFill, onOpenFortune }) {
  return (
    <div>
      {/* Hero */}
      <section className="mb-10">
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 leading-tight">
          纠结的时候，<br />
          <span className="text-gradient">交给我 ⚡</span>
        </h2>
        <p className="text-[var(--text-secondary)] text-lg font-medium max-w-lg opacity-80">
          结合高维度算力与感知，为您在迷雾中划破决策的微光。
        </p>
      </section>

      {/* Daily Fortune */}
      <FortuneCard onOpen={onOpenFortune} />

      {/* Quick Scenarios — Grid */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]/60 px-1">Quick Scenarios</h4>
          <div className="h-[1px] flex-grow mx-4 bg-[var(--muted-2)]/30"></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {scenarios.map((s, idx) => {
            const color = SCENARIO_COLORS[idx % SCENARIO_COLORS.length]
            return (
              <button
                key={s.title}
                onClick={() => onFill(s.fill)}
                className="glass-card p-4 rounded-2xl text-left cursor-pointer active:scale-[0.96] transition-all duration-300 group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-[40px] opacity-15 -translate-y-1/2 translate-x-1/3 transition-opacity group-hover:opacity-30" style={{ background: color }} />
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
                >
                  <span className="material-symbols-outlined text-xl" style={{ color }}>
                    {SCENARIO_ICONS[s.emoji] || 'help'}
                  </span>
                </div>
                <h5 className="text-[15px] font-bold text-[var(--text)] mb-1">{s.title}</h5>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{s.desc}</p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Try Asking Me */}
      <section className="mb-20">
        <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]/60 mb-6 px-1">Try asking me</h4>
        <div className="space-y-3">
          {examples.map((ex) => (
            <button key={ex} onClick={() => onFill(ex)}
              className="w-full text-left p-5 bg-[#0f141a] hover:bg-[#1b2028] rounded-2xl flex items-center justify-between group transition-all duration-300"
            >
              <span className="text-[var(--text)] font-medium">"{ex}"</span>
              <span className="material-symbols-outlined text-[var(--muted-2)] group-hover:text-[var(--primary)] transition-colors">arrow_outward</span>
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

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    function updateHeight() {
      setAppHeight(`${vv.height}px`)
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
  const loc = getLocation()
  const cityName = loc ? [loc.city, loc.district].filter(Boolean).join(' ') || loc.city : ''

  return (
    <div className="flex flex-col bg-gradient-to-br from-[#0a0e14] via-[#0f141a] to-[#0a0e14] pb-20" style={{ height: appHeight }}>
      {/* Header */}
      <header className="flex-shrink-0 bg-[#0a0e14]/80 backdrop-blur-xl z-50 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div className="flex justify-between items-center px-6 h-16 w-full">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[var(--primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <h1 className="text-xl font-black tracking-tighter text-[var(--primary)]" style={{ filter: 'drop-shadow(0 0 15px rgba(182,160,255,0.3))' }}>帮我选</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                const loc = await requestLocation()
                if (loc?.city) {
                  setLocationText(formatLocation(loc))
                }
              }}
              className="flex items-center gap-1 text-slate-400 text-sm hover:text-[var(--primary)] transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">location_on</span>
              <span className="font-bold">{cityName || '获取定位...'}</span>
            </button>
            {inChat && (
              <button
                onClick={() => setMessages([])}
                className="w-8 h-8 rounded-full grid place-items-center text-[var(--muted)] text-sm hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent" />
      </header>

      {/* Content — scrollable */}
      <main className="flex-1 overflow-y-auto max-w-xl mx-auto w-full px-6 pt-8 pb-4">
        {!inChat ? (
          <LandingView scenarios={scenarios} examples={examples} onFill={handleFill} onOpenFortune={() => setShowFortune(true)} />
        ) : (
          <ChatView messages={messages} loading={loading} onSend={handleSend} onRetry={handleRetry} bottomRef={bottomRef} />
        )}
      </main>

      {/* Input — stays at bottom of flex */}
      <ChatInput ref={inputRef} onSend={handleSend} disabled={loading} />

      {/* Fortune Modal */}
      {showFortune && <FortuneModal onClose={() => setShowFortune(false)} />}

      {/* Decorative blur orbs */}
      {!inChat && (
        <>
          <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--primary)]/10 rounded-full blur-[120px] pointer-events-none -z-10" />
          <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--secondary)]/10 rounded-full blur-[150px] pointer-events-none -z-10" />
        </>
      )}

      <BottomNav />
    </div>
  )
}
