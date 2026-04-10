const isDev = import.meta.env.DEV
const API_KEY = import.meta.env.VITE_MINIMAX_API_KEY || ''
const CHAT_URL = '/api/chat'

function extractJSON(text) {
  // 1. Direct parse
  try { return JSON.parse(text) } catch {}

  // 2. Fenced code block
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) } catch {}
  }

  // 3. Bracket-balanced extraction — find the first top-level { ... }
  const start = text.indexOf('{')
  if (start !== -1) {
    let depth = 0
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') depth++
      else if (text[i] === '}') depth--
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)) } catch {}
        break
      }
    }
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
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  })

  if (!response.ok) {
    throw new Error(`AI 正忙，稍后再试 (${response.status})`)
  }

  const data = await response.json()

  let text = ''
  if (Array.isArray(data.content)) {
    const textBlocks = data.content.filter((b) => b.type === 'text' && b.text)
    text = textBlocks.map((b) => b.text).join('')
  }

  if (!text) {
    throw new Error('AI 回复为空')
  }

  const parsed = extractJSON(text)
  if (parsed && (parsed.type === 'recommendation' || parsed.type === 'question')) {
    return { structured: true, data: parsed, raw: text }
  }

  return { structured: false, data: null, raw: text }
}
