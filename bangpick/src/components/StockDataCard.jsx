export default function StockDataCard({ data, compact }) {
  if (!data || data.suspended || data.error) return null

  const changeColor = data.change >= 0 ? '#f87171' : '#4ade80'
  const changePrefix = data.change >= 0 ? '+' : ''

  const macdDesc = {
    'golden_cross': '🟢 MACD金叉（短期上涨动能增强）',
    'above_zero': '🔵 MACD零轴上方运行（持续多头）',
    'dead_cross': '🔴 MACD死叉（短期下跌信号）',
    'below_zero': '🟡 MACD在零轴下方（动能偏弱）',
  }

  const formatMarketCap = (cap) => {
    if (!cap) return null
    if (cap >= 1e12) return `${(cap / 1e12).toFixed(1)}万亿`
    if (cap >= 1e8) return `${(cap / 1e8).toFixed(0)}亿`
    return `${(cap / 1e4).toFixed(0)}万`
  }

  return (
    <div className={`glass-card rounded-2xl flex flex-col gap-2 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center justify-between">
        <span className={`font-semibold ${compact ? 'text-sm' : ''}`} style={{ color: '#f1f3fc' }}>{data.name}</span>
        <div className="flex items-center gap-2">
          {data.marketCap && (
            <span className="text-xs" style={{ color: '#72757d' }}>
              {formatMarketCap(data.marketCap)}
            </span>
          )}
          <span className="text-xs" style={{ color: '#72757d' }}>{data.code}</span>
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`font-bold ${compact ? 'text-lg' : 'text-2xl'}`} style={{ color: '#f1f3fc' }}>¥{data.close}</span>
        <span className="text-sm font-medium" style={{ color: changeColor }}>{changePrefix}{data.change}%</span>
      </div>
      <div className="text-xs" style={{ color: '#72757d' }}>数据截至 {data.latestDate}</div>
      <div className={`border-t flex flex-col gap-1.5 ${compact ? 'pt-1.5 text-xs' : 'pt-2 text-sm'}`} style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
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
