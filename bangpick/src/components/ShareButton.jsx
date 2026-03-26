import { useState } from 'react'
import { createShareLink, shareOrCopy } from '../lib/share'

export default function ShareButton({ decision }) {
  const [status, setStatus] = useState('idle')

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
