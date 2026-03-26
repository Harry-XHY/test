# BangPick（帮我选）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile H5 AI decision helper with quick-chat mode and shareable friend voting/spin-wheel mode.

**Architecture:** React SPA with MiniMax-M2.7 as AI backend (Anthropic-compatible API). localStorage for history/preferences, Netlify Blobs for share data persistence. Vite dev proxy for local development, Netlify Functions for production API proxying.

**Tech Stack:** React 19, Vite 8, TailwindCSS 4, react-router-dom 7, MiniMax-M2.7, Netlify Functions + Blobs

**Spec:** `docs/superpowers/specs/2026-03-26-bangpick-design.md`

---

## File Structure

```
bangpick/
├── index.html
├── vite.config.js
├── package.json
├── netlify.toml
├── netlify/functions/
│   ├── chat.js              # AI API proxy (env: MINIMAX_API_KEY)
│   ├── share-create.js      # Store Decision to Netlify Blob
│   └── share-get.js         # Read Decision from Netlify Blob
├── src/
│   ├── main.jsx             # React entry point
│   ├── App.jsx              # BrowserRouter + routes
│   ├── index.css            # TailwindCSS entry
│   ├── lib/
│   │   ├── minimax.js       # AI API call + JSON extraction
│   │   ├── storage.js       # localStorage CRUD for history/prefs
│   │   ├── share.js         # Share creation + navigator.share
│   │   └── prompt.js        # System prompt template
│   ├── components/
│   │   ├── ChatInput.jsx    # Input bar with send button
│   │   ├── OptionCard.jsx   # Single recommendation card
│   │   ├── VotePanel.jsx    # Voting interaction panel
│   │   ├── SpinWheel.jsx    # CSS spin wheel animation
│   │   └── ShareButton.jsx  # Share/copy link button
│   └── pages/
│       ├── ChatPage.jsx     # Main chat page (quick mode)
│       ├── FriendPage.jsx   # Initiator friend mode page
│       ├── SharePage.jsx    # Shared link landing page
│       └── HistoryPage.jsx  # Decision history page
└── public/
    └── favicon.svg
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `bangpick/package.json`
- Create: `bangpick/index.html`
- Create: `bangpick/vite.config.js`
- Create: `bangpick/src/main.jsx`
- Create: `bangpick/src/App.jsx`
- Create: `bangpick/src/index.css`

- [ ] **Step 1: Initialize project directory and package.json**

```bash
mkdir -p bangpick && cd bangpick
npm init -y
```

Then update `bangpick/package.json`:

```json
{
  "name": "bangpick",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd bangpick
npm install react@^19.2 react-dom@^19.2 react-router-dom@^7.13 tailwindcss@^4.2 @tailwindcss/vite@^4.2
npm install -D vite@^8.0 @vitejs/plugin-react@^6.0
```

- [ ] **Step 3: Create vite.config.js**

Create `bangpick/vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

process.env.NO_PROXY = '*'
process.env.no_proxy = '*'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/chat': {
        target: 'https://api.minimaxi.com',
        changeOrigin: true,
        secure: false,
        rewrite: () => '/anthropic/v1/messages',
      },
    },
  },
})
```

- [ ] **Step 4: Create index.html**

Create `bangpick/index.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>帮我选 — AI 决策助手</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create entry files**

Create `bangpick/src/index.css`:

```css
@import "tailwindcss";

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}
```

Create `bangpick/src/main.jsx`:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

Create `bangpick/src/App.jsx` (placeholder routes):

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'

function Placeholder({ name }) {
  return <div className="p-4 text-center text-slate-400">{name} — coming soon</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Placeholder name="ChatPage" />} />
        <Route path="/history" element={<Placeholder name="HistoryPage" />} />
        <Route path="/friend/:id" element={<Placeholder name="FriendPage" />} />
        <Route path="/vote/:id" element={<Placeholder name="SharePage" />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 6: Create .env files for API key**

Create `bangpick/.env.example`:

```
VITE_MINIMAX_API_KEY=your-minimax-api-key-here
```

Create `bangpick/.env.local` (gitignored):

```
VITE_MINIMAX_API_KEY=sk-cp-2f2Vu17He2TvNK2kBB8fcnOYGiI6vYhILFPSczvMJuE9E_9c2gHznEjlV-Uku6KcCKmJGduMkcDKBQ4r4YjQtPnj98OvHvKAw0uCmmN8jM1uUpRHbnVpYkE
```

Create `bangpick/.gitignore`:

```
node_modules
dist
.env.local
```

- [ ] **Step 7: Verify dev server starts**

```bash
cd bangpick && npm run dev
```

Expected: Vite dev server starts, visiting `http://localhost:5173/` shows "ChatPage — coming soon".

- [ ] **Step 8: Commit**

```bash
git add bangpick/
git commit -m "feat(bangpick): scaffold project with Vite + React + TailwindCSS"
```

---

## Task 2: Prompt Template & AI API Client

**Files:**
- Create: `bangpick/src/lib/prompt.js`
- Create: `bangpick/src/lib/minimax.js`

- [ ] **Step 1: Create prompt template**

Create `bangpick/src/lib/prompt.js`:

```javascript
export function buildSystemPrompt(preferences = '') {
  return `你是「帮我选」决策顾问。用户遇到选择困难，你要果断给出推荐。

规则：
1. 给出 2-3 个选项，必须有明确的推荐排序（第一个是最推荐的）
2. 每个选项包含：名称（最长20字）、推荐理由（一句话，最长50字）、标签（1-3 个关键词）
3. 不要说「都不错」「看你喜欢」，必须有态度
4. 如果信息不足，只问 1 个最关键的问题
5. 回复必须是纯 JSON，不要包含任何其他文字：
{
  "type": "recommendation",
  "options": [
    { "name": "选项名", "reason": "推荐理由", "tags": ["标签1", "标签2"] }
  ]
}
或者提问时：
{
  "type": "question",
  "question": "你的反问"
}

用户偏好：${preferences || '暂无'}`
}
```

- [ ] **Step 2: Create AI API client with JSON extraction**

Create `bangpick/src/lib/minimax.js`:

```javascript
const isDev = import.meta.env.DEV
const API_KEY = import.meta.env.VITE_MINIMAX_API_KEY || ''
const CHAT_URL = isDev ? '/api/chat' : '/.netlify/functions/chat'

/**
 * Extract JSON from LLM response text.
 * Handles: raw JSON, markdown fences, preamble text before JSON.
 */
function extractJSON(text) {
  // Try direct parse first
  try {
    return JSON.parse(text)
  } catch {}

  // Try extracting from markdown code fence
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim())
    } catch {}
  }

  // Try finding first { ... } block
  const braceMatch = text.match(/\{[\s\S]*\}/)
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0])
    } catch {}
  }

  return null
}

export async function sendMessage(systemPrompt, messages) {
  const headers = { 'Content-Type': 'application/json' }
  if (isDev && API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`
  }

  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'MiniMax-M2.7',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  })

  if (!response.ok) {
    throw new Error(`AI 正忙，稍后再试 (${response.status})`)
  }

  const data = await response.json()

  // Extract text from Anthropic-compatible response
  let text = ''
  if (Array.isArray(data.content)) {
    const textBlocks = data.content.filter((b) => b.type === 'text' && b.text)
    text = textBlocks.map((b) => b.text).join('')
  }

  if (!text) {
    throw new Error('AI 回复为空')
  }

  // Try to parse as structured JSON
  const parsed = extractJSON(text)
  if (parsed && (parsed.type === 'recommendation' || parsed.type === 'question')) {
    return { structured: true, data: parsed, raw: text }
  }

  // Fallback: return raw text
  return { structured: false, data: null, raw: text }
}
```

- [ ] **Step 3: Verify API call works**

Open browser console at `http://localhost:5173/` and run:

```javascript
import('/src/lib/minimax.js').then(m =>
  m.sendMessage('你是决策助手，回复纯JSON', [{ role: 'user', content: '午饭吃什么' }])
).then(console.log)
```

Expected: Returns an object with `structured: true` and options array.

- [ ] **Step 4: Commit**

```bash
git add bangpick/src/lib/prompt.js bangpick/src/lib/minimax.js
git commit -m "feat(bangpick): add prompt template and AI API client with JSON extraction"
```

---

## Task 3: localStorage Storage Layer

**Files:**
- Create: `bangpick/src/lib/storage.js`

- [ ] **Step 1: Create storage module**

Create `bangpick/src/lib/storage.js`:

```javascript
const HISTORY_KEY = 'bangpick_history'
const PREFS_KEY = 'bangpick_preferences'

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // localStorage full — silent fallback
    return false
  }
}

// --- History ---

export function getHistory() {
  return safeGet(HISTORY_KEY, [])
}

export function saveDecision(decision) {
  const history = getHistory()
  // Prepend (newest first), cap at 100
  history.unshift(decision)
  if (history.length > 100) history.pop()
  safeSet(HISTORY_KEY, history)
}

export function updateDecision(id, updates) {
  const history = getHistory()
  const idx = history.findIndex((d) => d.id === id)
  if (idx !== -1) {
    history[idx] = { ...history[idx], ...updates }
    safeSet(HISTORY_KEY, history)
  }
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY)
}

// --- Preferences ---

export function getPreferences() {
  return safeGet(PREFS_KEY, '')
}

export function setPreferences(prefs) {
  safeSet(PREFS_KEY, prefs)
}
```

- [ ] **Step 2: Commit**

```bash
git add bangpick/src/lib/storage.js
git commit -m "feat(bangpick): add localStorage storage layer for history and preferences"
```

---

## Task 4: ChatInput Component

**Files:**
- Create: `bangpick/src/components/ChatInput.jsx`

- [ ] **Step 1: Create ChatInput component**

Create `bangpick/src/components/ChatInput.jsx`:

```jsx
import { useState } from 'react'

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-3 bg-slate-800 border-t border-slate-700">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="今天吃什么？周末去哪玩？"
        disabled={disabled}
        className="flex-1 px-4 py-3 rounded-xl bg-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        className="px-5 py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-30 active:bg-blue-700"
      >
        问
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add bangpick/src/components/ChatInput.jsx
git commit -m "feat(bangpick): add ChatInput component"
```

---

## Task 5: OptionCard Component

**Files:**
- Create: `bangpick/src/components/OptionCard.jsx`

- [ ] **Step 1: Create OptionCard component**

Create `bangpick/src/components/OptionCard.jsx`:

```jsx
export default function OptionCard({ option, rank, onVote, showVote }) {
  const rankEmojis = ['🥇', '🥈', '🥉']

  return (
    <div
      className="bg-slate-700/50 rounded-xl p-4 border border-slate-600 hover:border-blue-500 transition-colors"
      onClick={showVote ? () => onVote?.(option.id) : undefined}
      role={showVote ? 'button' : undefined}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold text-white">
          {rankEmojis[rank] || ''} {option.name}
        </h3>
        {showVote && option.votes > 0 && (
          <span className="text-sm text-blue-400 font-medium">{option.votes} 票</span>
        )}
      </div>
      <p className="text-slate-300 text-sm mb-3">{option.reason}</p>
      <div className="flex gap-2 flex-wrap">
        {option.tags.map((tag) => (
          <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-slate-600 text-slate-300">
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add bangpick/src/components/OptionCard.jsx
git commit -m "feat(bangpick): add OptionCard recommendation card component"
```

---

## Task 6: ChatPage (Quick Mode)

**Files:**
- Create: `bangpick/src/pages/ChatPage.jsx`
- Modify: `bangpick/src/App.jsx`

- [ ] **Step 1: Create ChatPage**

Create `bangpick/src/pages/ChatPage.jsx`:

```jsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ChatInput from '../components/ChatInput'
import OptionCard from '../components/OptionCard'
import { sendMessage } from '../lib/minimax'
import { buildSystemPrompt } from '../lib/prompt'
import { getPreferences, saveDecision } from '../lib/storage'

export default function ChatPage() {
  const [messages, setMessages] = useState([]) // { role, content, parsed? }
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

      // Build complete message object before setting state (avoid stale mutation)
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
```

- [ ] **Step 2: Update App.jsx with real routes**

Replace `bangpick/src/App.jsx`:

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ChatPage from './pages/ChatPage'

function Placeholder({ name }) {
  return <div className="p-4 text-center text-slate-400">{name} — coming soon</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/history" element={<Placeholder name="HistoryPage" />} />
        <Route path="/friend/:id" element={<Placeholder name="FriendPage" />} />
        <Route path="/vote/:id" element={<Placeholder name="SharePage" />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Test quick mode end-to-end**

```bash
cd bangpick && npm run dev
```

Open `http://localhost:5173/`, type "晚上吃什么，两个人，想吃辣的", verify:
- AI returns 2-3 option cards with name, reason, tags
- "朋友来选" button appears below recommendations
- Follow-up messages ("换一批") work
- Error state shows gracefully if API fails

- [ ] **Step 4: Commit**

```bash
git add bangpick/src/pages/ChatPage.jsx bangpick/src/App.jsx
git commit -m "feat(bangpick): implement ChatPage with quick-mode AI recommendations"
```

---

## Task 7: VotePanel Component

**Files:**
- Create: `bangpick/src/components/VotePanel.jsx`

- [ ] **Step 1: Create VotePanel**

Create `bangpick/src/components/VotePanel.jsx`:

```jsx
import { useState } from 'react'
import OptionCard from './OptionCard'

export default function VotePanel({ options: initialOptions, onVoteComplete }) {
  const [options, setOptions] = useState(initialOptions)
  const [voted, setVoted] = useState(false)

  function handleVote(optionId) {
    if (voted) return
    setOptions((prev) =>
      prev.map((o) => (o.id === optionId ? { ...o, votes: o.votes + 1 } : o))
    )
    setVoted(true)
    onVoteComplete?.(optionId)
  }

  return (
    <div className="space-y-3">
      {options.map((opt, idx) => (
        <OptionCard
          key={opt.id}
          option={opt}
          rank={idx}
          showVote
          onVote={handleVote}
        />
      ))}
      {voted && (
        <p className="text-center text-sm text-green-400 mt-2">✓ 已投票！</p>
      )}
      {!voted && (
        <p className="text-center text-xs text-slate-500">点击选项进行投票</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add bangpick/src/components/VotePanel.jsx
git commit -m "feat(bangpick): add VotePanel voting component"
```

---

## Task 8: SpinWheel Component

**Files:**
- Create: `bangpick/src/components/SpinWheel.jsx`

- [ ] **Step 1: Create SpinWheel with CSS animation**

Create `bangpick/src/components/SpinWheel.jsx`:

```jsx
import { useState, useRef } from 'react'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

export default function SpinWheel({ options }) {
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const wheelRef = useRef(null)

  if (options.length < 2) {
    return <p className="text-center text-slate-400">至少需要 2 个选项才能转盘</p>
  }

  const sliceAngle = 360 / options.length

  function spin() {
    if (spinning) return
    setSpinning(true)
    setResult(null)

    const winIdx = Math.floor(Math.random() * options.length)
    // Spin 5-8 full rotations + land on the winner
    const extraRotations = (5 + Math.floor(Math.random() * 3)) * 360
    const targetAngle = extraRotations + (360 - winIdx * sliceAngle - sliceAngle / 2)

    const wheel = wheelRef.current
    wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
    wheel.style.transform = `rotate(${targetAngle}deg)`

    setTimeout(() => {
      setSpinning(false)
      setResult(options[winIdx])
    }, 4200)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Pointer */}
      <div className="text-2xl">▼</div>

      {/* Wheel */}
      <div className="relative w-64 h-64">
        <svg
          ref={wheelRef}
          viewBox="0 0 200 200"
          className="w-full h-full"
          style={{ transformOrigin: 'center' }}
        >
          {options.map((opt, i) => {
            const startAngle = i * sliceAngle
            const endAngle = startAngle + sliceAngle
            const startRad = (Math.PI / 180) * (startAngle - 90)
            const endRad = (Math.PI / 180) * (endAngle - 90)
            const x1 = 100 + 95 * Math.cos(startRad)
            const y1 = 100 + 95 * Math.sin(startRad)
            const x2 = 100 + 95 * Math.cos(endRad)
            const y2 = 100 + 95 * Math.sin(endRad)
            const largeArc = sliceAngle > 180 ? 1 : 0
            const midRad = (Math.PI / 180) * ((startAngle + endAngle) / 2 - 90)
            const textX = 100 + 55 * Math.cos(midRad)
            const textY = 100 + 55 * Math.sin(midRad)
            const textRotation = (startAngle + endAngle) / 2

            return (
              <g key={i}>
                <path
                  d={`M100,100 L${x1},${y1} A95,95 0 ${largeArc},1 ${x2},${y2} Z`}
                  fill={COLORS[i % COLORS.length]}
                  stroke="#1e293b"
                  strokeWidth="1"
                />
                <text
                  x={textX}
                  y={textY}
                  fill="white"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                >
                  {opt.name.length > 6 ? opt.name.slice(0, 6) + '…' : opt.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Spin Button */}
      <button
        onClick={spin}
        disabled={spinning}
        className="px-8 py-3 rounded-xl bg-purple-600 text-white font-bold text-lg active:bg-purple-700 disabled:opacity-50"
      >
        {spinning ? '转动中...' : '🎰 转！'}
      </button>

      {/* Result */}
      {result && (
        <div className="text-center mt-2 p-3 bg-green-900/30 rounded-xl border border-green-700">
          <p className="text-green-400 font-bold text-lg">就它了！ {result.name}</p>
          <p className="text-slate-300 text-sm mt-1">{result.reason}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add bangpick/src/components/SpinWheel.jsx
git commit -m "feat(bangpick): add SpinWheel CSS animated component"
```

---

## Task 9: ShareButton & Share Utilities

**Files:**
- Create: `bangpick/src/lib/share.js`
- Create: `bangpick/src/components/ShareButton.jsx`

- [ ] **Step 1: Create share utility**

Create `bangpick/src/lib/share.js`:

```javascript
/**
 * Create a share link by storing decision data via Netlify Function.
 * Falls back to base64 URL encoding if the function is unavailable (dev mode).
 */
export async function createShareLink(decision) {
  try {
    const res = await fetch('/.netlify/functions/share-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decision),
    })
    if (res.ok) {
      const { id } = await res.json()
      return `${window.location.origin}/vote/${id}`
    }
  } catch {}

  // Dev fallback: base64 in URL (only works for short decisions)
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(decision))))
  return `${window.location.origin}/vote/b64_${encoded}`
}

/**
 * Fetch shared decision data by ID.
 */
export async function getSharedDecision(id) {
  // Handle dev base64 fallback
  if (id.startsWith('b64_')) {
    try {
      const json = decodeURIComponent(escape(atob(id.slice(4))))
      return JSON.parse(json)
    } catch {
      return null
    }
  }

  try {
    const res = await fetch(`/.netlify/functions/share-get?id=${id}`)
    if (res.ok) return res.json()
  } catch {}
  return null
}

/**
 * Trigger native share or copy to clipboard.
 */
export async function shareOrCopy(url, question) {
  const text = `我在纠结：${question}，快来帮我选！`

  if (navigator.share) {
    try {
      await navigator.share({ title: '帮我选', text, url })
      return 'shared'
    } catch {}
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`)
    return 'copied'
  } catch {
    return 'failed'
  }
}
```

- [ ] **Step 2: Create ShareButton component**

Create `bangpick/src/components/ShareButton.jsx`:

```jsx
import { useState } from 'react'
import { createShareLink, shareOrCopy } from '../lib/share'

export default function ShareButton({ decision }) {
  const [status, setStatus] = useState('idle') // idle | loading | copied | shared | failed

  async function handleShare() {
    setStatus('loading')
    try {
      const url = await createShareLink(decision)
      const result = await shareOrCopy(url, decision.question)
      setStatus(result)
      if (result === 'copied') {
        setTimeout(() => setStatus('idle'), 2000)
      }
    } catch {
      setStatus('failed')
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  const labels = {
    idle: '📤 分享给朋友',
    loading: '生成链接...',
    copied: '✓ 已复制链接',
    shared: '✓ 已分享',
    failed: '分享失败',
  }

  return (
    <button
      onClick={handleShare}
      disabled={status === 'loading'}
      className="w-full py-3 rounded-xl bg-green-600 text-white font-medium active:bg-green-700 disabled:opacity-50"
    >
      {labels[status]}
    </button>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add bangpick/src/lib/share.js bangpick/src/components/ShareButton.jsx
git commit -m "feat(bangpick): add share utilities and ShareButton component"
```

---

## Task 10: FriendPage (Initiator View)

**Files:**
- Create: `bangpick/src/pages/FriendPage.jsx`
- Modify: `bangpick/src/App.jsx`

- [ ] **Step 1: Create FriendPage**

Create `bangpick/src/pages/FriendPage.jsx`:

```jsx
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
  const [mode, setMode] = useState('vote') // 'vote' | 'spin'

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
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white">←</button>
        <h1 className="text-lg font-bold text-white flex-1 truncate">朋友来选</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Question */}
        <div className="text-center">
          <p className="text-slate-400 text-sm">我在纠结：</p>
          <p className="text-white text-xl font-bold mt-1">{decision.question}</p>
        </div>

        {/* Mode Toggle */}
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

        {/* Content */}
        {mode === 'vote' ? (
          <VotePanel options={decision.options} />
        ) : (
          <SpinWheel options={decision.options} />
        )}
      </div>

      {/* Share */}
      <div className="p-3 bg-slate-800 border-t border-slate-700">
        <ShareButton decision={decision} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update App.jsx to use FriendPage**

In `bangpick/src/App.jsx`, add import and replace the FriendPage placeholder:

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ChatPage from './pages/ChatPage'
import FriendPage from './pages/FriendPage'

function Placeholder({ name }) {
  return <div className="p-4 text-center text-slate-400">{name} — coming soon</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/history" element={<Placeholder name="HistoryPage" />} />
        <Route path="/friend/:id" element={<FriendPage />} />
        <Route path="/vote/:id" element={<Placeholder name="SharePage" />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Test friend mode flow**

1. Open `http://localhost:5173/`, ask a question, get recommendations
2. Click "朋友来选" → verify FriendPage loads with question + options
3. Toggle between vote and spin modes
4. Click share button → verify link generation (dev fallback)

- [ ] **Step 4: Commit**

```bash
git add bangpick/src/pages/FriendPage.jsx bangpick/src/App.jsx
git commit -m "feat(bangpick): implement FriendPage with vote/spin toggle and sharing"
```

---

## Task 11: SharePage (Participant View)

**Files:**
- Create: `bangpick/src/pages/SharePage.jsx`
- Modify: `bangpick/src/App.jsx`

- [ ] **Step 1: Create SharePage**

Create `bangpick/src/pages/SharePage.jsx`:

```jsx
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

  // Nickname gate — enter before voting
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
      {/* Header */}
      <header className="px-4 py-3 bg-slate-800 border-b border-slate-700 text-center">
        <p className="text-sm text-slate-400">帮我选一个：</p>
        <h1 className="text-lg font-bold text-white">{decision.question}</h1>
        <p className="text-xs text-slate-500 mt-1">👤 {nickname}</p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Mode Toggle */}
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

        {/* Content */}
        {mode === 'vote' ? (
          <VotePanel options={decision.options} />
        ) : (
          <SpinWheel options={decision.options} />
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-800 border-t border-slate-700 text-center">
        <a href="/" className="text-sm text-blue-400">我也有选择困难 → 帮我选</a>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update App.jsx to use SharePage**

In `bangpick/src/App.jsx`:

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ChatPage from './pages/ChatPage'
import FriendPage from './pages/FriendPage'
import SharePage from './pages/SharePage'

function Placeholder({ name }) {
  return <div className="p-4 text-center text-slate-400">{name} — coming soon</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/history" element={<Placeholder name="HistoryPage" />} />
        <Route path="/friend/:id" element={<FriendPage />} />
        <Route path="/vote/:id" element={<SharePage />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Test share page**

In dev mode, manually visit a base64-encoded share URL to verify the page loads and renders options.

- [ ] **Step 4: Commit**

```bash
git add bangpick/src/pages/SharePage.jsx bangpick/src/App.jsx
git commit -m "feat(bangpick): implement SharePage for shared vote/spin participation"
```

---

## Task 12: HistoryPage

**Files:**
- Create: `bangpick/src/pages/HistoryPage.jsx`
- Modify: `bangpick/src/App.jsx`

- [ ] **Step 1: Create HistoryPage**

Create `bangpick/src/pages/HistoryPage.jsx`:

```jsx
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
      {/* Header */}
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
```

- [ ] **Step 2: Update App.jsx with HistoryPage**

Final `bangpick/src/App.jsx`:

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ChatPage from './pages/ChatPage'
import FriendPage from './pages/FriendPage'
import SharePage from './pages/SharePage'
import HistoryPage from './pages/HistoryPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/friend/:id" element={<FriendPage />} />
        <Route path="/vote/:id" element={<SharePage />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Test history flow**

1. Make a few decisions on ChatPage
2. Go to History → verify decisions listed with timestamps
3. Clear history → verify empty state

- [ ] **Step 4: Commit**

```bash
git add bangpick/src/pages/HistoryPage.jsx bangpick/src/App.jsx
git commit -m "feat(bangpick): implement HistoryPage with decision history list"
```

---

## Task 13: Netlify Functions (Production API Proxy + Share Storage)

**Files:**
- Create: `bangpick/netlify.toml`
- Create: `bangpick/netlify/functions/chat.js`
- Create: `bangpick/netlify/functions/share-create.js`
- Create: `bangpick/netlify/functions/share-get.js`

- [ ] **Step 1: Create netlify.toml**

Create `bangpick/netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

- [ ] **Step 2: Create chat proxy function**

Create `bangpick/netlify/functions/chat.js`:

```javascript
export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await req.json()
  const apiKey = process.env.MINIMAX_API_KEY

  const response = await fetch('https://api.minimaxi.com/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 3: Create share-create function**

Create `bangpick/netlify/functions/share-create.js`:

```javascript
import { getStore } from '@netlify/blobs'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const decision = await req.json()
    const id = crypto.randomUUID().slice(0, 8) // Short ID

    const store = getStore('bangpick-shares')
    await store.setJSON(id, decision)

    return new Response(JSON.stringify({ id }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: '存储失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
```

- [ ] **Step 4: Create share-get function**

Create `bangpick/netlify/functions/share-get.js`:

```javascript
import { getStore } from '@netlify/blobs'

export default async (req) => {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return new Response('Missing id', { status: 400 })
  }

  try {
    const store = getStore('bangpick-shares')
    const decision = await store.get(id, { type: 'json' })

    if (!decision) {
      return new Response('Not found', { status: 404 })
    }

    return new Response(JSON.stringify(decision), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: '读取失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
```

- [ ] **Step 5: Install Netlify Blobs dependency**

```bash
cd bangpick && npm install @netlify/blobs
```

- [ ] **Step 6: Commit**

```bash
git add bangpick/netlify.toml bangpick/netlify/ bangpick/package.json bangpick/package-lock.json
git commit -m "feat(bangpick): add Netlify Functions for chat proxy and share storage"
```

---

## Task 14: Favicon & Final Polish

**Files:**
- Create: `bangpick/public/favicon.svg`

- [ ] **Step 1: Create favicon**

Create `bangpick/public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <text y="0.9em" font-size="80">🤔</text>
</svg>
```

- [ ] **Step 2: End-to-end test of all flows**

Test the complete application:

1. **Quick mode**: Ask 3 different questions, verify AI responses render correctly
2. **Friend mode**: Click "朋友来选", toggle vote/spin, test sharing
3. **Share page**: Open a share link, vote, use spin wheel
4. **History**: Verify all decisions appear, clear history works
5. **Error handling**: Disconnect network → verify error message appears
6. **Mobile**: Open in Chrome DevTools responsive mode → verify layout

- [ ] **Step 3: Commit**

```bash
git add bangpick/public/favicon.svg
git commit -m "feat(bangpick): add favicon and complete v1 implementation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Project scaffolding | package.json, vite.config.js, index.html, main.jsx, App.jsx, index.css |
| 2 | Prompt template + AI client | lib/prompt.js, lib/minimax.js |
| 3 | localStorage storage layer | lib/storage.js |
| 4 | ChatInput component | components/ChatInput.jsx |
| 5 | OptionCard component | components/OptionCard.jsx |
| 6 | ChatPage (quick mode) | pages/ChatPage.jsx |
| 7 | VotePanel component | components/VotePanel.jsx |
| 8 | SpinWheel component | components/SpinWheel.jsx |
| 9 | Share utilities + ShareButton | lib/share.js, components/ShareButton.jsx |
| 10 | FriendPage (initiator view) | pages/FriendPage.jsx |
| 11 | SharePage (participant view) | pages/SharePage.jsx |
| 12 | HistoryPage | pages/HistoryPage.jsx |
| 13 | Netlify Functions | netlify.toml, netlify/functions/*.js |
| 14 | Favicon + final polish | public/favicon.svg |
