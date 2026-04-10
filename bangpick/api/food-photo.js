// Food photo proxy — proxies Google Places Photos to avoid exposing API key.
// Only works with Google Places; OSM has no photo API.

const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY || ''

export default async function handler(req, res) {
  try {
    const { ref, maxwidth } = req.body || {}
    if (!ref) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'ref (photo_reference) required' }))
    }
    if (!GOOGLE_KEY) {
      res.writeHead(501, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Google Places key not configured' }))
    }

    const params = new URLSearchParams({
      photoreference: ref,
      maxwidth: String(maxwidth || 400),
      key: GOOGLE_KEY,
    })
    const url = `https://maps.googleapis.com/maps/api/place/photo?${params}`
    const r = await fetch(url, { redirect: 'follow' })

    if (!r.ok) {
      res.writeHead(r.status, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: `Photo fetch failed: ${r.status}` }))
    }

    const contentType = r.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await r.arrayBuffer())

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    })
    res.end(buffer)
  } catch (err) {
    console.error('[food-photo]', err.message)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err.message }))
  }
}
