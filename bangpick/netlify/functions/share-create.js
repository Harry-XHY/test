import { getStore } from '@netlify/blobs'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const decision = await req.json()
    const id = crypto.randomUUID().slice(0, 8)

    const store = getStore('bangpick-shares')
    await store.setJSON(id, decision)

    return new Response(JSON.stringify({ id }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: '存储失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
