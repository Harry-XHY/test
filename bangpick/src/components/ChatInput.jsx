import { useState, useImperativeHandle, forwardRef, useRef, useEffect } from 'react'

const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null

const ChatInput = forwardRef(function ChatInput({ onSend, disabled }, ref) {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  useImperativeHandle(ref, () => ({
    fill(value) { setText(typeof value === 'string' ? value : '') },
  }))

  useEffect(() => {
    return () => recognitionRef.current?.abort()
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
  }

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    if (!SpeechRecognition) {
      alert('您的浏览器不支持语音输入')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.interimResults = true
    recognition.continuous = false
    recognitionRef.current = recognition
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join('')
      setText(transcript)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognition.start()
    setListening(true)
  }

  const hasText = text.trim().length > 0

  return (
    <div className="flex-shrink-0 w-full max-w-xl mx-auto px-4 py-2 pb-[env(safe-area-inset-bottom,8px)]">
      <form onSubmit={handleSubmit}
        className="backdrop-blur-2xl rounded-[24px] p-2 flex items-center gap-3"
        style={{
          background: 'rgba(32, 38, 47, 0.85)',
          border: listening ? '1px solid #5B8CFF' : '1px solid rgba(255,255,255,0.1)',
          boxShadow: listening ? '0 0 30px rgba(91,140,255,0.2)' : '0 8px 30px rgba(0,0,0,0.3)',
        }}
      >
        <div className="flex-1 bg-black/20 rounded-[18px] px-4 py-3 flex items-center">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={listening ? '正在听你说...' : '描述你的犹豫...'}
            disabled={disabled || listening}
            className="bg-transparent border-none outline-none ring-0 w-full text-[15px] text-white placeholder-[var(--muted)] focus:ring-0 disabled:opacity-50"
          />
          {hasText && !listening && (
            <button type="button" onClick={() => setText('')}
              className="flex-shrink-0 ml-2 text-[var(--muted)] hover:text-white text-sm">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
        {hasText ? (
          <button type="submit" disabled={disabled}
            className="w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30"
            style={{
              background: 'linear-gradient(135deg, #5B8CFF, #7A7CFF)',
              boxShadow: '0 4px 15px rgba(91,140,255,0.4)',
            }}
          >
            <span className="material-symbols-outlined text-white font-bold">send</span>
          </button>
        ) : SpeechRecognition ? (
          <button type="button" onClick={toggleVoice} disabled={disabled}
            className={`w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30 ${listening ? 'pulse-active' : ''}`}
            style={listening ? {
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
            } : {
              background: 'linear-gradient(135deg, #5B8CFF, #7A7CFF)',
              boxShadow: '0 4px 15px rgba(91,140,255,0.4)',
            }}
          >
            <span className="material-symbols-outlined text-white font-bold">mic</span>
          </button>
        ) : null}
      </form>
    </div>
  )
})

export default ChatInput
