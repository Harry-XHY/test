// Decision-chat endpoint. Delegates to the configured AI provider (Gemini by
// default, MiniMax fallback). Front-end (src/lib/minimax.js) historically
// expects an Anthropic-shaped response — we wrap the provider's output back
// into { content: [{ type: 'text', text }] } so no client changes are needed.

import { chatStream } from './_aiProvider.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  try {
    const { system, messages, max_tokens } = req.body || {}
    // Internal streaming: we consume the provider's SSE stream chunk by chunk
    // so the TCP connection stays active (no 90s idle timeout), then return
    // the concatenated text as a single JSON payload. Client code unchanged.
    let text = ''
    await chatStream({
      system: system || '',
      messages: Array.isArray(messages) ? messages : [],
      maxTokens: max_tokens || 1024,
      onChunk: (delta) => { text += delta },
    })

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      content: [{ type: 'text', text }],
    }))
  } catch (err) {
    console.error('[chat] upstream failed:', err)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err?.message || 'Upstream request failed' }))
  }
}
