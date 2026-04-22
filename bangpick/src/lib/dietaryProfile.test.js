import test from 'node:test'
import assert from 'node:assert/strict'

import { evaluateRestaurantDietaryFit, getDefaultProfile } from './dietaryProfile.js'

function makeProfile(overrides = {}) {
  return { ...getDefaultProfile(), ...overrides }
}

test('returns neutral maybe fit when profile is inactive', () => {
  const fit = evaluateRestaurantDietaryFit(makeProfile(), {
    name: 'Any Place',
    cuisine: 'ramen',
    types: ['restaurant'],
    priceLevel: 2,
  })

  assert.equal(fit.status, 'maybe')
  assert.equal(fit.scoreDelta, 0)
  assert.deepEqual(fit.reasons, [])
  assert.deepEqual(fit.matchedTags, [])
})

test('marks explicit vegetarian and cheap restaurant as match', () => {
  const fit = evaluateRestaurantDietaryFit(makeProfile({
    vegetarian: true,
    budgetPreference: 'cheap',
  }), {
    name: 'Green Garden',
    cuisine: 'vegetarian;salad',
    types: ['vegetarian_restaurant'],
    priceLevel: 1,
    vicinity: 'Market Street',
  })

  assert.equal(fit.status, 'match')
  assert.ok(fit.scoreDelta > 0)
  assert.ok(fit.reasons.includes('vegetarian_match'))
  assert.ok(fit.reasons.includes('budget_cheap_match'))
  assert.ok(fit.matchedTags.includes('vegetarian'))
  assert.ok(fit.matchedTags.includes('budget_cheap'))
})

test('excludes meat-heavy restaurant for vegan profile', () => {
  const fit = evaluateRestaurantDietaryFit(makeProfile({
    vegan: true,
  }), {
    name: 'Smoke House BBQ',
    cuisine: 'bbq;steak',
    types: ['barbecue_restaurant', 'steak_house'],
    priceLevel: 3,
  })

  assert.equal(fit.status, 'exclude')
  assert.ok(fit.scoreDelta < 0)
  assert.ok(fit.reasons.includes('vegan_conflict'))
})

test('keeps uncertain halal restaurant as maybe instead of excluding', () => {
  const fit = evaluateRestaurantDietaryFit(makeProfile({
    halal: true,
  }), {
    name: 'Neighborhood Kitchen',
    cuisine: 'regional',
    types: ['restaurant'],
    priceLevel: 2,
  })

  assert.equal(fit.status, 'maybe')
  assert.equal(fit.scoreDelta, 0)
  assert.equal(fit.reasons.length, 0)
})

test('downgrades weak budget conflict without hard exclusion', () => {
  const fit = evaluateRestaurantDietaryFit(makeProfile({
    budgetPreference: 'cheap',
  }), {
    name: 'Luxury Dining Room',
    cuisine: 'fine_dining',
    types: ['restaurant'],
    priceLevel: 4,
  })

  assert.equal(fit.status, 'maybe')
  assert.ok(fit.scoreDelta < 0)
  assert.ok(fit.reasons.includes('budget_cheap_conflict'))
})
