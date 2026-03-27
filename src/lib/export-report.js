const statusLabel = { pass: '通过', fail: '不通过', skip: '跳过', pending: '未验收' }
const statusColor = { pass: '#16a34a', fail: '#dc2626', skip: '#9ca3af', pending: '#6b7280' }
const priorityColor = { P0: '#dc2626', P1: '#ca8a04', P2: '#6b7280' }

function getModuleStats(mod, verifications) {
  const items = mod.items
  const total = items.length
  const pass = items.filter((i) => verifications[i.id]?.status === 'pass').length
  const fail = items.filter((i) => verifications[i.id]?.status === 'fail').length
  return { total, pass, fail, rate: total > 0 ? Math.round((pass / total) * 100) : 0 }
}

export function exportReport(filename, modules, verifications) {
  const all = Object.values(verifications)
  const total = all.length
  const passCount = all.filter((v) => v.status === 'pass').length
  const failCount = all.filter((v) => v.status === 'fail').length
  const skipCount = all.filter((v) => v.status === 'skip').length
  const pendingCount = all.filter((v) => v.status === 'pending').length
  const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0
  const date = new Date().toLocaleString('zh-CN')

  const modulesHtml = modules.map((mod) => {
    const stats = getModuleStats(mod, verifications)
    const barColor = stats.fail > 0 ? '#dc2626' : stats.rate > 0 ? '#16a34a' : '#d1d5db'

    const rowsHtml = mod.items.map((item, i) => {
      const v = verifications[item.id]
      const s = v?.status || 'pending'
      return `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px">${item.id}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb">${item.description}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center">
          <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${priorityColor[item.priority] || '#6b7280'};margin-right:4px"></span>
          ${item.priority}
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;color:${statusColor[s]};font-weight:600">${statusLabel[s]}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px">${v?.note || '-'}</td>
      </tr>`
    }).join('')

    return `
      <div style="margin-bottom:28px;page-break-inside:avoid">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:4px;height:20px;border-radius:2px;background:${barColor}"></div>
            <h3 style="margin:0;font-size:15px;font-weight:600">${mod.name}</h3>
            <span style="color:#9ca3af;font-size:12px">${mod.items.length} 项</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:60px;height:4px;border-radius:2px;background:#e5e7eb;overflow:hidden">
              <div style="width:${stats.rate}%;height:100%;background:${barColor};border-radius:2px"></div>
            </div>
            <span style="font-size:13px;font-weight:600;color:${barColor}">${stats.rate}%</span>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#f1f5f9">
              <th style="padding:8px 10px;text-align:left;font-weight:600;color:#475569;font-size:12px;border-bottom:2px solid #e5e7eb;width:50px">编号</th>
              <th style="padding:8px 10px;text-align:left;font-weight:600;color:#475569;font-size:12px;border-bottom:2px solid #e5e7eb">检查项</th>
              <th style="padding:8px 10px;text-align:center;font-weight:600;color:#475569;font-size:12px;border-bottom:2px solid #e5e7eb;width:60px">优先级</th>
              <th style="padding:8px 10px;text-align:center;font-weight:600;color:#475569;font-size:12px;border-bottom:2px solid #e5e7eb;width:70px">结果</th>
              <th style="padding:8px 10px;text-align:left;font-weight:600;color:#475569;font-size:12px;border-bottom:2px solid #e5e7eb">备注</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>验收报告 - ${filename}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif; color:#1e293b; background:#fff; line-height:1.6; }
    @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
  </style>
</head>
<body style="max-width:900px;margin:0 auto;padding:40px 32px">

  <!-- 标题 -->
  <div style="text-align:center;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #e5e7eb">
    <h1 style="font-size:24px;font-weight:700;margin-bottom:4px">验收测试报告</h1>
    <p style="color:#6b7280;font-size:13px">${filename} · ${date}</p>
  </div>

  <!-- 汇总统计 -->
  <div style="display:flex;gap:12px;margin-bottom:32px">
    <div style="flex:1;padding:16px;border-radius:10px;background:#f0fdf4;border:1px solid #bbf7d0">
      <div style="font-size:28px;font-weight:700;color:#16a34a">${passCount}</div>
      <div style="font-size:12px;color:#15803d">通过</div>
    </div>
    <div style="flex:1;padding:16px;border-radius:10px;background:#fef2f2;border:1px solid #fecaca">
      <div style="font-size:28px;font-weight:700;color:#dc2626">${failCount}</div>
      <div style="font-size:12px;color:#b91c1c">不通过</div>
    </div>
    <div style="flex:1;padding:16px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0">
      <div style="font-size:28px;font-weight:700;color:#64748b">${skipCount}</div>
      <div style="font-size:12px;color:#475569">跳过</div>
    </div>
    <div style="flex:1;padding:16px;border-radius:10px;background:#f5f3ff;border:1px solid #ddd6fe">
      <div style="font-size:28px;font-weight:700;color:#7c3aed">${pendingCount}</div>
      <div style="font-size:12px;color:#6d28d9">待验收</div>
    </div>
    <div style="flex:1;padding:16px;border-radius:10px;background:#eff6ff;border:1px solid #bfdbfe">
      <div style="font-size:28px;font-weight:700;color:#2563eb">${passRate}%</div>
      <div style="font-size:12px;color:#1d4ed8">通过率</div>
    </div>
  </div>

  <!-- 进度条 -->
  <div style="margin-bottom:32px">
    <div style="display:flex;justify-content:space-between;margin-bottom:6px">
      <span style="font-size:12px;color:#6b7280">验收进度</span>
      <span style="font-size:12px;color:#6b7280">${total - pendingCount} / ${total}</span>
    </div>
    <div style="height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden">
      <div style="height:100%;width:${total > 0 ? ((total - pendingCount) / total) * 100 : 0}%;background:linear-gradient(90deg,#3b82f6,#8b5cf6);border-radius:3px"></div>
    </div>
  </div>

  <!-- 模块明细 -->
  ${modulesHtml}

  <!-- 页脚 -->
  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af">
    由 Harry的验收助手 生成 · ${date}
  </div>

</body>
</html>`

  // 下载 HTML 文件
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `验收报告_${filename.replace(/\.[^.]+$/, '')}_${new Date().toISOString().split('T')[0]}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── 通用：构建表格数据行 ──────────────────────

function buildRows(modules, verifications) {
  const rows = []
  for (const mod of modules) {
    for (const item of mod.items) {
      const v = verifications[item.id]
      const s = v?.status || 'pending'
      rows.push({
        模块: mod.name,
        编号: item.id,
        检查项: item.description,
        优先级: item.priority || '',
        分类: item.category || '',
        预期结果: item.expected_result || '',
        验收结果: statusLabel[s],
        备注: v?.note || '',
      })
    }
  }
  return rows
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Excel 导出 (.xlsx) ────────────────────────

export function exportExcel(filename, modules, verifications) {
  import('xlsx').then((XLSX) => {
    const rows = buildRows(modules, verifications)
    const ws = XLSX.utils.json_to_sheet(rows)

    // 设置列宽
    ws['!cols'] = [
      { wch: 20 }, // 模块
      { wch: 8 },  // 编号
      { wch: 40 }, // 检查项
      { wch: 8 },  // 优先级
      { wch: 12 }, // 分类
      { wch: 30 }, // 预期结果
      { wch: 10 }, // 验收结果
      { wch: 20 }, // 备注
    ]

    // 添加汇总 sheet
    const all = Object.values(verifications)
    const summaryData = [
      { 指标: '总检查项', 数量: all.length },
      { 指标: '通过', 数量: all.filter((v) => v.status === 'pass').length },
      { 指标: '不通过', 数量: all.filter((v) => v.status === 'fail').length },
      { 指标: '跳过', 数量: all.filter((v) => v.status === 'skip').length },
      { 指标: '未验收', 数量: all.filter((v) => v.status === 'pending').length },
      { 指标: '通过率', 数量: all.length > 0
        ? Math.round((all.filter((v) => v.status === 'pass').length / all.length) * 100) + '%'
        : '0%' },
    ]
    const wsSummary = XLSX.utils.json_to_sheet(summaryData)
    wsSummary['!cols'] = [{ wch: 12 }, { wch: 10 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '验收清单')
    XLSX.utils.book_append_sheet(wb, wsSummary, '汇总统计')

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const date = new Date().toISOString().split('T')[0]
    downloadBlob(blob, `验收报告_${filename.replace(/\.[^.]+$/, '')}_${date}.xlsx`)
  })
}

// ── CSV 导出 ──────────────────────────────────

export function exportCSV(filename, modules, verifications) {
  const rows = buildRows(modules, verifications)
  if (rows.length === 0) return

  const headers = Object.keys(rows[0])
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = String(row[h] || '').replace(/"/g, '""')
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val}"`
          : val
      }).join(',')
    ),
  ].join('\n')

  // BOM + UTF-8 确保中文兼容
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' })
  const date = new Date().toISOString().split('T')[0]
  downloadBlob(blob, `验收报告_${filename.replace(/\.[^.]+$/, '')}_${date}.csv`)
}
