import { fetchSectorOverview } from './_stockData.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  try {
    const sectors = await fetchSectorOverview()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(sectors))
  } catch {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify([]))
  }
}
