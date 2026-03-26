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
