// Food vote (group dining) CRUD + local tracking
import { schedulePush } from './cloudSync'

const VOTES_KEY = 'bangpick_food_votes'
const CAST_KEY = 'bangpick_food_votes_cast'

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function getDeviceId() {
  try {
    let id = localStorage.getItem('bangpick_device_id')
    if (!id) {
      id = uuid()
      localStorage.setItem('bangpick_device_id', id)
    }
    return id
  } catch {
    return 'anonymous'
  }
}

export function createFoodVote({ restaurants, deadlineMinutes, question }) {
  const id = uuid()
  const now = Date.now()
  const session = {
    id,
    createdAt: now,
    deadline: now + (deadlineMinutes || 120) * 60 * 1000,
    question: question || '一起吃啥？',
    restaurants: restaurants.map(r => ({
      placeId: r.placeId,
      name: r.name,
      photo: r.photos?.[0] || null,
      cuisine: r.cuisine || (r.types?.slice(0, 2).join(',')),
      distance: r.distance,
      location: r.location,
    })),
    status: 'active',
    hostDeviceId: getDeviceId(),
  }

  const all = getFoodVotes()
  all.unshift(session)
  try {
    localStorage.setItem(VOTES_KEY, JSON.stringify(all.slice(0, 50)))
  } catch { /* ignore */ }
  schedulePush('foodVotes', () => getFoodVotes())
  return session
}

export function getFoodVotes() {
  try {
    const raw = localStorage.getItem(VOTES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getFoodVoteById(id) {
  return getFoodVotes().find(v => v.id === id) || null
}

export function revealWinner(id) {
  const all = getFoodVotes()
  const idx = all.findIndex(v => v.id === id)
  if (idx === -1) return null

  // Winner determination is done client-side after fetching tallies
  const session = { ...all[idx], status: 'revealed' }
  all[idx] = session
  try {
    localStorage.setItem(VOTES_KEY, JSON.stringify(all))
  } catch { /* ignore */ }
  schedulePush('foodVotes', () => getFoodVotes())
  return session
}

export function setWinner(id, placeId) {
  const all = getFoodVotes()
  const idx = all.findIndex(v => v.id === id)
  if (idx === -1) return null
  const winner = all[idx].restaurants.find(r => r.placeId === placeId)
  const session = { ...all[idx], status: 'revealed', winner }
  all[idx] = session
  try {
    localStorage.setItem(VOTES_KEY, JSON.stringify(all))
  } catch { /* ignore */ }
  schedulePush('foodVotes', () => getFoodVotes())
  return session
}

export function hasVoted(voteId) {
  try {
    const raw = localStorage.getItem(CAST_KEY)
    const list = raw ? JSON.parse(raw) : []
    return list.includes(voteId)
  } catch {
    return false
  }
}

export function markVoted(voteId) {
  try {
    const raw = localStorage.getItem(CAST_KEY)
    const list = raw ? JSON.parse(raw) : []
    if (!list.includes(voteId)) {
      list.push(voteId)
      localStorage.setItem(CAST_KEY, JSON.stringify(list))
    }
  } catch { /* ignore */ }
}

export async function castVote({ voteId, placeId, nickname, message }) {
  const r = await fetch('/api/food', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'vote', voteAction: 'cast', voteId, placeId, nickname, message }),
  })
  if (!r.ok) throw new Error('vote_failed')
  return r.json()
}

export async function getVoteTallies(voteId) {
  const r = await fetch('/api/food', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'vote', voteAction: 'get', voteId }),
  })
  if (!r.ok) throw new Error('tally_failed')
  return r.json()
}
