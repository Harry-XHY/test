import { fetchMarketIndices } from './_stockData.js'

export default async function handler(req, res) {
  try {
    const indices = await fetchMarketIndices()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(indices.filter(Boolean)))
  } catch (err) {
    console.error('[stock-indices]', err.message)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err.message }))
  }
}
