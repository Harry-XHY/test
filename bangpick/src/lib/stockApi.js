export async function searchStock(keyword) {
  if (!keyword || keyword.trim().length < 1) return []
  const res = await fetch('/api/stock-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword: keyword.trim() })
  })
  if (!res.ok) return []
  return res.json()
}

// Streaming stock analysis via SSE
// onMeta({ type, stockData? }) — called once with metadata + stock data
// onDelta(text) — called for each text chunk
// onDone() — called when stream completes
// Returns: abort function
export function analyzeStockStream(payload, { onMeta, onDelta, onDone, onError }) {
  const controller = new AbortController()

  ;(async () => {
    try {
      console.log('[analyzeStockStream] fetching with payload', payload)
      // Renamed from /api/stock-analyze — uBlock/AdBlock default rules
      // (EasyPrivacy) match `*analyze*` `*analytics*` and silently abort the
      // request before it leaves the browser. Network panel shows red ❌ with
      // "Provisional headers shown" and the server never sees the call.
      const res = await fetch('/api/stock-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      console.log('[analyzeStockStream] response received', res.status, res.headers.get('content-type'))

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        onError?.(new Error(err.error || '请求失败'))
        return
      }

      const contentType = res.headers.get('content-type') || ''

      // Non-streaming JSON response (no_opportunity, errors, suspended)
      if (contentType.includes('application/json')) {
        const data = await res.json()
        onMeta?.(data)
        if (data.text || data.message) {
          onDelta?.(data.text || data.message)
        }
        onDone?.()
        return
      }

      // SSE streaming response
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      // currentEvent MUST persist across chunks. The server flushes a 2KB
      // padding comment before any real events, so the `event:` line and its
      // matching `data:` line frequently land in different reader chunks. If
      // we reset per chunk, the data line arrives with no event context and
      // gets silently dropped.
      let currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })

        const lines = buf.split('\n')
        buf = lines.pop() // keep incomplete line

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            try {
              const parsed = JSON.parse(data)
              if (currentEvent === 'meta') {
                onMeta?.(parsed)
              } else if (currentEvent === 'delta') {
                onDelta?.(parsed.text || '')
              } else if (currentEvent === 'done') {
                onDone?.()
              }
            } catch {}
            currentEvent = ''
          }
        }
      }

      onDone?.()
    } catch (err) {
      if (err.name !== 'AbortError') {
        onError?.(err)
      }
    }
  })()

  return () => controller.abort()
}

export async function getStockData(code, market, name) {
  const res = await fetch('/api/stock-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, market, name })
  })
  if (!res.ok) throw new Error('获取行情失败')
  return res.json()
}
