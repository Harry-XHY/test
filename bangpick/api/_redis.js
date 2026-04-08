import { Redis } from '@upstash/redis'

// Accept both naming schemes:
// - UPSTASH_REDIS_REST_* (default Upstash naming, Redis.fromEnv default)
// - KV_REST_API_* (Vercel Marketplace integration naming)
export function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}
