import { getStore } from '@netlify/blobs'

export default async (req) => {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return new Response('Missing id', { status: 400 })
  }

  try {
    const store = getStore('bangpick-shares')
    const decision = await store.get(id, { type: 'json' })

    if (!decision) {
      return new Response('Not found', { status: 404 })
    }

    return new Response(JSON.stringify(decision), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: '读取失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
