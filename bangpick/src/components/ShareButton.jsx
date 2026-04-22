import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createShareLink, shareOrCopy } from '../lib/share'

export default function ShareButton({ decision }) {
  const { t } = useTranslation()
  const [status, setStatus] = useState('idle')

  async function handleShare() {
    setStatus('loading')
    try {
      const url = await createShareLink(decision)
      const result = await shareOrCopy(url, decision.question, decision.type)
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
    idle: t('share_btn.idle'),
    loading: t('share_btn.loading'),
    copied: t('share_btn.copied'),
    shared: t('share_btn.shared'),
    failed: t('share_btn.failed'),
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
