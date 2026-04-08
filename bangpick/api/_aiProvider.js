// Unified AI provider abstraction.
//
// Lets us swap between Gemini (default, free tier) and MiniMax (legacy)
// without touching api/chat.js or api/stock-analyze.js. Each provider exposes:
//
//   chatComplete({ system, messages, maxTokens }) → { text }
//   chatStream  ({ system, messages, maxTokens, onChunk }) → Promise<void>
//
// Provider selection: process.env.AI_PROVIDER, defaults to 'gemini'.
// Required env vars per provider:
//   gemini  → GEMINI_API_KEY (https://aistudio.google.com — free tier)
//   minimax → MINIMAX_API_KEY (legacy fallback)

import https from 'node:https'
import { StringDecoder } from 'node:string_decoder'

const PROVIDER = (process.env.AI_PROVIDER || 'zhipu').toLowerCase()

// ── HTTPS POST helper (non-stream) ──────────────────────────────────────

function httpsPostJSON(url, headers, body, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const req = https.request(
      {
        method: 'POST',
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: { 'Content-Type': 'application/json', ...headers, 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = ''
        res.on('data', (c) => { data += c })
        res.on('end', () => resolve({ status: res.statusCode, body: data }))
      }
    )
    req.on('error', reject)
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')) })
    req.write(body)
    req.end()
  })
}

// ── HTTPS POST helper (SSE stream) ──────────────────────────────────────

function httpsPostStream(url, headers, body, onLine, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const req = https.request(
      {
        method: 'POST',
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: { 'Content-Type': 'application/json', ...headers, 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        if (res.statusCode !== 200) {
          let errBody = ''
          res.on('data', (c) => { errBody += c })
          res.on('end', () => reject(new Error(`upstream ${res.statusCode}: ${errBody.slice(0, 200)}`)))
          return
        }
        // StringDecoder handles multi-byte UTF-8 across TCP chunk boundaries.
        // Plain `chunk.toString()` would corrupt Chinese chars / emoji split
        // mid-byte, then JSON.parse would silently throw and the SSE delta
        // text after that point would be lost — exactly the "output truncated
        // mid-stream" symptom we were chasing.
        const decoder = new StringDecoder('utf8')
        let buf = ''
        res.on('data', (chunk) => {
          buf += decoder.write(chunk)
          const lines = buf.split('\n')
          buf = lines.pop()
          for (const line of lines) onLine(line)
        })
        res.on('end', () => {
          buf += decoder.end()
          if (buf) onLine(buf)
          resolve()
        })
        res.on('error', reject)
      }
    )
    req.on('error', reject)
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')) })
    req.write(body)
    req.end()
  })
}

// ── Gemini provider (OpenAI-compatible endpoint) ────────────────────────
//
// Uses Google's OpenAI-compatible chat completions endpoint, which speaks the
// same JSON shape as OpenAI / Zhipu / DeepSeek. Free tier as of 2026:
// gemini-2.5-flash → 15 RPM, 1500 RPD, 250K TPM. Plenty for personal use.

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai'
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

function geminiAuthHeaders() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY not configured')
  return { Authorization: `Bearer ${key}` }
}

// Convert {system, messages} → OpenAI chat messages array
function toOpenAIMessages(system, messages) {
  const arr = []
  if (system) arr.push({ role: 'system', content: system })
  for (const m of messages || []) {
    if (!m?.role || !m?.content) continue
    arr.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) })
  }
  return arr
}

async function geminiComplete({ system, messages, maxTokens = 1024 }) {
  const body = JSON.stringify({
    model: GEMINI_MODEL,
    max_tokens: maxTokens,
    messages: toOpenAIMessages(system, messages),
  })
  const r = await httpsPostJSON(`${GEMINI_BASE}/chat/completions`, geminiAuthHeaders(), body)
  if (r.status !== 200) throw new Error(`gemini ${r.status}: ${r.body.slice(0, 200)}`)
  const data = JSON.parse(r.body)
  const text = data.choices?.[0]?.message?.content || ''
  return { text }
}

async function geminiStream({ system, messages, maxTokens = 2048, onChunk }) {
  const body = JSON.stringify({
    model: GEMINI_MODEL,
    max_tokens: maxTokens,
    stream: true,
    messages: toOpenAIMessages(system, messages),
  })
  await httpsPostStream(`${GEMINI_BASE}/chat/completions`, geminiAuthHeaders(), body, (line) => {
    if (!line.startsWith('data: ')) return
    const payload = line.slice(6).trim()
    if (!payload || payload === '[DONE]') return
    try {
      const evt = JSON.parse(payload)
      const delta = evt.choices?.[0]?.delta?.content
      if (delta) onChunk(delta)
    } catch { /* ignore parse errors on partial frames */ }
  })
}

// ── 智谱 GLM provider (zhipu, OpenAI-compatible) ────────────────────────
//
// 智谱 BigModel 的 OpenAI 兼容端点。GLM-4.5-Flash 永久免费，国内直连稳，
// 不受 Google Gemini 的香港 IP 限制影响 —— 部署在 hkg1 region 也能调通。
// Key 申请：https://open.bigmodel.cn → 个人中心 → API Keys

const ZHIPU_BASE = 'https://open.bigmodel.cn/api/paas/v4'
// GLM-4.5-Flash 是智谱永久免费的开放模型，指令遵循对 stock prompts 够用。
// （曾经错写成 glm-4.7-flash，线上 404 导致所有 AI 分析返回「暂时不可用」。）
const ZHIPU_MODEL = process.env.ZHIPU_MODEL || 'glm-4.5-flash'

function zhipuAuthHeaders() {
  const key = process.env.ZHIPU_API_KEY
  if (!key) throw new Error('ZHIPU_API_KEY not configured')
  return { Authorization: `Bearer ${key}` }
}

async function zhipuComplete({ system, messages, maxTokens = 1024 }) {
  const body = JSON.stringify({
    model: ZHIPU_MODEL,
    max_tokens: maxTokens,
    // GLM-4.6/4.7 系列默认是推理模型，会先吐 reasoning_content 占用 tokens。
    // 我们要的是直接结构化输出，关闭思考链。
    thinking: { type: 'disabled' },
    messages: toOpenAIMessages(system, messages),
  })
  const r = await httpsPostJSON(`${ZHIPU_BASE}/chat/completions`, zhipuAuthHeaders(), body)
  if (r.status !== 200) throw new Error(`zhipu ${r.status}: ${r.body.slice(0, 200)}`)
  const data = JSON.parse(r.body)
  const text = data.choices?.[0]?.message?.content || ''
  return { text }
}

async function zhipuStream({ system, messages, maxTokens = 2048, onChunk }) {
  const body = JSON.stringify({
    model: ZHIPU_MODEL,
    max_tokens: maxTokens,
    stream: true,
    thinking: { type: 'disabled' },
    messages: toOpenAIMessages(system, messages),
  })
  await httpsPostStream(`${ZHIPU_BASE}/chat/completions`, zhipuAuthHeaders(), body, (line) => {
    if (!line.startsWith('data: ')) return
    const payload = line.slice(6).trim()
    if (!payload || payload === '[DONE]') return
    try {
      const evt = JSON.parse(payload)
      const delta = evt.choices?.[0]?.delta?.content
      if (delta) onChunk(delta)
    } catch { /* ignore parse errors on partial frames */ }
  })
}

// ── 阿里通义千问 Qwen provider (DashScope OpenAI 兼容端点) ────────────
//
// 阿里云百炼 DashScope 提供 OpenAI 兼容 API。Qwen-Plus 有免费额度
// （注册即送 100万 tokens，长期免费层级也可用）。中文能力强、国内直连稳。
// Key 申请：https://bailian.console.aliyun.com → API-KEY 管理

const QWEN_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
const QWEN_MODEL = process.env.QWEN_MODEL || 'qwen-plus'

function qwenAuthHeaders() {
  const key = process.env.DASHSCOPE_API_KEY
  if (!key) throw new Error('DASHSCOPE_API_KEY not configured')
  return { Authorization: `Bearer ${key}` }
}

async function qwenComplete({ system, messages, maxTokens = 1024 }) {
  const body = JSON.stringify({
    model: QWEN_MODEL,
    max_tokens: maxTokens,
    messages: toOpenAIMessages(system, messages),
  })
  const r = await httpsPostJSON(`${QWEN_BASE}/chat/completions`, qwenAuthHeaders(), body)
  if (r.status !== 200) throw new Error(`qwen ${r.status}: ${r.body.slice(0, 200)}`)
  const data = JSON.parse(r.body)
  const text = data.choices?.[0]?.message?.content || ''
  return { text }
}

async function qwenStream({ system, messages, maxTokens = 2048, onChunk }) {
  const body = JSON.stringify({
    model: QWEN_MODEL,
    max_tokens: maxTokens,
    stream: true,
    messages: toOpenAIMessages(system, messages),
  })
  await httpsPostStream(`${QWEN_BASE}/chat/completions`, qwenAuthHeaders(), body, (line) => {
    if (!line.startsWith('data: ')) return
    const payload = line.slice(6).trim()
    if (!payload || payload === '[DONE]') return
    try {
      const evt = JSON.parse(payload)
      const delta = evt.choices?.[0]?.delta?.content
      if (delta) onChunk(delta)
    } catch { /* ignore */ }
  })
}

// ── MiniMax provider (legacy fallback) ──────────────────────────────────

const MINIMAX_URL = 'https://api.minimaxi.com/anthropic/v1/messages'
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M2.7'

function minimaxAuthHeaders() {
  const key = process.env.MINIMAX_API_KEY
  if (!key) throw new Error('MINIMAX_API_KEY not configured')
  return { Authorization: `Bearer ${key}` }
}

async function minimaxComplete({ system, messages, maxTokens = 1024 }) {
  const body = JSON.stringify({
    model: MINIMAX_MODEL,
    max_tokens: maxTokens,
    system,
    messages: (messages || []).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || ''),
    })),
  })
  const r = await httpsPostJSON(MINIMAX_URL, minimaxAuthHeaders(), body)
  if (r.status !== 200) throw new Error(`minimax ${r.status}: ${r.body.slice(0, 200)}`)
  const data = JSON.parse(r.body)
  const text = Array.isArray(data.content)
    ? data.content.filter((b) => b.type === 'text' && b.text).map((b) => b.text).join('')
    : ''
  return { text }
}

async function minimaxStream({ system, messages, maxTokens = 2048, onChunk }) {
  const body = JSON.stringify({
    model: MINIMAX_MODEL,
    max_tokens: maxTokens,
    stream: true,
    system,
    messages: (messages || []).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || ''),
    })),
  })
  await httpsPostStream(MINIMAX_URL, minimaxAuthHeaders(), body, (line) => {
    if (!line.startsWith('data: ')) return
    const payload = line.slice(6).trim()
    if (!payload || payload === '[DONE]') return
    try {
      const evt = JSON.parse(payload)
      if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
        onChunk(evt.delta.text)
      }
    } catch { /* ignore */ }
  })
}

// ── Public API ──────────────────────────────────────────────────────────

const PROVIDERS = {
  qwen: { complete: qwenComplete, stream: qwenStream },
  gemini: { complete: geminiComplete, stream: geminiStream },
  zhipu: { complete: zhipuComplete, stream: zhipuStream },
  minimax: { complete: minimaxComplete, stream: minimaxStream },
}

function getProvider() {
  return PROVIDERS[PROVIDER] || PROVIDERS.qwen
}

export async function chatComplete(opts) {
  return getProvider().complete(opts)
}

export async function chatStream(opts) {
  return getProvider().stream(opts)
}

export const activeProvider = PROVIDER
