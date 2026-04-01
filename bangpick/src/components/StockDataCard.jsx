export default function StockDataCard({ data }) {
  if (!data || data.suspended || data.error) return null

  const changeColor = data.change >= 0 ? '#f87171' : '#4ade80'  // red for gain, green for loss (A-share convention)
  const changePrefix = data.change >= 0 ? '+' : ''

  const macdDesc = {
    'golden_cross': '🟢 MACD金叉（短期上涨动能增强）',
    'above_zero': '🔵 MACD零轴上方运行（持续多头）',
    'dead_cross': '🔴 MACD死叉（短期下跌信号）',
    'below_zero': '🟡 MACD在零轴下方（动能偏弱）',
  }

  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold" style={{ color: '#f1f3fc' }}>{data.name}</span>
        <span className="text-xs" style={{ color: '#72757d' }}>{data.code}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold" style={{ color: '#f1f3fc' }}>¥{data.close}</span>
        <span className="text-sm font-medium" style={{ color: changeColor }}>{changePrefix}{data.change}%</span>
      </div>
      <div className="text-xs" style={{ color: '#72757d' }}>数据截至 {data.latestDate}</div>
      <div className="border-t pt-2 flex flex-col gap-1.5 text-sm" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div style={{ color: data.aboveMA ? '#22c55e' : '#f87171' }}>
          {data.aboveMA ? '✅ 价格在10日线和20日线上方（多头排列）' : '⚠️ 价格低于均线，需谨慎'}
        </div>
        <div style={{ color: '#a8abb3' }}>{macdDesc[data.macdSignal] || data.macdSignal}</div>
        <div style={{ color: data.volRatio > 1.3 ? '#22c55e' : '#a8abb3' }}>
          {data.volRatio > 1.3
            ? `📈 成交量放大，较近期均量高出${((data.volRatio - 1) * 100).toFixed(0)}%`
            : '📊 成交量正常'}
        </div>
        {data.profitPct !== undefined && (
          <div style={{ color: parseFloat(data.profitPct) >= 0 ? '#f87171' : '#4ade80' }}>
            💰 当前浮盈：{parseFloat(data.profitPct) >= 0 ? '+' : ''}{data.profitPct}%
          </div>
        )}
      </div>
    </div>
  )
}
