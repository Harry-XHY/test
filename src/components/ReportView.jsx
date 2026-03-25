export default function ReportView({ filename, modules, verifications, getModuleStats }) {
  const all = Object.values(verifications)
  const total = all.length
  const passCount = all.filter((v) => v.status === 'pass').length
  const failCount = all.filter((v) => v.status === 'fail').length
  const skipCount = all.filter((v) => v.status === 'skip').length
  const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0

  const statusLabel = { pass: '通过', fail: '不通过', skip: '跳过', pending: '未验收' }

  return (
    <div className="print-area p-8 bg-white text-black" style={{ fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', marginBottom: '24px' }}>
        验收测试报告
      </h1>

      {/* 基本信息 */}
      <div style={{ marginBottom: '20px', fontSize: '14px', color: '#555' }}>
        <p>文档：{filename}</p>
        <p>日期：{new Date().toLocaleDateString('zh-CN')}</p>
      </div>

      {/* 汇总统计 */}
      <div style={{ marginBottom: '24px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>汇总</h2>
        <p style={{ fontSize: '14px' }}>
          总检查项：{total} | 通过：{passCount} | 不通过：{failCount} | 跳过：{skipCount}
        </p>
        <p style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '8px' }}>
          整体通过率：{passRate}%
        </p>
      </div>

      {/* 按模块明细 */}
      {modules.map((mod, mi) => {
        const stats = getModuleStats(mod)
        return (
          <div key={mi} style={{ marginBottom: '24px', pageBreakInside: 'avoid' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
              {mod.name}
              <span style={{ fontSize: '13px', fontWeight: 'normal', marginLeft: '8px', color: '#666' }}>
                （通过率：{stats.rate}%）
              </span>
            </h2>
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#3b82f6', color: 'white' }}>
                  <th style={{ border: '1px solid #ddd', padding: '6px 8px', width: '50px' }}>编号</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px 8px' }}>检查项</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px 8px', width: '50px' }}>优先级</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px 8px', width: '60px' }}>结果</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px 8px' }}>备注</th>
                </tr>
              </thead>
              <tbody>
                {mod.items.map((item, ii) => {
                  const v = verifications[item.id]
                  const statusColor = {
                    pass: '#16a34a',
                    fail: '#dc2626',
                    skip: '#9ca3af',
                    pending: '#6b7280',
                  }
                  return (
                    <tr key={ii} style={{ background: ii % 2 === 0 ? '#fff' : '#f9fafb' }}>
                      <td style={{ border: '1px solid #ddd', padding: '6px 8px' }}>{item.id}</td>
                      <td style={{ border: '1px solid #ddd', padding: '6px 8px' }}>{item.description}</td>
                      <td style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'center' }}>
                        {item.priority}
                      </td>
                      <td
                        style={{
                          border: '1px solid #ddd',
                          padding: '6px 8px',
                          textAlign: 'center',
                          color: statusColor[v?.status] || '#6b7280',
                          fontWeight: 'bold',
                        }}
                      >
                        {statusLabel[v?.status] || '未验收'}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '6px 8px', color: '#666' }}>
                        {v?.note || ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}

      <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '12px', color: '#999' }}>
        由 Harry的验收助手 生成
      </div>
    </div>
  )
}
