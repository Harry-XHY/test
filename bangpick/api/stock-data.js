import { fetchStockData } from './_stockData.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { code, market, name } = req.body
  if (!code || market === undefined) return res.status(400).json({ error: '缺少股票代码或市场' })

  const result = await fetchStockData({ code, market, name: name || code })
  res.status(200).json(result)
}
