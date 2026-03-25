import { useState } from 'react'

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('suggestion')
  const [content, setContent] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = () => {
    if (!content.trim()) return
    // 本地存储反馈（后续接入 Supabase）
    const feedbacks = JSON.parse(localStorage.getItem('feedbacks') || '[]')
    feedbacks.push({ type, content: content.trim(), time: new Date().toISOString() })
    localStorage.setItem('feedbacks', JSON.stringify(feedbacks))
    setSent(true)
    setTimeout(() => {
      setOpen(false)
      setSent(false)
      setContent('')
    }, 2000)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="no-print fixed bottom-6 right-6 w-12 h-12 bg-blue-600 text-white rounded-full text-xl cursor-pointer border-none shadow-lg hover:bg-blue-500 transition-colors z-50"
        title="反馈"
      >
        💬
      </button>
    )
  }

  return (
    <div className="no-print fixed bottom-6 right-6 w-80 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50">
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-slate-200 m-0">反馈建议</h3>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-400 cursor-pointer bg-transparent border-none text-lg"
          >
            ✕
          </button>
        </div>

        {sent ? (
          <p className="text-green-400 text-sm text-center py-4">感谢反馈！</p>
        ) : (
          <>
            <div className="flex gap-2 mb-3">
              {[
                { value: 'suggestion', label: '建议' },
                { value: 'bug', label: 'Bug' },
                { value: 'other', label: '其他' },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`px-3 py-1 rounded text-xs cursor-pointer border-none ${
                    type === t.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <textarea
              className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 resize-none"
              rows={3}
              placeholder="说说你的想法..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <button
              onClick={handleSubmit}
              disabled={!content.trim()}
              className="mt-2 w-full py-2 bg-blue-600 text-white rounded text-sm cursor-pointer border-none hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              提交
            </button>
          </>
        )}
      </div>
    </div>
  )
}
