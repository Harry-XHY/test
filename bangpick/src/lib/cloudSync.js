// Local-first cloud sync layer.
//
// Strategy:
//   - Every device has a stable UUID stored in localStorage (`bangpick_device_id`).
//   - Reads are local. Writes are local + a debounced background PUT to /api/sync.
//   - On app boot we hydrate any missing local buckets from the cloud copy
//     (cloud only "fills" empty local — never silently overwrites local data).
//   - Cross-device transfer happens through 6-digit one-shot sync codes.

const DEVICE_ID_KEY = 'bangpick_device_id'
const HYDRATED_FLAG_KEY = 'bangpick_hydrated_v1'
const SYNC_DISABLED_KEY = 'bangpick_sync_disabled'

// Map of bucket name -> localStorage key it corresponds to.
// (kept here so storage.js / stockStorage.js stay thin)
export const BUCKET_LOCAL_KEYS = {
  history: 'bangpick_history',
  holdings: 'bangpick_holdings',
  stockChat: 'bangpick_stock_chat',
  watchlist: 'bangpick_watchlist',
  snapshots: 'bangpick_snapshots',
  alerts: 'bangpick_alerts',
  dietaryProfile: 'bangpick_dietary_profile',
  foodVotes: 'bangpick_food_votes',
}

const BUCKETS = Object.keys(BUCKET_LOCAL_KEYS)

// ---- device id ----------------------------------------------------------

function uuidv4() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  // RFC4122 v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
      id = uuidv4()
      localStorage.setItem(DEVICE_ID_KEY, id)
    }
    return id
  } catch {
    return null
  }
}

export function isSyncEnabled() {
  try { return localStorage.getItem(SYNC_DISABLED_KEY) !== '1' } catch { return false }
}

export function setSyncEnabled(enabled) {
  try {
    if (enabled) localStorage.removeItem(SYNC_DISABLED_KEY)
    else localStorage.setItem(SYNC_DISABLED_KEY, '1')
  } catch { /* ignore */ }
}

// ---- network helpers ----------------------------------------------------

// If /api/sync isn't reachable (e.g. running `vite dev` without Vercel
// Functions, or Upstash not yet provisioned), flip the sync kill-switch so
// we stop spamming the console with 404s for the rest of the session.
let syncDisabledThisSession = false
function disableSyncForSession() {
  syncDisabledThisSession = true
  setSyncEnabled(false)
}

async function fetchBucket(bucket) {
  if (syncDisabledThisSession) return null
  const deviceId = getDeviceId()
  if (!deviceId) return null
  try {
    const r = await fetch(`/api/sync?deviceId=${deviceId}&key=${bucket}`)
    if (r.status === 404) { disableSyncForSession(); return null }
    if (!r.ok) return null
    const json = await r.json()
    return json.value ?? null
  } catch {
    disableSyncForSession()
    return null
  }
}

async function pushBucket(bucket, value) {
  if (syncDisabledThisSession) return false
  const deviceId = getDeviceId()
  if (!deviceId) return false
  try {
    const r = await fetch('/api/sync', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, key: bucket, value }),
    })
    if (r.status === 404) { disableSyncForSession(); return false }
    return r.ok
  } catch {
    disableSyncForSession()
    return false
  }
}

// ---- debounced background push -----------------------------------------

const pendingTimers = new Map()

export function schedulePush(bucket, getValue, delayMs = 800) {
  if (!isSyncEnabled()) return
  if (!BUCKETS.includes(bucket)) return
  const existing = pendingTimers.get(bucket)
  if (existing) clearTimeout(existing)
  const t = setTimeout(() => {
    pendingTimers.delete(bucket)
    Promise.resolve().then(() => pushBucket(bucket, getValue()))
  }, delayMs)
  pendingTimers.set(bucket, t)
}

// ---- one-time hydration on app boot ------------------------------------

// Pulls each bucket from the cloud. If local is empty/missing, the cloud copy
// becomes the local copy. If local already has data, the cloud copy is ignored
// (local wins on first boot — user just sees what they expect).
export async function hydrateOnBoot() {
  if (!isSyncEnabled()) return
  try {
    if (localStorage.getItem(HYDRATED_FLAG_KEY) === '1') return
  } catch { return }

  const tasks = BUCKETS.map(async (bucket) => {
    const localKey = BUCKET_LOCAL_KEYS[bucket]
    let local
    try { local = localStorage.getItem(localKey) } catch { local = null }
    const localEmpty = !local || local === '[]' || local === 'null'
    if (!localEmpty) return
    const cloud = await fetchBucket(bucket)
    if (cloud != null) {
      try { localStorage.setItem(localKey, JSON.stringify(cloud)) } catch { /* ignore */ }
    }
  })

  await Promise.allSettled(tasks)
  try { localStorage.setItem(HYDRATED_FLAG_KEY, '1') } catch { /* ignore */ }
}

// Force a re-hydration on next boot (used after redeem-code merge).
export function clearHydrationFlag() {
  try { localStorage.removeItem(HYDRATED_FLAG_KEY) } catch { /* ignore */ }
}

// ---- notifications (server-written by cron-check-alerts) ---------------

// Pulls the cron-written notifications queue. Returns an array (possibly empty).
export async function pullNotifications() {
  const value = await fetchBucket('notifications')
  return Array.isArray(value) ? value : []
}

// After the user dismisses banners, clear the queue server-side.
export async function clearNotifications() {
  return pushBucket('notifications', [])
}

// ---- sync codes ---------------------------------------------------------

export async function generateSyncCode() {
  const deviceId = getDeviceId()
  if (!deviceId) throw new Error('no_device_id')
  const r = await fetch('/api/sync-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'generate', deviceId }),
  })
  if (!r.ok) {
    const j = await r.json().catch(() => ({}))
    throw new Error(j.error || 'generate_failed')
  }
  return r.json() // { code, expiresInSec }
}

// Redeems a sync code, merges remote data into local storage (union by id /
// dedupe by content depending on bucket), and pushes the merged result back
// to this device's KV space.
export async function redeemSyncCode(code) {
  const targetDeviceId = getDeviceId()
  if (!targetDeviceId) throw new Error('no_device_id')

  const r = await fetch('/api/sync-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'redeem', code, targetDeviceId }),
  })
  if (!r.ok) {
    const j = await r.json().catch(() => ({}))
    throw new Error(j.error || 'redeem_failed')
  }
  const { merged } = await r.json()

  const summary = {}
  for (const bucket of BUCKETS) {
    const localKey = BUCKET_LOCAL_KEYS[bucket]
    let local = []
    try {
      const raw = localStorage.getItem(localKey)
      local = raw ? JSON.parse(raw) : []
    } catch { local = [] }
    const remote = Array.isArray(merged[bucket]) ? merged[bucket] : []
    const combined = mergeBucket(bucket, local, remote)
    try { localStorage.setItem(localKey, JSON.stringify(combined)) } catch { /* ignore */ }
    summary[bucket] = combined.length
    // Push merged result up so the new device "owns" the union.
    pushBucket(bucket, combined)
  }
  return summary
}

// ---- merge strategies (per bucket) -------------------------------------

function mergeBucket(bucket, local, remote) {
  if (!Array.isArray(local)) local = []
  if (!Array.isArray(remote)) remote = []

  switch (bucket) {
    case 'holdings':
    case 'watchlist':
      // Dedupe by stock code, prefer the entry with the latest `addedAt`.
      return dedupeByKey([...local, ...remote], item => item?.code, (a, b) => {
        const at = Date.parse(a?.addedAt || 0) || 0
        const bt = Date.parse(b?.addedAt || 0) || 0
        return at >= bt ? a : b
      })

    case 'history':
      // Dedupe by id (or fallback to question+timestamp), keep newest first, cap 100.
      return dedupeByKey([...local, ...remote],
        item => item?.id || `${item?.question || ''}|${item?.createdAt || ''}`,
        (a, b) => (Date.parse(b?.createdAt || 0) || 0) > (Date.parse(a?.createdAt || 0) || 0) ? b : a
      )
        .sort((a, b) => (Date.parse(b?.createdAt || 0) || 0) - (Date.parse(a?.createdAt || 0) || 0))
        .slice(0, 100)

    case 'stockChat':
      // Chat is a linear log; dedupe by id+role+content.
      return dedupeByKey([...local, ...remote],
        item => `${item?.id || ''}|${item?.role || ''}|${(item?.content || '').slice(0, 64)}`,
        (a) => a
      ).slice(-50)

    case 'snapshots':
      // One snapshot per day per code; dedupe by date+code.
      return dedupeByKey([...local, ...remote], item => `${item?.date}|${item?.code}`, (a) => a)

    case 'alerts':
      return dedupeByKey([...local, ...remote], item => item?.id, (a) => a)

    default:
      return remote.length ? remote : local
  }
}

function dedupeByKey(items, keyFn, pickWinner) {
  const map = new Map()
  for (const item of items) {
    if (item == null) continue
    const k = keyFn(item)
    if (k == null || k === '') continue
    if (!map.has(k)) {
      map.set(k, item)
    } else {
      map.set(k, pickWinner(map.get(k), item))
    }
  }
  return Array.from(map.values())
}
