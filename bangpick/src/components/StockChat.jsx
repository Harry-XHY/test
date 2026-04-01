export default function StockChat({ response, loading, error }) {
  if (!loading && !response && !error) return null

  return (
    <div className="glass-card rounded-2xl p-4">
      {loading && (
        <div className="flex items-center gap-2" style={{ color: '#a8abb3' }}>
          <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#b6a0ff', borderTopColor: 'transparent' }} />
          <span className="text-sm">正在分析，请稍候...</span>
        </div>
      )}
      {error && !loading && (
        <div className="text-sm" style={{ color: '#f87171' }}>
          <span className="material-symbols-outlined text-sm align-middle mr-1">error</span>
          {error}
        </div>
      )}
      {response && !loading && (
        <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#f1f3fc' }}>
          {response}
        </div>
      )}
    </div>
  )
}
