// Export & weekly review helpers — pure client-side, no extra deps.
// Decision history is local-first; we render it as Markdown and trigger
// a download. Weekly review computes a rolling 7-day summary on the fly.

import { getHistory } from './storage.js'

// ── Markdown export ──────────────────────────────────────────────

function fmtDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

export function historyToMarkdown(history) {
  const list = Array.isArray(history) ? history : []
  if (list.length === 0) return '# 帮我选 · 决策历史\n\n_（暂无记录）_\n'

  const lines = ['# 帮我选 · 决策历史', '']
  lines.push(`> 共 ${list.length} 条记录 · 导出于 ${fmtDate(Date.now())}`)
  lines.push('')

  for (const d of list) {
    lines.push(`## ${d.question || '(无题)'}`)
    lines.push('')
    lines.push(`*${fmtDate(d.createdAt)}*${d.mode === 'friend' ? ' · 朋友模式' : ''}`)
    lines.push('')
    if (Array.isArray(d.options) && d.options.length > 0) {
      d.options.forEach((o, i) => {
        const tags = Array.isArray(o.tags) && o.tags.length > 0 ? ` _${o.tags.join(' · ')}_` : ''
        lines.push(`${i + 1}. **${o.name}**${tags}`)
        if (o.reason) lines.push(`   - ${o.reason}`)
      })
      lines.push('')
    }
    if (d.result) {
      lines.push(`**最终选择：${d.result}**`)
      lines.push('')
    }
    lines.push('---')
    lines.push('')
  }
  return lines.join('\n')
}

// Triggers a browser download of the supplied text as a UTF-8 file.
export function downloadText(filename, text) {
  try {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return true
  } catch {
    return false
  }
}

export function exportHistoryAsMarkdown() {
  const md = historyToMarkdown(getHistory())
  const stamp = new Date().toISOString().slice(0, 10)
  return downloadText(`bangpick-history-${stamp}.md`, md)
}

// ── Weekly review ────────────────────────────────────────────────

// Builds a rolling 7-day summary from history. Returns null when there
// is nothing in the window. Tag frequency surfaces "what you keep
// asking about" — the most useful signal at this scale.
export function buildWeeklyReview(history = getHistory()) {
  const list = Array.isArray(history) ? history : []
  const now = Date.now()
  const cutoff = now - 7 * 24 * 60 * 60 * 1000
  const recent = list.filter(d => (d?.createdAt || 0) >= cutoff)
  if (recent.length === 0) return null

  const tagCounts = new Map()
  let optionTotal = 0
  let friendCount = 0
  for (const d of recent) {
    if (d.mode === 'friend') friendCount++
    if (Array.isArray(d.options)) {
      optionTotal += d.options.length
      for (const o of d.options) {
        if (Array.isArray(o.tags)) {
          for (const t of o.tags) {
            const key = String(t).trim()
            if (!key) continue
            tagCounts.set(key, (tagCounts.get(key) || 0) + 1)
          }
        }
      }
    }
  }

  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }))

  return {
    rangeStart: cutoff,
    rangeEnd: now,
    totalDecisions: recent.length,
    totalOptions: optionTotal,
    avgOptionsPerDecision: Number((optionTotal / recent.length).toFixed(1)),
    friendModeCount: friendCount,
    topTags,
    latestQuestion: recent[0]?.question || '',
  }
}
