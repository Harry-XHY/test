export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { keyword } = req.body
  if (!keyword || !keyword.trim()) return res.status(400).json({ error: '缺少搜索关键词' })

  const token = process.env.EASTMONEY_TOKEN || 'D43BF722C8E33BDC906FB84D85E326E8'
  const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(keyword.trim())}&type=14&token=${token}&count=10`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)

    if (!response.ok) return res.status(200).json([])

    const data = await response.json()
    const items = data?.result?.Result

    if (!Array.isArray(items) || items.length === 0) return res.status(200).json([])

    const results = items
      .filter(item => /^\d{6}$/.test(String(item.Code)))
      .slice(0, 10)
      .map(item => ({
        code:   String(item.Code),
        name:   String(item.Name),
        market: Number(item.MktNum), // 0=SZ, 1=SH
      }))

    return res.status(200).json(results)
  } catch {
    clearTimeout(timer)
    return res.status(200).json([])
  }
}
