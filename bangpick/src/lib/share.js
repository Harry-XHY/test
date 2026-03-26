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

  // Dev fallback: base64 in URL
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(decision))))
  return `${window.location.origin}/vote/b64_${encoded}`
}

export async function getSharedDecision(id) {
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

export async function shareOrCopy(url, question) {
  const text = `我在纠结：${question}，快来帮我选！`

  if (navigator.share) {
    try {
      await navigator.share({ title: '帮我选', text, url })
      return 'shared'
    } catch {}
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${url}`)
    return 'copied'
  } catch {
    return 'failed'
  }
}
